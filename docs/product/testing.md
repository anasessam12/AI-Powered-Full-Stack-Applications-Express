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

The Playwright global setup applies migrations, clears application tables only after confirming a loopback `_test` target, and seeds `support.e2e.admin` / `E2e-admin-password-91!` plus `support.e2e.agent` / `E2e-agent-password-121!` and four fixture documents. These credentials are test-only. The E2E API replaces OpenRouter with a deterministic provider; adding `__provider_failure__` to an evidence-backed question simulates an upstream error. Playwright runs one worker because scenarios share this disposable database. CI provisions PostgreSQL and Chromium. Locally install Chromium once with `npx playwright install chromium`.

Lexical search removes common English question words, then matches remaining terms to indexed chunks and ranks them with PostgreSQL full-text search. `RETRIEVAL_MIN_SCORE` defaults to `0.25`; lower values can admit incidental matches, so tune it against the evaluation set before changing it.

The local seed also provides `workspace.admin` / `Team-workspace-admin-2026!` and `workspace.agent` / `Team-workspace-agent-2026!` for a fresh local database. These development credentials must never be reused outside the local workspace. `npm run db:seed:local` adds documents idempotently through the same ingestion path used by uploads: `account-security.md`, `returns-policy.txt`, `exchange-policy.md`, and `billing-policy.pdf` (one page, searchable text).

Suggested manual chat prompts after signing in as the Agent:

- “What is the return window for unused items?” → `returns-policy.txt`, 30 days.
- “How long can exchanges be requested within 14 days?” → `exchange-policy.md`, 14 days.
- “What fee applies to credit card refunds?” → `billing-policy.pdf`, page 1, 2% fee.
- “What should happen if a development credential is exposed?” → `account-security.md`, change the password immediately.
- “What is the warranty period for headphones?” → should abstain because the seeded sources do not specify it.

## Test boundaries

- Retrieval integration tests validate the actual PostgreSQL trigger/vector, stop-word-filtered OR lexical matching, exact-substring fallback for empty parsed terms, parameterized queries, rank ordering, deterministic UUID tie-breaks, five-result cap, page/section metadata, and exclusion of failed/deleted documents.
- Answer-policy tests validate threshold abstention, evidence-required instructions, bounded JSON context, safe citations, and treatment of retrieved text as untrusted data.
- Provider tests use `FakeLlmProvider` or mocked HTTP streams. They cover deltas, secret placement, server errors, cancellation, timeouts, and malformed/oversized streams without a live model account.
- Conversation/chat integration tests cover owner isolation, archive/delete and message history, session/CSRF enforcement, persisted-before-provider user messages, stable SSE order, citation persistence, idempotent replay, abstention without a provider call, provider failure, and client disconnect with interrupted partial output.
- Angular chat tests cover arbitrary SSE chunk boundaries (including split CRLF and multi-line data), cookie/CSRF requests, request id forwarding, conversation create/reopen, source/page citations and source-file access, evidence abstention, duplicate-send prevention, and incomplete/failed stream states. The source route returns only active document bytes to an authenticated session with private no-store headers.
- The versioned evaluation set lives in `apps/api/test/fixtures/knowledge/evaluation-cases.json` with its source documents. Each question identifies expected source evidence and includes a no-evidence case; these tests measure retrieval coverage, not model fluency. Add or update cases whenever the retrieval schema, chunking, or search behavior changes.
