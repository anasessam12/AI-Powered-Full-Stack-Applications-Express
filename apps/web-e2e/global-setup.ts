import { DataSource } from 'typeorm';
import { createInitialAdmin } from '../api/src/cli/admin-bootstrap';
import { LlmProvider, LlmProviderError, LlmRequest, ProviderEvent } from '../api/src/llm/llm-provider';

export const adminPassword = 'E2e-admin-password-91!';

export class AcceptanceLlmProvider implements LlmProvider {
  async *stream(request: LlmRequest): AsyncIterable<ProviderEvent> {
    if (request.question === '__provider_failure__') throw new LlmProviderError('UPSTREAM', 'Deterministic E2E provider failure.');
    yield { type: 'delta', text: 'The return window is thirty days.' };
  }
}

export default async function globalSetup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !new URL(url).pathname.endsWith('_test')) throw new Error('Playwright requires TEST_DATABASE_URL pointing to a disposable PostgreSQL database ending in _test.');
  process.env.DATABASE_URL = url;
  const { default: dataSource } = await import('../api/src/database/data-source');
  const source: DataSource = dataSource;
  await source.initialize();
  try {
    await source.runMigrations();
    await source.query('TRUNCATE TABLE citations, messages, conversations, document_chunks, documents, sessions, users CASCADE');
    await createInitialAdmin(source, 'support.e2e.admin', adminPassword);
  } finally {
    await source.destroy();
  }
}
