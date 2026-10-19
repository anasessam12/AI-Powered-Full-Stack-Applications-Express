import { createDatabaseIfMissing, createRoleIfMissing, resolveDatabaseAdminUrl, resolveDatabaseTarget, type DatabaseCreationClient } from './database-target';

describe('resolveDatabaseTarget', () => {
  it('preserves the exact mixed-case local database name', () => {
    expect(
      resolveDatabaseTarget('local', {
        DATABASE_URL: 'postgresql://support_app:secret@localhost:5432/teamWorkspace',
        NODE_ENV: 'development',
      }).databaseName,
    ).toBe('teamWorkspace');
  });

  it('rejects local database URLs on remote hosts', () => {
    expect(() =>
      resolveDatabaseTarget('local', {
        DATABASE_URL: 'postgresql://support_app:secret@db.example.com:5432/teamWorkspace',
        NODE_ENV: 'development',
      }),
    ).toThrow(/loopback/i);
  });

  it('requires a PostgreSQL protocol', () => {
    expect(() =>
      resolveDatabaseTarget('local', {
        DATABASE_URL: 'http://localhost:5432/teamWorkspace',
        NODE_ENV: 'development',
      }),
    ).toThrow(/PostgreSQL URL/i);
  });

  it('requires the explicit test database suffix', () => {
    expect(() =>
      resolveDatabaseTarget('test', {
        TEST_DATABASE_URL: 'postgresql://support_app:secret@localhost:5432/teamWorkspace',
      }),
    ).toThrow(/_test/);
  });

  it('rejects test database URLs on remote hosts', () => {
    expect(() =>
      resolveDatabaseTarget('test', {
        TEST_DATABASE_URL: 'postgresql://support_app:secret@db.example.com:5432/teamWorkspace_test',
      }),
    ).toThrow(/loopback/i);
  });

  it('requires an administrator URL for local database creation', () => {
    expect(() => resolveDatabaseAdminUrl('local', {
      DATABASE_URL: 'postgresql://support_app:secret@localhost:5432/teamWorkspace',
      NODE_ENV: 'development',
    })).toThrow(/DATABASE_ADMIN_URL/);
  });

  it('requires the administrator URL to use the same loopback PostgreSQL server', () => {
    expect(() => resolveDatabaseAdminUrl('local', {
      DATABASE_URL: 'postgresql://support_app:secret@localhost:5432/teamWorkspace',
      DATABASE_ADMIN_URL: 'postgresql://postgres:secret@db.example.com:5432/postgres',
      NODE_ENV: 'development',
    })).toThrow(/loopback/i);
  });

  it('rejects local fixture targets in production', () => {
    expect(() =>
      resolveDatabaseTarget('local', {
        DATABASE_URL: 'postgresql://support_app:secret@localhost:5432/teamWorkspace',
        NODE_ENV: 'production',
      }),
    ).toThrow(/production/i);
  });
});

describe('createDatabaseIfMissing', () => {
  it('creates the exact mixed-case identifier with a quoted name', async () => {
    const statements: string[] = [];
    const client: DatabaseCreationClient = {
      async query(text: string) {
        statements.push(text);
        return { rows: [] };
      },
    };

    await expect(createDatabaseIfMissing(client, 'teamWorkspace')).resolves.toBe('created');
    expect(statements).toEqual([
      'SELECT 1 FROM pg_database WHERE datname = $1',
      'CREATE DATABASE "teamWorkspace" OWNER "support_app"',
    ]);
  });

  it('skips creation when the exact database already exists', async () => {
    const statements: string[] = [];
    const client: DatabaseCreationClient = {
      async query(text: string) {
        statements.push(text);
        return { rows: [{ '?column?': 1 }] };
      },
    };

    await expect(createDatabaseIfMissing(client, 'teamWorkspace_test')).resolves.toBe('existing');
    expect(statements).toEqual(['SELECT 1 FROM pg_database WHERE datname = $1']);
  });
});

describe('createRoleIfMissing', () => {
  it('quotes a missing role and escapes its password as a SQL literal', async () => {
    const statements: Array<{ text: string; values?: unknown[] }> = [];
    const client: DatabaseCreationClient = {
      async query(text, values) {
        statements.push({ text, values });
        return { rows: [] };
      },
    };
    await expect(createRoleIfMissing(client, 'support_app', "local'secret")).resolves.toBe('created');
    expect(statements).toEqual([
      { text: 'SELECT 1 FROM pg_roles WHERE rolname = $1', values: ['support_app'] },
      { text: `CREATE ROLE "support_app" LOGIN PASSWORD 'local''secret'` },
    ]);
  });
});
