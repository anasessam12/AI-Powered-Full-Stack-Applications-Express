import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as argon2 from 'argon2';
import { DataSource } from 'typeorm';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { PRODUCT_ENTITIES, User, UserRole } from '../../src/database/entities';
import { InitialProductSchema1700000000000 } from '../../src/database/migrations/1700000000000-InitialProductSchema';
import { UniqueDocumentChecksum1700000001000 } from '../../src/database/migrations/1700000001000-UniqueDocumentChecksum';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const integrationSuite = testDatabaseUrl ? describe : describe.skip;

integrationSuite('document ingestion API', () => {
  let app: INestApplication;
  let baseUrl: string;
  let dataSource: DataSource;
  let admin: User;
  let agent: User;

  beforeAll(async () => {
    if (!testDatabaseUrl) return;
    const databaseName = decodeURIComponent(new URL(testDatabaseUrl).pathname.slice(1));
    if (!databaseName.endsWith('_test')) throw new Error('TEST_DATABASE_URL must end in _test.');
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.NODE_ENV = 'test';
    process.env.WEB_ORIGIN = 'http://localhost:4200';
    process.env.DOCUMENT_STORAGE_ROOT = `${process.cwd()}/var/document-tests`;
    process.env.DOCUMENT_MAX_BYTES = '1048576';

    dataSource = new DataSource({
      type: 'postgres', url: testDatabaseUrl, entities: PRODUCT_ENTITIES,
      migrations: [InitialProductSchema1700000000000, UniqueDocumentChecksum1700000001000], migrationsTableName: 'typeorm_migrations',
      synchronize: false, installExtensions: false,
    });
    await dataSource.initialize();
    await dataSource.runMigrations();
    await dataSource.query(
      'TRUNCATE TABLE citations, messages, conversations, document_chunks, documents, sessions, users CASCADE',
    );
    const users = dataSource.getRepository(User);
    admin = await users.save(users.create({
      username: 'documents.admin', normalizedUsername: 'documents.admin',
      passwordHash: await argon2.hash('Document-admin-password-479!'), role: UserRole.ADMIN, isActive: true,
    }));
    agent = await users.save(users.create({
      username: 'documents.agent', normalizedUsername: 'documents.agent',
      passwordHash: await argon2.hash('Document-agent-password-479!'), role: UserRole.AGENT, isActive: true,
    }));

    const { AppModule } = await import('../../src/app/app.module');
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  }, 30_000);

  afterAll(async () => {
    if (app) await app.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  async function login(username: string, password: string) {
    const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }),
    });
    return {
      cookie: (response.headers.get('set-cookie') ?? '').split(';', 1)[0],
      csrf: ((await response.json()) as { csrfToken: string }).csrfToken,
    };
  }

  async function upload(session: { cookie: string; csrf: string }, fileName: string, content: string, mimeType: string) {
    const form = new FormData();
    form.append('file', new Blob([content], { type: mimeType }), fileName);
    return fetch(`${baseUrl}/api/v1/documents`, {
      method: 'POST', headers: { cookie: session.cookie, 'x-csrf-token': session.csrf }, body: form,
    });
  }

  function onePagePdf(text: string): Buffer {
    const escapePdf = (value: string) => value.replace(/([\\()])/g, '\\$1');
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];
    const stream = `BT /F1 12 Tf 72 720 Td (${escapePdf(text)}) Tj ET`;
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    let output = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(Buffer.byteLength(output));
      output += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = Buffer.byteLength(output);
    output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets.slice(1)) output += `${String(offset).padStart(10, '0')} 00000 n \n`;
    output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(output, 'ascii');
  }

  it('indexes a Markdown upload and never exposes its storage key', async () => {
    const session = await login(admin.username, 'Document-admin-password-479!');
    const response = await upload(session, 'refund-policy.md', '# Refund policy\nCustomers may request a refund within thirty days.', 'text/markdown');
    expect(response.status).toBe(201);
    const document = await response.json();
    expect(document).toMatchObject({ displayName: 'refund-policy.md', status: 'INDEXED', mimeType: 'text/markdown' });
    expect(document).not.toHaveProperty('storageKey');
    const chunks = await dataSource.query('SELECT content, ordinal FROM document_chunks WHERE document_id = $1', [document.id]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain('Customers may request a refund');
    expect(chunks[0].ordinal).toBe(0);
  });

  it('indexes plain text and extracts PDF text with source page metadata', async () => {
    const session = await login(admin.username, 'Document-admin-password-479!');
    const textResponse = await upload(session, 'support-notes.txt', 'Agents can reset a customer password after identity verification.', 'text/plain');
    expect(textResponse.status).toBe(201);
    const textDocument = await textResponse.json();
    expect(textDocument.status).toBe('INDEXED');

    const pdfBytes = onePagePdf('Returns are accepted within thirty days.');
    const form = new FormData();
    const pdfArrayBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
    form.append('file', new Blob([pdfArrayBuffer], { type: 'application/pdf' }), 'return-policy.pdf');
    const pdfResponse = await fetch(`${baseUrl}/api/v1/documents`, {
      method: 'POST', headers: { cookie: session.cookie, 'x-csrf-token': session.csrf }, body: form,
    });
    const pdfPayload = await pdfResponse.json();
    expect(pdfResponse.status).toBe(201);
    const pdfDocument = pdfPayload;
    const [chunk] = await dataSource.query('SELECT content, page_number FROM document_chunks WHERE document_id = $1', [pdfDocument.id]);
    expect(chunk.content).toContain('Returns are accepted within thirty days');
    expect(chunk.page_number).toBe(1);
  });

  it('rejects non-admin upload and does not persist the file', async () => {
    const session = await login(agent.username, 'Document-agent-password-479!');
    const before = await dataSource.getRepository('documents').count();
    expect((await upload(session, 'guide.txt', 'Safe guide text.', 'text/plain')).status).toBe(403);
    expect(await dataSource.getRepository('documents').count()).toBe(before);
  });

  it('rejects spoofed file type, traversal names, and files above the configured cap', async () => {
    const session = await login(admin.username, 'Document-admin-password-479!');
    expect((await upload(session, 'fake.pdf', 'ordinary text', 'application/pdf')).status).toBe(400);
    expect((await upload(session, '../escape.txt', 'safe text', 'text/plain')).status).toBe(400);
    expect((await upload(session, 'large.txt', 'x'.repeat(1048577), 'text/plain')).status).toBe(413);
  });

  it('rejects duplicate content and removes the document and chunks on delete', async () => {
    const session = await login(admin.username, 'Document-admin-password-479!');
    const content = '# Cancellation\nCustomers can cancel anytime by contacting support.';
    const uploaded = await upload(session, 'cancel.md', content, 'text/markdown');
    const document = await uploaded.json();
    const [storedDocument] = await dataSource.query('SELECT storage_key FROM documents WHERE id = $1', [document.id]);
    const storageRoot = process.env.DOCUMENT_STORAGE_ROOT;
    if (!storageRoot) throw new Error('DOCUMENT_STORAGE_ROOT must be configured for document tests.');
    const storedPath = join(storageRoot, storedDocument.storage_key);
    await access(storedPath);
    expect((await upload(session, 'duplicate.md', content, 'text/markdown')).status).toBe(409);
    const deleted = await fetch(`${baseUrl}/api/v1/documents/${document.id}`, {
      method: 'DELETE', headers: { cookie: session.cookie, 'x-csrf-token': session.csrf },
    });
    expect(deleted.status).toBe(204);
    expect(await dataSource.query('SELECT id FROM documents WHERE id = $1', [document.id])).toHaveLength(0);
    expect(await dataSource.query('SELECT id FROM document_chunks WHERE document_id = $1', [document.id])).toHaveLength(0);
    await expect(access(storedPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('records malformed PDFs as failed without indexing and lets an Admin retry an interrupted index', async () => {
    const session = await login(admin.username, 'Document-admin-password-479!');
    const malformed = await upload(session, 'malformed.pdf', '%PDF-not-a-real-document', 'application/pdf');
    expect(malformed.status).toBe(422);
    const [failed] = await dataSource.query("SELECT id, status, error_code FROM documents WHERE display_name = 'malformed.pdf'");
    expect(failed).toMatchObject({ status: 'FAILED', error_code: 'EXTRACTION_FAILED' });

    const valid = await upload(session, 'retry.txt', 'Retryable indexed content for the support team.', 'text/plain');
    const document = await valid.json();
    await dataSource.query("UPDATE documents SET status = 'FAILED', error_code = 'EXTRACTION_FAILED' WHERE id = $1", [document.id]);
    await dataSource.query('DELETE FROM document_chunks WHERE document_id = $1', [document.id]);
    const retry = await fetch(`${baseUrl}/api/v1/documents/${document.id}/retry`, {
      method: 'POST', headers: { cookie: session.cookie, 'x-csrf-token': session.csrf },
    });
    expect(retry.status).toBe(201);
    expect((await retry.json()).status).toBe('INDEXED');
  });
});
