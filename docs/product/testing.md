# Testing and Retrieval Evaluation

## Commands

- `npm test`: run Angular and API unit/integration suites.
- `npm run test:api`: run only the API suites.
- `npm run db:create:test`: safely create a loopback `_test` database if absent.
- `npm run db:migrate`: apply schema to `DATABASE_URL` (point it to the test DB when running integration tests).
- `npm run db:seed:test`: add fixed test-only Admin/Agent accounts and indexed knowledge without duplicates.
- `npm run test:e2e`: run browser acceptance flows against a dedicated PostgreSQL database and deterministic fake provider.
- `npx nx run-many -t lint test build`: run the full Nx quality gate. `npm test` and `npm run test:api` wrap the Jest command to enable Node VM modules for the PDF.js worker.

PostgreSQL integration tests require both `RUN_DATABASE_INTEGRATION=true` and `TEST_DATABASE_URL` to point to a dedicated disposable database whose name ends in `_test`. They apply TypeORM migrations and truncate only the known application tables. Do not point this variable at a developer, shared, staging, or production database. Ordinary `npm test` skips integration suites even if `.env` contains a test URL, so unit tests never connect to or modify a database accidentally; CI opts in explicitly. Tests do not run schema synchronization.

The Playwright global setup applies migrations, clears application tables only after confirming a loopback `_test` target, and seeds `support.e2e.admin` / `E2e-admin-password-91!` plus `support.e2e.agent` / `E2e-agent-password-121!` and a fixture document. These credentials are test-only. The E2E API replaces OpenRouter with a deterministic provider; `__provider_failure__` simulates an upstream error. Playwright runs one worker because scenarios share this disposable database. CI provisions PostgreSQL and Chromium. Locally install Chromium once with `npx playwright install chromium`.

## Test boundaries

- Retrieval integration tests validate the actual PostgreSQL trigger/vector, lexical matching plus exact-substring fallback when the parser yields no lexemes, parameterized queries, rank ordering, deterministic UUID tie-breaks, five-result cap, page/section metadata, and exclusion of failed/deleted documents.
- Answer-policy tests validate threshold abstention, evidence-required instructions, bounded JSON context, safe citations, and treatment of retrieved text as untrusted data.
- Provider tests use `FakeLlmProvider` or mocked HTTP streams. They cover deltas, secret placement, server errors, cancellation, timeouts, and malformed/oversized streams without a live model account.
- Conversation/chat integration tests cover owner isolation, archive/delete and message history, session/CSRF enforcement, persisted-before-provider user messages, stable SSE order, citation persistence, idempotent replay, abstention without a provider call, provider failure, and client disconnect with interrupted partial output.
- Angular chat tests cover arbitrary SSE chunk boundaries (including split CRLF and multi-line data), cookie/CSRF requests, request id forwarding, conversation create/reopen, source/page citations and source-file access, evidence abstention, duplicate-send prevention, and incomplete/failed stream states. The source route returns only active document bytes to an authenticated session with private no-store headers.
- The versioned evaluation set lives in `apps/api/test/fixtures/knowledge/evaluation-cases.json` with its source documents. Each question identifies expected source evidence and includes a no-evidence case; these tests measure retrieval coverage, not model fluency. Add or update cases whenever the retrieval schema, chunking, or search behavior changes.
