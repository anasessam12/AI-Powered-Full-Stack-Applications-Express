const { spawnSync } = require('node:child_process');
const path = require('node:path');

if (process.argv.includes('--prepare-database')) {
  require('ts-node').register({
    project: path.resolve(__dirname, '../api/tsconfig.app.json'),
    transpileOnly: true,
  });
  require('reflect-metadata');
  const { DataSource } = require('typeorm');
  const { resolveDatabaseTarget } = require('../api/src/database/database-target');
  const { seedWorkspace } = require('../api/src/database/seeds/workspace-seed');

  async function prepareDatabase() {
    const url = process.env.TEST_DATABASE_URL;
    if (!url) throw new Error('Playwright requires TEST_DATABASE_URL pointing to a disposable PostgreSQL database ending in _test.');
    resolveDatabaseTarget('test', process.env);
    process.env.DATABASE_URL = url;
    process.env.DOCUMENT_STORAGE_ROOT = 'var/e2e-documents';
    const source = new DataSource({
      type: 'postgres',
      url,
      entities: [
        require('../api/src/database/entities/user.entity').User,
        require('../api/src/database/entities/session.entity').Session,
        require('../api/src/database/entities/document.entity').Document,
        require('../api/src/database/entities/document-chunk.entity').DocumentChunk,
        require('../api/src/database/entities/conversation.entity').Conversation,
        require('../api/src/database/entities/message.entity').Message,
        require('../api/src/database/entities/citation.entity').Citation,
      ],
      migrations: [
        require('../api/src/database/migrations/1700000000000-InitialProductSchema').InitialProductSchema1700000000000,
        require('../api/src/database/migrations/1700000001000-UniqueDocumentChecksum').UniqueDocumentChecksum1700000001000,
        require('../api/src/database/migrations/1700000002000-SearchVectorTrigger').SearchVectorTrigger1700000002000,
      ],
      migrationsTableName: 'typeorm_migrations',
      synchronize: false,
      installExtensions: false,
    });
    await source.initialize();
    try {
      await source.runMigrations();
      await source.query('TRUNCATE TABLE citations, messages, conversations, document_chunks, documents, sessions, users CASCADE');
      await seedWorkspace(source, 'test');
    } finally {
      await source.destroy();
    }
  }

  prepareDatabase().catch((error) => {
    console.error(error instanceof Error ? error.message : 'E2E database setup failed.');
    process.exitCode = 1;
  });
} else {
  module.exports = async function globalSetup() {
    const result = spawnSync(process.execPath, [__filename, '--prepare-database'], {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: 'inherit',
      windowsHide: true,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error('E2E database setup failed in its isolated Node process.');
  };
}
