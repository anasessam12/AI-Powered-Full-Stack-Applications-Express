import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, PayloadTooLargeException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { basename, extname, win32 } from 'node:path';
import { PDFParse } from 'pdf-parse';
import { IsNull, Repository } from 'typeorm';
import { AuthenticatedSession } from '../auth/auth.types';
import { chunkDocumentText } from '../retrieval/chunking/document-chunker';
import { Document, DocumentStatus } from '../../database/entities/document.entity';
import { DocumentChunk } from '../../database/entities/document-chunk.entity';
import { DOCUMENT_STORAGE, DocumentStorage } from '../../storage/document-storage';

const ABSOLUTE_UPLOAD_LIMIT = 20 * 1024 * 1024;

export interface UploadedDocument {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class DocumentsService {
  private readonly maxBytes: number;

  constructor(
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    @InjectRepository(DocumentChunk) private readonly chunks: Repository<DocumentChunk>,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStorage,
  ) {
    const configured = Number(process.env.DOCUMENT_MAX_BYTES ?? ABSOLUTE_UPLOAD_LIMIT);
    if (!Number.isInteger(configured) || configured < 1 || configured > ABSOLUTE_UPLOAD_LIMIT) {
      throw new Error(`DOCUMENT_MAX_BYTES must be between 1 and ${ABSOLUTE_UPLOAD_LIMIT}.`);
    }
    this.maxBytes = configured;
  }

  async create(file: UploadedDocument, actor: AuthenticatedSession['user']): Promise<Record<string, unknown>> {
    const extension = this.validateUpload(file);
    const checksumSha256 = createHash('sha256').update(file.buffer).digest('hex');
    if (await this.documents.findOneBy({ checksumSha256 })) throw new ConflictException('A document with this content already exists.');

    const storageKey = await this.storage.put(file.buffer, extension);
    let document: Document;
    try {
      document = await this.documents.save(this.documents.create({
        ownerUserId: actor.id,
        displayName: file.originalname.trim(),
        storageKey,
        mimeType: extension === '.pdf' ? 'application/pdf' : extension === '.md' ? 'text/markdown' : 'text/plain',
        byteSize: String(file.size),
        checksumSha256,
        status: DocumentStatus.PROCESSING,
        errorCode: null,
        deletedAt: null,
      }));
    } catch (error) {
      await this.storage.delete(storageKey);
      if ((error as { driverError?: { code?: string } }).driverError?.code === '23505') {
        throw new ConflictException('A document with this content already exists.');
      }
      throw error;
    }

    try {
      await this.index(document, file.buffer, extension);
      return this.toSafeDocument(document);
    } catch (error) {
      document.status = DocumentStatus.FAILED;
      document.errorCode = error instanceof Error && error.message === 'EMPTY_DOCUMENT' ? 'EMPTY_DOCUMENT' : 'EXTRACTION_FAILED';
      await this.documents.save(document);
      if (document.errorCode === 'EMPTY_DOCUMENT') throw new UnprocessableEntityException('The document contains no extractable text.');
      throw new UnprocessableEntityException('The document could not be processed.');
    }
  }

  async list(): Promise<Record<string, unknown>[]> {
    const documents = await this.documents.find({ where: { deletedAt: IsNull() }, order: { createdAt: 'DESC' } });
    return documents.map((document) => this.toSafeDocument(document));
  }

  async retry(id: string): Promise<Record<string, unknown>> {
    const document = await this.documents.findOneBy({ id, deletedAt: IsNull() });
    if (!document) throw new NotFoundException('Document not found.');
    if (document.status === DocumentStatus.INDEXED) return this.toSafeDocument(document);
    if (document.status === DocumentStatus.PROCESSING) throw new ConflictException('Document processing is already in progress.');
    const content = await this.readStorage(document.storageKey);
    await this.chunks.delete({ documentId: id });
    document.status = DocumentStatus.PROCESSING;
    document.errorCode = null;
    await this.documents.save(document);
    try {
      await this.index(document, content, extname(document.storageKey));
    } catch {
      document.status = DocumentStatus.FAILED;
      document.errorCode = 'EXTRACTION_FAILED';
      await this.documents.save(document);
    }
    return this.toSafeDocument(document);
  }

  async remove(id: string): Promise<void> {
    const document = await this.documents.findOneBy({ id, deletedAt: IsNull() });
    if (!document) throw new NotFoundException('Document not found.');
    await this.documents.delete(id);
    await this.storage.delete(document.storageKey);
  }

  private async index(document: Document, content: Buffer, extension: string): Promise<void> {
    const text = await this.extract(content, extension);
    const chunks = chunkDocumentText(text, extension === '.pdf');
    if (chunks.length === 0) throw new Error('EMPTY_DOCUMENT');
    await this.chunks.save(chunks.map((chunk) => this.chunks.create({ documentId: document.id, ...chunk })));
    document.status = DocumentStatus.INDEXED;
    document.errorCode = null;
    await this.documents.save(document);
  }

  private validateUpload(file: UploadedDocument): string {
    if (!file?.buffer || file.buffer.length === 0) throw new BadRequestException('A non-empty document file is required.');
    if (file.buffer.length > this.maxBytes) throw new PayloadTooLargeException(`Maximum document size is ${this.maxBytes} bytes.`);
    const name = file.originalname;
    if (!name || name.length > 255 || basename(name) !== name || win32.basename(name) !== name || /[\0/\\]/.test(name) || name === '.' || name === '..') {
      throw new BadRequestException('The document filename is invalid.');
    }
    const extension = extname(name).toLowerCase();
    const acceptedMime = extension === '.pdf' ? file.mimetype === 'application/pdf'
      : extension === '.txt' ? file.mimetype === 'text/plain'
      : extension === '.md' ? ['text/markdown', 'text/plain'].includes(file.mimetype)
      : false;
    if (!acceptedMime) throw new BadRequestException('Only PDF, TXT, and Markdown files are accepted.');
    if (extension === '.pdf') {
      if (file.buffer.subarray(0, 1024).indexOf(Buffer.from('%PDF-')) < 0) throw new BadRequestException('The file content does not match its PDF type.');
    } else {
      if (file.buffer.includes(0)) throw new BadRequestException('Text documents must be valid UTF-8 text.');
      try { new TextDecoder('utf-8', { fatal: true }).decode(file.buffer); }
      catch { throw new BadRequestException('Text documents must be valid UTF-8 text.'); }
    }
    return extension;
  }

  private async extract(buffer: Buffer, extension: string): Promise<string> {
    if (extension === '.pdf') {
      const parser = new PDFParse({ data: new Uint8Array(buffer), isEvalSupported: false });
      try {
        const result = await parser.getText({ lineEnforce: true });
        return result.pages.map((page) => page.text).join('\f');
      } finally {
        await parser.destroy();
      }
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  }

  private async readStorage(key: string): Promise<Buffer> {
    const stream = this.storage.open(key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }

  private toSafeDocument(document: Document): Record<string, unknown> {
    return {
      id: document.id,
      displayName: document.displayName,
      mimeType: document.mimeType,
      byteSize: Number(document.byteSize),
      status: document.status,
      errorCode: document.errorCode,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
