export type DatabaseCreationClient = {
  query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
};

export type DatabaseMode = 'local' | 'test';
export type DatabaseTarget = {
  connectionUrl: string;
  databaseName: 'teamWorkspace' | `${string}_test`;
};

export function resolveDatabaseTarget(mode: DatabaseMode, env: NodeJS.ProcessEnv): DatabaseTarget {
  if (mode === 'local' && env.NODE_ENV === 'production') {
    throw new Error('Local database creation is disabled in production.');
  }

  const rawUrl = mode === 'local' ? env.DATABASE_URL : env.TEST_DATABASE_URL;
  if (!rawUrl) throw new Error(`${mode === 'local' ? 'DATABASE_URL' : 'TEST_DATABASE_URL'} must be configured.`);

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Database URL must be a valid PostgreSQL URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('Database URL must use the PostgreSQL URL protocol.');
  }

  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error('Database creation is restricted to a loopback host.');
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!databaseName) throw new Error('Database URL must include a database name.');
  if (mode === 'local' && databaseName !== 'teamWorkspace') {
    throw new Error('Local DATABASE_URL must target the exact database name teamWorkspace.');
  }
  if (mode === 'test' && !/^[A-Za-z0-9_]+_test$/.test(databaseName)) {
    throw new Error('Test database name must end in _test.');
  }

  return { connectionUrl: url.toString(), databaseName: databaseName as DatabaseTarget['databaseName'] };
}

export async function createDatabaseIfMissing(
  client: DatabaseCreationClient,
  databaseName: 'teamWorkspace' | `${string}_test`,
): Promise<'created' | 'existing'> {
  if (databaseName !== 'teamWorkspace' && !/^[A-Za-z0-9_]+_test$/.test(databaseName)) {
    throw new Error('Database name must be teamWorkspace or a validated _test database.');
  }

  const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
  if (found.rows.length > 0) return 'existing';

  await client.query(`CREATE DATABASE "${databaseName}"`);
  return 'created';
}
