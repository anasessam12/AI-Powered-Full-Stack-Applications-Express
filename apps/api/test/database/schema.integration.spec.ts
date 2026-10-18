import { DataSource } from 'typeorm';
import { PRODUCT_ENTITIES, User, UserRole } from '../../src/database/entities';
import { InitialProductSchema1700000000000 } from '../../src/database/migrations/1700000000000-InitialProductSchema';
import { UniqueDocumentChecksum1700000001000 } from '../../src/database/migrations/1700000001000-UniqueDocumentChecksum';
import { SearchVectorTrigger1700000002000 } from '../../src/database/migrations/1700000002000-SearchVectorTrigger';

const databaseUrl = process.env.TEST_DATABASE_URL;
const databaseSuite = databaseUrl ? describe : describe.skip;

databaseSuite('PostgreSQL schema migrations (disposable TEST_DATABASE_URL only)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    if (!databaseUrl) return;
    const databaseName = decodeURIComponent(new URL(databaseUrl).pathname.slice(1));
    if (!databaseName.endsWith('_test')) {
      throw new Error('TEST_DATABASE_URL must point to a dedicated database whose name ends in _test.');
    }
    dataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      entities: PRODUCT_ENTITIES,
      migrations: [InitialProductSchema1700000000000, UniqueDocumentChecksum1700000001000, SearchVectorTrigger1700000002000],
      migrationsTableName: 'typeorm_migrations',
      synchronize: false,
      installExtensions: false,
    });
    await dataSource.initialize();
    const ownedTables = new Set([
      'typeorm_migrations',
      'users',
      'sessions',
      'documents',
      'document_chunks',
      'conversations',
      'messages',
      'citations',
    ]);
    const existingTables = (await dataSource.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
    )) as Array<{ tablename: string }>;
    const unexpectedTables = existingTables.map(({ tablename }) => tablename).filter((name) => !ownedTables.has(name));
    if (unexpectedTables.length) {
      throw new Error(`Refusing to run destructive schema tests; unexpected tables exist: ${unexpectedTables.join(', ')}`);
    }
    await dataSource.runMigrations();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('migrates an empty database, enforces normalized username uniqueness, and supports down/up', async () => {
    if (!dataSource?.isInitialized) throw new Error('TEST_DATABASE_URL is required for this integration test.');
    const userRepository = dataSource.getRepository(User);
    const first = userRepository.create({
      username: 'Example.Admin',
      normalizedUsername: 'example.admin',
      passwordHash: '$argon2id$test-only-hash',
      role: UserRole.ADMIN,
      isActive: true,
    });
    await userRepository.save(first);
    const duplicate = userRepository.create({
      username: 'example.admin',
      normalizedUsername: 'example.admin',
      passwordHash: '$argon2id$test-only-hash',
      role: UserRole.AGENT,
      isActive: true,
    });
    await expect(userRepository.save(duplicate)).rejects.toMatchObject({ code: '23505' });

    await dataSource.undoLastMigration();
    await dataSource.runMigrations();
    const tables = (await dataSource.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users'",
    )) as Array<{ tablename: string }>;
    expect(tables.map(({ tablename }) => tablename)).toEqual(['users']);
  });

  it('keeps citation snapshots when a document is deleted and cascades history on conversation deletion', async () => {
    if (!dataSource?.isInitialized) throw new Error('TEST_DATABASE_URL is required for this integration test.');
    const [{ id: userId }] = (await dataSource.query(
      `INSERT INTO users (username, normalized_username, password_hash, role)
       VALUES ('retention.admin', 'retention.admin', '$argon2id$test-only-hash', 'ADMIN') RETURNING id`,
    )) as Array<{ id: string }>;
    const [{ id: otherUserId }] = (await dataSource.query(
      `INSERT INTO users (username, normalized_username, password_hash, role)
       VALUES ('other.agent', 'other.agent', '$argon2id$test-only-hash', 'AGENT') RETURNING id`,
    )) as Array<{ id: string }>;
    const [{ id: documentId }] = (await dataSource.query(
      `INSERT INTO documents (owner_user_id, display_name, storage_key, mime_type, byte_size, checksum_sha256, status)
       VALUES ($1, 'Policy.pdf', 'test/key', 'application/pdf', 12, repeat('a', 64), 'INDEXED') RETURNING id`,
      [userId],
    )) as Array<{ id: string }>;
    const [{ id: chunkId }] = (await dataSource.query(
      `INSERT INTO document_chunks (document_id, ordinal, content)
       VALUES ($1, 0, 'Retention policy text') RETURNING id`,
      [documentId],
    )) as Array<{ id: string }>;
    const [{ id: conversationId }] = (await dataSource.query(
      `INSERT INTO conversations (user_id, title) VALUES ($1, 'Retention test') RETURNING id`,
      [userId],
    )) as Array<{ id: string }>;
    await expect(
      dataSource.query(
        `INSERT INTO messages (conversation_id, user_id, role, content, status)
         VALUES ($1, $2, 'USER', 'must be rejected', 'COMPLETED')`,
        [conversationId, otherUserId],
      ),
    ).rejects.toMatchObject({ code: '23503' });
    const [{ id: messageId }] = (await dataSource.query(
      `INSERT INTO messages (conversation_id, user_id, role, content, status)
       VALUES ($1, $2, 'ASSISTANT', 'The policy says ...', 'COMPLETED') RETURNING id`,
      [conversationId, userId],
    )) as Array<{ id: string }>;
    await dataSource.query(
      `INSERT INTO citations (message_id, document_id, chunk_id, display_source, page_number, rank)
       VALUES ($1, $2, $3, 'Policy.pdf', 2, 1)`,
      [messageId, documentId, chunkId],
    );

    await dataSource.query('DELETE FROM documents WHERE id = $1', [documentId]);
    const citations = (await dataSource.query(
      'SELECT document_id, chunk_id, display_source, page_number FROM citations WHERE message_id = $1',
      [messageId],
    )) as Array<{ document_id: string | null; chunk_id: string | null; display_source: string; page_number: number }>;
    expect(citations).toEqual([
      { document_id: null, chunk_id: null, display_source: 'Policy.pdf', page_number: 2 },
    ]);

    await dataSource.query('DELETE FROM conversations WHERE id = $1', [conversationId]);
    const [{ messageCount, citationCount }] = (await dataSource.query(
      `SELECT
         (SELECT count(*) FROM messages WHERE id = $1)::int AS "messageCount",
         (SELECT count(*) FROM citations WHERE message_id = $1)::int AS "citationCount"`,
      [messageId],
    )) as Array<{ messageCount: number; citationCount: number }>;
    expect(messageCount).toBe(0);
    expect(citationCount).toBe(0);
  });
});
