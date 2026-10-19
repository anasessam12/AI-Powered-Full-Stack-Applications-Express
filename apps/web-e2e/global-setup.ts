import { DataSource } from 'typeorm';
import { LlmProvider, LlmProviderError, LlmRequest, ProviderEvent } from '../api/src/llm/llm-provider';
import { resolveDatabaseTarget } from '../api/src/database/database-target';
import { seedWorkspace } from '../api/src/database/seeds/workspace-seed';

export class AcceptanceLlmProvider implements LlmProvider {
  async *stream(request: LlmRequest): AsyncIterable<ProviderEvent> {
    if (request.question === '__provider_failure__') throw new LlmProviderError('UPSTREAM', 'Deterministic E2E provider failure.');
    yield { type: 'delta', text: 'The return window is thirty days.' };
  }
}

export default async function globalSetup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('Playwright requires TEST_DATABASE_URL pointing to a disposable PostgreSQL database ending in _test.');
  resolveDatabaseTarget('test', process.env);
  process.env.DATABASE_URL = url;
  process.env.DOCUMENT_STORAGE_ROOT = 'var/e2e-documents';
  const { default: dataSource } = await import('../api/src/database/data-source');
  const source: DataSource = dataSource;
  await source.initialize();
  try {
    await source.runMigrations();
    await source.query('TRUNCATE TABLE citations, messages, conversations, document_chunks, documents, sessions, users CASCADE');
    await seedWorkspace(source, 'test');
  } finally {
    await source.destroy();
  }
}
