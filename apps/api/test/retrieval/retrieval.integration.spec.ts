import * as argon2 from 'argon2';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { PRODUCT_ENTITIES, Document, DocumentChunk, DocumentStatus, User, UserRole } from '../../src/database/entities';
import { InitialProductSchema1700000000000 } from '../../src/database/migrations/1700000000000-InitialProductSchema';
import { UniqueDocumentChecksum1700000001000 } from '../../src/database/migrations/1700000001000-UniqueDocumentChecksum';
import { SearchVectorTrigger1700000002000 } from '../../src/database/migrations/1700000002000-SearchVectorTrigger';
import { RetrievalService } from '../../src/app/retrieval/retrieval.service';

const testDatabaseUrl = process.env.RUN_DATABASE_INTEGRATION === 'true' ? process.env.TEST_DATABASE_URL : undefined;
const integrationSuite = testDatabaseUrl ? describe : describe.skip;

integrationSuite('PostgreSQL full-text retrieval', () => {
  let dataSource: DataSource;
  let service: RetrievalService;
  let owner: User;

  beforeAll(async () => {
    if (!testDatabaseUrl) return;
    const databaseName = decodeURIComponent(new URL(testDatabaseUrl).pathname.slice(1));
    if (!databaseName.endsWith('_test')) throw new Error('TEST_DATABASE_URL must end in _test.');
    dataSource = new DataSource({
      type: 'postgres', url: testDatabaseUrl, entities: PRODUCT_ENTITIES,
      migrations: [InitialProductSchema1700000000000, UniqueDocumentChecksum1700000001000, SearchVectorTrigger1700000002000],
      migrationsTableName: 'typeorm_migrations', synchronize: false, installExtensions: false,
    });
    await dataSource.initialize();
    await dataSource.runMigrations();
    await dataSource.query('TRUNCATE TABLE citations, messages, conversations, document_chunks, documents, sessions, users CASCADE');
    owner = await dataSource.getRepository(User).save(dataSource.getRepository(User).create({
      username: 'retrieval.owner', normalizedUsername: 'retrieval.owner', passwordHash: await argon2.hash('Retrieval-test-password-657!'),
      role: UserRole.ADMIN, isActive: true,
    }));
    service = new RetrievalService(dataSource);
  }, 30_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  async function addDocument(
    id: string,
    status: DocumentStatus,
    content: string,
    deletedAt: Date | null = null,
    displayName = `${id}.txt`,
  ) {
    const documents = dataSource.getRepository(Document);
    const document = await documents.save(documents.create({
      id,
      ownerUserId: owner.id,
      displayName,
      storageKey: `${id}.txt`,
      mimeType: 'text/plain',
      byteSize: String(Buffer.byteLength(content)),
      checksumSha256: id.replace(/-/g, '').padEnd(64, 'a').slice(0, 64),
      status,
      errorCode: null,
      deletedAt,
    }));
    const chunks = dataSource.getRepository(DocumentChunk);
    await chunks.save(chunks.create({ documentId: document.id, ordinal: 0, content, pageNumber: 3, section: 'Refund policy' }));
    return document;
  }

  it('finds matching chunks, ranks relevant content first, and returns source metadata', async () => {
    const relevant = 'Customers may submit a refund request within thirty calendar days of purchase.';
    await addDocument('00000000-0000-4000-8000-000000000001', DocumentStatus.INDEXED, relevant);
    await addDocument('00000000-0000-4000-8000-000000000002', DocumentStatus.INDEXED, 'How to change your billing password and contact support.');

    const results = await service.search('refund request');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      documentId: '00000000-0000-4000-8000-000000000001',
      content: relevant,
      sourceName: '00000000-0000-4000-8000-000000000001.txt',
      pageNumber: 3,
      section: 'Refund policy',
    });
    expect(results[0].score).toBeGreaterThan(0);
  });

  it('excludes failed and deleted documents and bounds results to five with stable ties', async () => {
    const phrase = 'refund claims must be submitted within thirty days';
    for (let index = 10; index < 17; index++) {
      await addDocument(`00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, DocumentStatus.INDEXED, phrase);
    }
    await addDocument('00000000-0000-4000-8000-000000000020', DocumentStatus.FAILED, phrase);
    await addDocument('00000000-0000-4000-8000-000000000021', DocumentStatus.INDEXED, phrase, new Date());

    const first = await service.search('refund claims');
    const second = await service.search('refund claims');
    expect(first).toHaveLength(5);
    expect(first.map((result) => result.chunkId)).toEqual(
      [...first.map((result) => result.chunkId)].sort(),
    );
    expect(first.map((result) => result.chunkId)).toEqual(second.map((result) => result.chunkId));
    expect(first.every((result) => !result.documentId.endsWith('000000000020') && !result.documentId.endsWith('000000000021'))).toBe(true);
  });

  it('returns no hits for blank, irrelevant, or overlong queries', async () => {
    await addDocument('00000000-0000-4000-8000-000000000030', DocumentStatus.INDEXED, 'Returns are processed in five business days.');
    expect(await service.search('   ')).toEqual([]);
    expect(await service.search('space shuttle launch')).toEqual([]);
    await expect(service.search('x'.repeat(501))).rejects.toThrow();
  });

  it('tokenizes Arabic documents and queries with the multilingual simple configuration', async () => {
    const arabicText = 'يمكن للعملاء طلب استرداد الأموال خلال ثلاثين يوماً من تاريخ الشراء.';
    await addDocument('00000000-0000-4000-8000-000000000040', DocumentStatus.INDEXED, arabicText);
    const results = await service.search('استرداد الأموال');
    expect(results[0]?.content).toBe(arabicText);
  });

  it('meets the versioned support-question retrieval cases and abstention case', async () => {
    type EvaluationCase = { question: string; expectedSource: string | null; expectsEvidence: boolean };
    const fixtureRoot = resolve(__dirname, '../fixtures/knowledge');
    const cases = JSON.parse(await readFile(resolve(fixtureRoot, 'evaluation-cases.json'), 'utf8')) as EvaluationCase[];
    const fixtureIds = new Map<string, string>([
      ['refund-policy.md', '00000000-0000-4000-8000-000000000050'],
      ['account-security.txt', '00000000-0000-4000-8000-000000000051'],
    ]);
    for (const [source, id] of fixtureIds) {
      await addDocument(id, DocumentStatus.INDEXED, await readFile(resolve(fixtureRoot, source), 'utf8'), null, source);
    }

    for (const evaluation of cases) {
      const results = await service.search(evaluation.question);
      if (!evaluation.expectsEvidence) {
        expect(results).toEqual([]);
      } else {
        expect(results[0]?.sourceName).toBe(evaluation.expectedSource);
      }
    }
  });
});
