# Testing and Retrieval Evaluation

## Commands

- `npm test`: run Angular and API unit/integration suites.
- `npm run test:api`: run only the API suites.
- `npm run test:legacy`: preserve the original Express demo smoke tests.
- `npx nx run-many -t lint test build`: run the full Nx quality gate. `npm test` and `npm run test:api` wrap the Jest command to enable Node VM modules for the PDF.js worker.

PostgreSQL integration tests require `TEST_DATABASE_URL` to point to a dedicated disposable database whose name ends in `_test`. They apply TypeORM migrations and truncate only the known application tables. Do not point this variable at a developer, shared, staging, or production database. Tests do not run schema synchronization.

## Test boundaries

- Retrieval integration tests validate the actual PostgreSQL trigger/vector, lexical matching plus exact-substring fallback when the parser yields no lexemes, parameterized queries, rank ordering, deterministic UUID tie-breaks, five-result cap, page/section metadata, and exclusion of failed/deleted documents.
- Answer-policy tests validate threshold abstention, evidence-required instructions, bounded JSON context, safe citations, and treatment of retrieved text as untrusted data.
- Provider tests use `FakeLlmProvider` or mocked HTTP streams. They cover deltas, secret placement, server errors, cancellation, timeouts, and malformed/oversized streams without a live model account.
- The versioned evaluation set lives in `apps/api/test/fixtures/knowledge/evaluation-cases.json` with its source documents. Each question identifies expected source evidence and includes a no-evidence case; these tests measure retrieval coverage, not model fluency. Add or update cases whenever the retrieval schema, chunking, or search behavior changes.
