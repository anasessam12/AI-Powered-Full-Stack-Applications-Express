import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as argon2 from 'argon2';
import { DataSource } from 'typeorm';
import { PRODUCT_ENTITIES, Conversation, User, UserRole } from '../../src/database/entities';
import { InitialProductSchema1700000000000 } from '../../src/database/migrations/1700000000000-InitialProductSchema';
import { UniqueDocumentChecksum1700000001000 } from '../../src/database/migrations/1700000001000-UniqueDocumentChecksum';
import { SearchVectorTrigger1700000002000 } from '../../src/database/migrations/1700000002000-SearchVectorTrigger';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const integrationSuite = testDatabaseUrl ? describe : describe.skip;

integrationSuite('durable conversation API', () => {
  let app: INestApplication;
  let baseUrl: string;
  let dataSource: DataSource;
  let agent: User;
  let otherAgent: User;

  beforeAll(async () => {
    if (!testDatabaseUrl) return;
    if (!decodeURIComponent(new URL(testDatabaseUrl).pathname.slice(1)).endsWith('_test')) {
      throw new Error('TEST_DATABASE_URL must end in _test.');
    }
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.NODE_ENV = 'test';
    process.env.WEB_ORIGIN = 'http://localhost:4200';
    dataSource = new DataSource({
      type: 'postgres', url: testDatabaseUrl, entities: PRODUCT_ENTITIES,
      migrations: [InitialProductSchema1700000000000, UniqueDocumentChecksum1700000001000, SearchVectorTrigger1700000002000],
      migrationsTableName: 'typeorm_migrations', synchronize: false, installExtensions: false,
    });
    await dataSource.initialize();
    await dataSource.runMigrations();
    await dataSource.query('TRUNCATE TABLE citations, messages, conversations, document_chunks, documents, sessions, users CASCADE');
    const users = dataSource.getRepository(User);
    agent = await users.save(users.create({
      username: 'conversation.agent', normalizedUsername: 'conversation.agent',
      passwordHash: await argon2.hash('Conversation-agent-password-129!'), role: UserRole.AGENT, isActive: true,
    }));
    otherAgent = await users.save(users.create({
      username: 'conversation.other', normalizedUsername: 'conversation.other',
      passwordHash: await argon2.hash('Conversation-other-password-129!'), role: UserRole.AGENT, isActive: true,
    }));
    const { AppModule } = await import('../../src/app/app.module');
    app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  }, 30_000);

  afterAll(async () => {
    if (app) await app.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  async function login(user: User, password: string) {
    const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: user.username, password }),
    });
    const body = await response.json() as { csrfToken: string };
    return { cookie: (response.headers.get('set-cookie') ?? '').split(';', 1)[0], csrf: body.csrfToken };
  }

  it('creates, lists, reopens, archives and deletes only conversations owned by the session user', async () => {
    const session = await login(agent, 'Conversation-agent-password-129!');
    const otherSession = await login(otherAgent, 'Conversation-other-password-129!');
    const created = await fetch(`${baseUrl}/api/v1/conversations`, {
      method: 'POST', headers: { cookie: session.cookie, 'x-csrf-token': session.csrf, 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Refund question' }),
    });
    expect(created.status).toBe(201);
    const conversation = await created.json() as Conversation;
    expect(conversation.title).toBe('Refund question');
    expect(conversation).not.toHaveProperty('userId');

    const list = await fetch(`${baseUrl}/api/v1/conversations`, { headers: { cookie: session.cookie } });
    expect(await list.json()).toMatchObject([{ id: conversation.id, title: 'Refund question' }]);
    const reopen = await fetch(`${baseUrl}/api/v1/conversations/${conversation.id}`, { headers: { cookie: session.cookie } });
    expect(reopen.status).toBe(200);
    const messages = await fetch(`${baseUrl}/api/v1/conversations/${conversation.id}/messages`, { headers: { cookie: session.cookie } });
    expect(await messages.json()).toEqual([]);

    for (const path of ['', '/messages']) {
      const denied = await fetch(`${baseUrl}/api/v1/conversations/${conversation.id}${path}`, { headers: { cookie: otherSession.cookie } });
      expect(denied.status).toBe(404);
    }
    const foreignArchive = await fetch(`${baseUrl}/api/v1/conversations/${conversation.id}`, {
      method: 'PATCH', headers: { cookie: otherSession.cookie, 'x-csrf-token': otherSession.csrf, 'content-type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    });
    expect(foreignArchive.status).toBe(404);
    const foreignDelete = await fetch(`${baseUrl}/api/v1/conversations/${conversation.id}`, {
      method: 'DELETE', headers: { cookie: otherSession.cookie, 'x-csrf-token': otherSession.csrf },
    });
    expect(foreignDelete.status).toBe(404);
    const archived = await fetch(`${baseUrl}/api/v1/conversations/${conversation.id}`, {
      method: 'PATCH', headers: { cookie: session.cookie, 'x-csrf-token': session.csrf, 'content-type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    });
    expect(archived.status).toBe(200);
    expect((await archived.json() as Conversation).archivedAt).toBeTruthy();

    const deleted = await fetch(`${baseUrl}/api/v1/conversations/${conversation.id}`, {
      method: 'DELETE', headers: { cookie: session.cookie, 'x-csrf-token': session.csrf },
    });
    expect(deleted.status).toBe(204);
    const afterDelete = await fetch(`${baseUrl}/api/v1/conversations/${conversation.id}`, { headers: { cookie: session.cookie } });
    expect(afterDelete.status).toBe(404);
  });

  it('requires a valid session and CSRF token to create conversations', async () => {
    const unauthenticated = await fetch(`${baseUrl}/api/v1/conversations`, { method: 'POST' });
    expect(unauthenticated.status).toBe(401);
    const session = await login(agent, 'Conversation-agent-password-129!');
    const noCsrf = await fetch(`${baseUrl}/api/v1/conversations`, {
      method: 'POST', headers: { cookie: session.cookie, 'content-type': 'application/json' }, body: JSON.stringify({ title: 'No CSRF' }),
    });
    expect(noCsrf.status).toBe(403);
  });
});
