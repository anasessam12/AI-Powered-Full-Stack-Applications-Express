import 'dotenv/config';
import { DatabaseMode, resolveDatabaseTarget } from '../database/database-target';

async function run(mode: DatabaseMode): Promise<void> {
  const target = resolveDatabaseTarget(mode, process.env);
  if (mode === 'test') process.env.DATABASE_URL = target.connectionUrl;
  const [{ default: dataSource }, { seedWorkspace }] = await Promise.all([
    import('../database/data-source'),
    import('../database/seeds/workspace-seed'),
  ]);
  await dataSource.initialize();
  try {
    const result = await seedWorkspace(dataSource, mode);
    console.log(`Seed complete: ${result.usersCreated} user(s), ${result.documentsCreated} document(s) created.`);
  } finally {
    await dataSource.destroy();
  }
}

const mode = process.argv[2];
if (mode !== 'local' && mode !== 'test') {
  console.error('Usage: seed-workspace <local|test>');
  process.exitCode = 1;
} else {
  run(mode).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Workspace seed failed.');
    process.exitCode = 1;
  });
}
