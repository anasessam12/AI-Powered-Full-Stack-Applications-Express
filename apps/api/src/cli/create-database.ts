import 'dotenv/config';
import { Client } from 'pg';
import { createDatabaseIfMissing, resolveDatabaseTarget, type DatabaseMode } from '../database/database-target';

const RETRY_DELAY_MS = 1000;
const RETRY_WINDOW_MS = 60_000;

async function connectMaintenanceClient(connectionUrl: string): Promise<Client> {
  const maintenanceUrl = new URL(connectionUrl);
  maintenanceUrl.pathname = '/postgres';
  const deadline = Date.now() + RETRY_WINDOW_MS;
  while (Date.now() < deadline) {
    const client = new Client({ connectionString: maintenanceUrl.toString() });
    try {
      await client.connect();
      return client;
    } catch {
      await client.end().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  throw new Error('Could not connect to local PostgreSQL within 60 seconds.');
}

async function createDatabase(mode: DatabaseMode): Promise<void> {
  const target = resolveDatabaseTarget(mode, process.env);
  const client = await connectMaintenanceClient(target.connectionUrl);
  try {
    const result = await createDatabaseIfMissing(
      {
        async query(text, values) {
          const response = await client.query(text, values as string[] | undefined);
          return { rows: response.rows as Array<Record<string, unknown>> };
        },
      },
      target.databaseName,
    );
    console.log(`Database ${target.databaseName} ${result === 'created' ? 'created' : 'already exists'}.`);
  } finally {
    await client.end();
  }
}

const mode = process.argv[2];
if (mode !== 'local' && mode !== 'test') {
  console.error('Usage: create-database <local|test>');
  process.exitCode = 1;
} else {
  createDatabase(mode).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Database creation failed.');
    process.exitCode = 1;
  });
}
