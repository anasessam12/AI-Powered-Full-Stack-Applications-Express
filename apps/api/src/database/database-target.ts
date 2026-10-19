export type DatabaseCreationClient = {
  query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
};

export type DatabaseMode = 'local' | 'test';
export type DatabaseTarget = {
  connectionUrl: string;
  databaseName: 'teamWorkspace' | `${string}_test`;
};

function parsePostgresUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Database URL must be a valid PostgreSQL URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('Database URL must use the PostgreSQL URL protocol.');
  }
  return url;
}

function assertLoopback(url: URL): void {
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error('Database creation is restricted to a loopback host.');
  }
}

export function resolveDatabaseTarget(mode: DatabaseMode, env: NodeJS.ProcessEnv): DatabaseTarget {
  if (mode === 'local' && env.NODE_ENV === 'production') {
    throw new Error('Local database creation is disabled in production.');
  }
  const rawUrl = mode === 'local' ? env.DATABASE_URL : env.TEST_DATABASE_URL;
  if (!rawUrl) throw new Error(`${mode === 'local' ? 'DATABASE_URL' : 'TEST_DATABASE_URL'} must be configured.`);
  const url = parsePostgresUrl(rawUrl);
  assertLoopback(url);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!databaseName) throw new Error('Database URL must include a database name.');
  if (mode === 'local' && databaseName !== 'teamWorkspace') {
    throw new Error('Local DATABASE_URL must target the exact database name teamWorkspace.');
  }
  if (mode === 'test' && !/^[A-Za-z0-9_]+_test$/.test(databaseName)) {
    throw new Error('Test database name must end in _test.');
  }
  if (!url.username || !url.password) throw new Error('Database URL must include an application username and password.');
  return { connectionUrl: url.toString(), databaseName: databaseName as DatabaseTarget['databaseName'] };
}

export function resolveDatabaseAdminUrl(mode: DatabaseMode, env: NodeJS.ProcessEnv): string {
  const rawAdminUrl = env.DATABASE_ADMIN_URL;
  if (!rawAdminUrl) throw new Error('DATABASE_ADMIN_URL must be configured for database creation.');
  const adminUrl = parsePostgresUrl(rawAdminUrl);
  const appTarget = resolveDatabaseTarget(mode, env);
  const appUrl = new URL(appTarget.connectionUrl);
  assertLoopback(adminUrl);
  if (adminUrl.hostname.toLowerCase() !== appUrl.hostname.toLowerCase() || adminUrl.port !== appUrl.port) {
    throw new Error('DATABASE_ADMIN_URL must use the same loopback PostgreSQL server as the application database URL.');
  }
  if (decodeURIComponent(adminUrl.pathname.replace(/^\//, '')) !== 'postgres') {
    throw new Error('DATABASE_ADMIN_URL must connect to the PostgreSQL maintenance database named postgres.');
  }
  if (!adminUrl.username || !adminUrl.password) throw new Error('DATABASE_ADMIN_URL must include an administrator username and password.');
  return adminUrl.toString();
}

export async function createRoleIfMissing(
  client: DatabaseCreationClient,
  roleName: string,
  password: string,
): Promise<'created' | 'existing'> {
  if (!/^[a-z_][a-z0-9_]*$/.test(roleName)) throw new Error('Application role name must be a simple lowercase PostgreSQL identifier.');
  if (!password) throw new Error('Application role password must not be empty.');
  const found = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [roleName]);
  if (found.rows.length > 0) return 'existing';
  await client.query(`CREATE ROLE "${roleName}" LOGIN PASSWORD '${password.replace(/'/g, "''")}'`);
  return 'created';
}

export async function createDatabaseIfMissing(
  client: DatabaseCreationClient,
  databaseName: 'teamWorkspace' | `${string}_test`,
  ownerName = 'support_app',
): Promise<'created' | 'existing'> {
  if (databaseName !== 'teamWorkspace' && !/^[A-Za-z0-9_]+_test$/.test(databaseName)) {
    throw new Error('Database name must be teamWorkspace or a validated _test database.');
  }
  if (!/^[a-z_][a-z0-9_]*$/.test(ownerName)) throw new Error('Database owner must be a simple lowercase PostgreSQL identifier.');
  const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
  if (found.rows.length > 0) return 'existing';
  await client.query(`CREATE DATABASE "${databaseName}" OWNER "${ownerName}"`);
  return 'created';
}
