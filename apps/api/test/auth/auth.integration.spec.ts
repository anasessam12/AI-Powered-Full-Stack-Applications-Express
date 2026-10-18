import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { DataSource } from 'typeorm';
import { PRODUCT_ENTITIES, User, UserRole } from '../../src/database/entities';
import { InitialProductSchema1700000000000 } from '../../src/database/migrations/1700000000000-InitialProductSchema';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const integrationSuite = testDatabaseUrl ? describe : describe.skip;
const adminPassword = 'Task-3-admin-password-468!';
const agentPassword = 'Task-3-agent-password-247!';

integrationSuite('username/password auth and user administration', () => {
  let app: INestApplication;
  let baseUrl: string;
  let dataSource: DataSource;
  let admin: User;
  let agent: User;

  beforeAll(async () => {
    if (!testDatabaseUrl) return;
    const databaseName = decodeURIComponent(new URL(testDatabaseUrl).pathname.slice(1));
    if (!databaseName.endsWith('_test')) {
      throw new Error('TEST_DATABASE_URL must point to a dedicated database whose name ends in _test.');
    }
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.NODE_ENV = 'test';
    process.env.WEB_ORIGIN = 'http://localhost:4200';
    process.env.SESSION_TTL_SECONDS = '3600';

    dataSource = new DataSource({
      type: 'postgres',
      url: testDatabaseUrl,
      entities: PRODUCT_ENTITIES,
      migrations: [InitialProductSchema1700000000000],
      migrationsTableName: 'typeorm_migrations',
      synchronize: false,
      installExtensions: false,
    });
    await dataSource.initialize();
    await dataSource.runMigrations();
    await dataSource.query(
      'TRUNCATE TABLE citations, messages, conversations, document_chunks, documents, sessions, users CASCADE',
    );
    const repository = dataSource.getRepository(User);
    admin = await repository.save(
      repository.create({
        username: 'auth.integration.admin',
        normalizedUsername: 'auth.integration.admin',
        passwordHash: await argon2.hash(adminPassword),
        role: UserRole.ADMIN,
        isActive: true,
      }),
    );
    agent = await repository.save(
      repository.create({
        username: 'auth.integration.agent',
        normalizedUsername: 'auth.integration.agent',
        passwordHash: await argon2.hash(agentPassword),
        role: UserRole.AGENT,
        isActive: true,
      }),
    );

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

  async function request(path: string, options: { method?: string; body?: unknown; cookie?: string; csrf?: string } = {}) {
    const headers: Record<string, string> = {};
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    if (options.cookie) headers.cookie = options.cookie;
    if (options.csrf) headers['x-csrf-token'] = options.csrf;
    return fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  }

  async function login(username: string, password: string) {
    const response = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    const setCookie = response.headers.get('set-cookie') ?? '';
    const cookie = setCookie.split(';', 1)[0];
    return { response, payload: await response.json(), cookie, setCookie };
  }

  it('returns the same generic credential error for an unknown and an incorrect password', async () => {
    const unknown = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { username: 'missing.auth.user', password: 'Wrong-password-22!' },
    });
    const wrong = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { username: admin.username, password: 'Wrong-password-22!' },
    });

    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect((await unknown.json()).message).toBe('Invalid username or password.');
    expect((await wrong.json()).message).toBe('Invalid username or password.');
    expect(unknown.headers.get('set-cookie')).toBeNull();
    expect(wrong.headers.get('set-cookie')).toBeNull();
  });

  it('issues an HttpOnly same-site cookie, stores only its hash, and restores a CSRF-protected session', async () => {
    const result = await login(admin.username, adminPassword);
    expect(result.response.status).toBe(201);
    expect(result.setCookie).toMatch(/^support_session=[A-Za-z0-9_-]+;/);
    expect(result.setCookie.toLowerCase()).toContain('httponly');
    expect(result.setCookie.toLowerCase()).toContain('samesite=lax');
    expect(result.setCookie).toContain('Path=/api/v1');
    expect(result.setCookie.toLowerCase()).not.toContain('secure');
    expect(result.payload.user).toMatchObject({ id: admin.id, username: admin.username, role: 'ADMIN' });
    expect(result.payload).not.toHaveProperty('passwordHash');

    const token = result.cookie.split('=')[1];
    const storedSession = await dataSource.getRepository('sessions').findOneBy({
      tokenHash: createHash('sha256').update(token).digest('hex'),
    });
    expect(storedSession).toBeTruthy();
    expect(storedSession).not.toHaveProperty('token', token);

    const restored = await request('/api/v1/auth/session', { cookie: result.cookie });
    expect(restored.status).toBe(200);
    expect(await restored.json()).toEqual({
      user: { id: admin.id, username: admin.username, normalizedUsername: admin.normalizedUsername, role: 'ADMIN' },
      csrfToken: result.payload.csrfToken,
    });

    await dataSource.getRepository('sessions').update(storedSession.id, { expiresAt: new Date(0) });
    expect((await request('/api/v1/auth/session', { cookie: result.cookie })).status).toBe(401);
  });

  it('rejects disabled accounts and does not issue a cookie', async () => {
    await dataSource.getRepository(User).update(agent.id, { isActive: false });
    const result = await login(agent.username, agentPassword);
    await dataSource.getRepository(User).update(agent.id, { isActive: true });

    expect(result.response.status).toBe(401);
    expect(result.payload.message).toBe('Invalid username or password.');
    expect(result.response.headers.get('set-cookie')).toBeNull();
  });

  it('requires CSRF for state-changing requests and denies Agents from user administration', async () => {
    const agentLogin = await login(agent.username, agentPassword);
    expect(agentLogin.response.status).toBe(201);

    const missingCsrf = await request('/api/v1/users', {
      method: 'POST',
      cookie: agentLogin.cookie,
      body: { username: 'csrf.denied', password: 'Strong-password-773!', role: 'AGENT' },
    });
    expect(missingCsrf.status).toBe(403);

    const invalidCsrf = await request('/api/v1/users', {
      method: 'POST',
      cookie: agentLogin.cookie,
      csrf: 'tampered-csrf-token',
      body: { username: 'csrf.invalid', password: 'Strong-password-773!', role: 'AGENT' },
    });
    expect(invalidCsrf.status).toBe(403);

    const agentList = await request('/api/v1/users', { cookie: agentLogin.cookie });
    expect(agentList.status).toBe(403);
  });

  it('allows Admin provisioning, omits hashes, and prevents disabling the final active Admin', async () => {
    const adminLogin = await login(admin.username, adminPassword);
    expect(adminLogin.response.status).toBe(201);

    const created = await request('/api/v1/users', {
      method: 'POST',
      cookie: adminLogin.cookie,
      csrf: adminLogin.payload.csrfToken,
      body: { username: 'new.agent', password: 'Strong-password-773!', role: 'AGENT' },
    });
    expect(created.status).toBe(201);
    const createdUser = await created.json();
    expect(createdUser).toMatchObject({ username: 'new.agent', normalizedUsername: 'new.agent', role: 'AGENT', isActive: true });
    expect(createdUser).not.toHaveProperty('passwordHash');

    const promote = await request(`/api/v1/users/${createdUser.id}`, {
      method: 'PATCH',
      cookie: adminLogin.cookie,
      csrf: adminLogin.payload.csrfToken,
      body: { role: 'ADMIN' },
    });
    expect(promote.status).toBe(200);
    expect((await promote.json()).role).toBe('ADMIN');

    const deactivate = await request(`/api/v1/users/${createdUser.id}`, {
      method: 'PATCH',
      cookie: adminLogin.cookie,
      csrf: adminLogin.payload.csrfToken,
      body: { isActive: false },
    });
    expect(deactivate.status).toBe(200);
    expect((await deactivate.json()).isActive).toBe(false);

    const list = await request('/api/v1/users', { cookie: adminLogin.cookie });
    expect(list.status).toBe(200);
    expect((await list.json()).every((user: object) => !('passwordHash' in user))).toBe(true);

    const deactivateLastAdmin = await request(`/api/v1/users/${admin.id}`, {
      method: 'PATCH',
      cookie: adminLogin.cookie,
      csrf: adminLogin.payload.csrfToken,
      body: { isActive: false },
    });
    expect(deactivateLastAdmin.status).toBe(409);
  });

  it('revokes a session on logout and throttles repeated bad credentials', async () => {
    const userLogin = await login(admin.username, adminPassword);
    const logout = await request('/api/v1/auth/logout', {
      method: 'POST',
      cookie: userLogin.cookie,
      csrf: userLogin.payload.csrfToken,
    });
    expect(logout.status).toBe(204);
    expect(logout.headers.get('set-cookie')?.toLowerCase()).toContain('max-age=0');
    expect((await request('/api/v1/auth/session', { cookie: userLogin.cookie })).status).toBe(401);

    const attempts = await Promise.all(
      Array.from({ length: 7 }, () =>
        request('/api/v1/auth/login', {
          method: 'POST',
          body: { username: 'bruteforce.user', password: 'Wrong-password-22!' },
        }),
      ),
    );
    expect(attempts.some((response) => response.status === 429)).toBe(true);
  });
});
