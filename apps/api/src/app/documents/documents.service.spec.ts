import { Repository } from 'typeorm';
import { Document } from '../../database/entities/document.entity';
import { DocumentChunk } from '../../database/entities/document-chunk.entity';
import { DocumentStorage } from '../../storage/document-storage';
import { DocumentsService } from './documents.service';
describe('DocumentsService storage lifecycle', () => {
  const file = { originalname: 'policy.txt', mimetype: 'text/plain', size: Buffer.byteLength('Refunds are available.'), buffer: Buffer.from('Refunds are available.') };
  const actor = { id: '1e3aa3b0-c7bf-436a-903a-e361eb3219bb' } as never;
  function createService(storage: Partial<DocumentStorage>, save: jest.Mock = jest.fn(), document: Partial<Document> | null = null) {
    const documents = { findOneBy: jest.fn().mockResolvedValue(document), create: jest.fn((value) => value), save } as unknown as Repository<Document>;
    const chunks = {} as Repository<DocumentChunk>;
    return { service: new DocumentsService(documents, chunks, storage as DocumentStorage), documents };
  }
  beforeEach(() => { delete process.env.DOCUMENT_MAX_BYTES; });
  it('does not create a database row when storage rejects the upload', async () => {
    const storage = { put: jest.fn().mockRejectedValue(new Error('storage unavailable')) }; const { service, documents } = createService(storage);
    await expect(service.create(file, actor)).rejects.toThrow('storage unavailable'); expect(documents.save).not.toHaveBeenCalled();
  });
  it('removes the stored bytes when the database rejects document creation', async () => {
    const storage = { put: jest.fn().mockResolvedValue('opaque.txt'), delete: jest.fn().mockResolvedValue(undefined) }; const save = jest.fn().mockRejectedValue({ driverError: { code: '23505' } }); const { service } = createService(storage, save);
    await expect(service.create(file, actor)).rejects.toMatchObject({ status: 409 }); expect(storage.delete).toHaveBeenCalledWith('opaque.txt');
  });
  it('opens a stored source by document id without exposing its storage key', async () => {
    const body = Buffer.from('Refunds are available.'); const document = { id: 'doc-1', displayName: 'refund-policy.txt', mimeType: 'text/plain', storageKey: 'opaque-key.txt', deletedAt: null } as unknown as Document;
    async function* open() { yield body; }
    const storage = { open: jest.fn().mockReturnValue(open()) }; const { service, documents } = createService(storage, jest.fn(), document);
    const result = await service.openContent(document.id);
    expect(documents.findOneBy).toHaveBeenCalledWith(expect.objectContaining({ id: document.id })); expect(storage.open).toHaveBeenCalledWith('opaque-key.txt'); expect(result).toEqual({ displayName: 'refund-policy.txt', mimeType: 'text/plain', content: body });
  });
  it('does not reveal deleted or unknown source records', async () => {
    const { service } = createService({ open: jest.fn() }); await expect(service.openContent('missing')).rejects.toMatchObject({ status: 404 });
  });
});
