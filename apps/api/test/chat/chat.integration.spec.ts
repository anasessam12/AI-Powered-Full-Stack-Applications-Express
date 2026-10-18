import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { DataSource } from 'typeorm';
import {
  PRODUCT_ENTITIES, Conversation, Document, DocumentChunk, DocumentStatus, Message, MessageRole, MessageStatus, User, UserRole,
} from '../../src/database/entities';
import { InitialProductSchema1700000000000 } from '../../src/database/migrations/1700000000000-InitialProductSchema';
import { UniqueDocumentChecksum1700000001000 } from '../../src/database/migrations/1700000001000-UniqueDocumentChecksum';
import { SearchVectorTrigger1700000002000 } from '../../src/database/migrations/1700000002000-SearchVectorTrigger';
import { LLM_PROVIDER } from '../../src/llm/llm-provider';
import { FakeLlmProvider } from '../fixtures/fake-llm-provider';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const integrationSuite = testDatabaseUrl ? describe : describe.skip;

integrationSuite('grounded chat API', () => {
  let app: INestApplication;
  let baseUrl: string;
  let dataSource: DataSource;
  let agent: User;
  let session: { cookie: string; csrf: string };
  let fakeProvider: FakeLlmProvider;

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
    agent = await dataSource.getRepository(User).save(dataSource.getRepository(User).create({
      username: 'chat.agent', normalizedUsername: 'chat.agent', passwordHash: await argon2.hash('Chat-agent-password-129!'),
      role: UserRole.AGENT, isActive: true,
    }));
    const { AppModule } = await import('../../src/app/app.module');
    fakeProvider = new FakeLlmProvider(['Refunds are available', ' within thirty days [chunk-1].']);
    const testingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(LLM_PROVIDER)
      .useValue(fakeProvider)
      .compile();
    app = testingModule.createNestApplication({ logger: false });
    app.setGlobalPrefix('api/v1');
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
    const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: agent.username, password: 'Chat-agent-password-129!' }),
    });
    session = {
      cookie: (login.headers.get('set-cookie') ?? '').split(';', 1)[0],
      csrf: (await login.json() as { csrfToken: string }).csrfToken,
    };
  }, 30_000);

  afterAll(async () => {
    if (app) await app.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  async function createConversation(title: string): Promise<Conversation> {
    const response = await fetch(`${baseUrl}/api/v1/conversations`, {
      method: 'POST', headers: { cookie: session.cookie, 'x-csrf-token': session.csrf, 'content-type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    return response.json() as Promise<Conversation>;
  }

  async function ask(conversationId: string, message: string, requestId: string, signal?: AbortSignal) {
    return fetch(`${baseUrl}/api/v1/chat`, {
      method: 'POST', headers: { cookie: session.cookie, 'x-csrf-token': session.csrf, 'content-type': 'application/json' },
      body: JSON.stringify({ conversationId, message, requestId }),
      signal,
    });
  }

  function parseEvents(body: string): Array<{ event: string; data: Record<string, unknown> }> {
    return body.trim().split(/\r?\n\r?\n/).filter(Boolean).map((block) => {
      const event = block.match(/^event: (.+)$/m)?.[1] ?? '';
      const data = block.match(/^data: (.+)$/m)?.[1] ?? '{}';
      return { event, data: JSON.parse(data) as Record<string, unknown> };
    });
  }

  it('persists user and assistant messages, streams ordered events and stores source citations', async () => {
    const conversation = await createConversation('Grounded chat');
    const documents = dataSource.getRepository(Document);
    const document = await documents.save(documents.create({
      ownerUserId: agent.id, displayName: 'refund-policy.txt', storageKey: 'unused.txt', mimeType: 'text/plain',
      byteSize: '42', checksumSha256: 'b'.repeat(64), status: DocumentStatus.INDEXED, errorCode: null, deletedAt: null,
    }));
    const chunk = await dataSource.getRepository(DocumentChunk).save(dataSource.getRepository(DocumentChunk).create({
      documentId: document.id, ordinal: 0, content: 'Refund requests are available within thirty days.', pageNumber: 1, section: 'Refunds',
    }));

    const response = await ask(conversation.id, 'refund requests', '10000000-0000-4000-8000-000000000001');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    const events = parseEvents(await response.text());
    expect(events.map((item) => item.event)).toEqual([
      'message.started', 'message.delta', 'message.delta', 'citations', 'message.completed',
    ]);
    const messages = await dataSource.getRepository(Message).find({ where: { conversationId: conversation.id }, order: { createdAt: 'ASC' } });
    expect(messages.map((item) => [item.role, item.status])).toEqual([
      [MessageRole.USER, MessageStatus.COMPLETED], [MessageRole.ASSISTANT, MessageStatus.COMPLETED],
    ]);
    expect(messages[0].content).toBe('refund requests');
    expect(messages[1].content).toContain('Refunds are available within thirty days');
    expect(await dataSource.query('SELECT document_id FROM citations WHERE message_id = $1', [messages[1].id])).toEqual([{ document_id: document.id }]);
    expect(events[3].data).toMatchObject({ citations: [{ chunkId: chunk.id, sourceName: 'refund-policy.txt', pageNumber: 1 }] });
    const history = await fetch(`${baseUrl}/api/v1/conversations/${conversation.id}/messages`, { headers: { cookie: session.cookie } });
    expect(await history.json()).toMatchObject([
      { role: MessageRole.USER, content: 'refund requests' },
      { role: MessageRole.ASSISTANT, status: MessageStatus.COMPLETED, citations: [{ sourceName: 'refund-policy.txt', pageNumber: 1, section: 'Refunds' }] },
    ]);
  });

  it('abstains without calling the provider and replays a completed request idempotently', async () => {
    const conversation = await createConversation('No evidence');
    const before = fakeProvider.requests.length;
    const requestId = '10000000-0000-4000-8000-000000000002';
    const first = await ask(conversation.id, 'Question with no matching evidence: purple comet', requestId);
    const firstEvents = parseEvents(await first.text());
    expect(firstEvents.map((item) => item.event)).toEqual(['message.started', 'message.delta', 'message.completed']);
    expect(fakeProvider.requests).toHaveLength(before);
    const laterTurn = await ask(conversation.id, 'refund requests', '10000000-0000-4000-8000-000000000005');
    expect(parseEvents(await laterTurn.text()).map((item) => item.event)).toContain('citations');
    const second = await ask(conversation.id, 'Question with no matching evidence: purple comet', requestId);
    expect(second.status).toBe(200);
    const secondEvents = parseEvents(await second.text());
    expect(secondEvents[secondEvents.length - 1]?.event).toBe('message.completed');
    expect(secondEvents.find((item) => item.event === 'message.delta')?.data.delta).toContain('do not contain enough information');
    expect(await dataSource.getRepository(Message).countBy({ conversationId: conversation.id, role: MessageRole.USER })).toBe(2);
    const conflict = await ask(conversation.id, 'different content', requestId);
    expect(conflict.status).toBe(409);
  });

  it('records provider failures as failed and never emits message.completed', async () => {
    const conversation = await createConversation('Failure');
    fakeProvider.failNext();
    const response = await ask(conversation.id, 'refund requests', '10000000-0000-4000-8000-000000000003');
    const events = parseEvents(await response.text());
    expect(events.map((item) => item.event)).toEqual(['message.started', 'message.failed']);
    const assistant = await dataSource.getRepository(Message).findOneByOrFail({ conversationId: conversation.id, role: MessageRole.ASSISTANT });
    expect(assistant.status).toBe(MessageStatus.FAILED);
    expect(events[1].data).not.toHaveProperty('apiKey');
  });

  it('treats exact Arabic substring evidence as eligible for the grounded answer path', async () => {
    const conversation = await createConversation('Arabic refund question');
    const document = await dataSource.getRepository(Document).save(dataSource.getRepository(Document).create({
      ownerUserId: agent.id, displayName: 'arabic-refund-policy.txt', storageKey: 'arabic-unused.txt', mimeType: 'text/plain',
      byteSize: '48', checksumSha256: 'c'.repeat(64), status: DocumentStatus.INDEXED, errorCode: null, deletedAt: null,
    }));
    await dataSource.getRepository(DocumentChunk).save(dataSource.getRepository(DocumentChunk).create({
      documentId: document.id, ordinal: 0, content: 'يمكن للعملاء طلب استرداد الأموال خلال ثلاثين يوماً.', pageNumber: 1, section: 'الاسترداد',
    }));
    const before = fakeProvider.requests.length;
    const response = await ask(conversation.id, 'استرداد الأموال', '10000000-0000-4000-8000-000000000006');
    const events = parseEvents(await response.text());
    expect(events.map((item) => item.event)).toContain('citations');
    expect(fakeProvider.requests).toHaveLength(before + 1);
  });

  it('marks a disconnected partial answer interrupted and never marks it completed', async () => {
    const conversation = await createConversation('Interrupted');
    const abort = new AbortController();
    fakeProvider.waitForAbortOnNextRequest();
    const response = await ask(conversation.id, 'refund requests', '10000000-0000-4000-8000-000000000004', abort.signal);
    if (!response.body) throw new Error('Expected an SSE response body.');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let received = '';
    while (!received.includes('event: message.delta')) {
      const next = await reader.read();
      if (next.done) break;
      received += decoder.decode(next.value, { stream: true });
    }
    abort.abort();
    await reader.cancel().catch(() => undefined);
    let assistant: Message | null = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      assistant = await dataSource.getRepository(Message).findOneBy({ conversationId: conversation.id, role: MessageRole.ASSISTANT });
      if (assistant?.status === MessageStatus.INTERRUPTED) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    expect(received).toContain('event: message.delta');
    expect(assistant?.status).toBe(MessageStatus.INTERRUPTED);
    expect(assistant?.completedAt).toBeNull();
  });
});
