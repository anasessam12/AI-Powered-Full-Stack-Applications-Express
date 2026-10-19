# Implementation Log

This log records implementation checkpoints and verification evidence as the product is built from the approved spec. Each implementation task is committed separately.

## Task 1 — Nx workspace and local development baseline

**Status:** Complete; commit `build: bootstrap Nx Angular and Nest workspace`.

**Delivered:** Nx integrated workspace with `web` (Angular 22.2.3) and `api` (NestJS 11.2.7), synchronized Nx 23.3.0 plugins, Node 24.21.0 / TypeScript 6.0.3 pins, root Nx commands, a versioned `/api/v1/health` endpoint, Angular root shell, PostgreSQL 18.6 Compose service, safe local environment template, and architecture/development documentation. The original Express app remains available as a migration reference.

**Verification:** `npm ci` succeeded; `npx nx show projects` discovers `api`, `web`, and the root package; `npx nx run-many -t lint test build --skip-nx-cache` succeeded (API and web targets); `npm run lint`, `npm test`, and `npm run build` succeeded; `npm run test:legacy` passed 4/4 tests; `npm audit --omit=dev` reported zero vulnerabilities; Compose YAML parsed successfully; `git diff --check` reported no whitespace errors.

**Environment limitation:** Docker Compose could not be executed because Docker CLI is not installed on this machine. The YAML was parsed locally; run `docker compose config` and start the PostgreSQL service in a Docker-enabled environment.

**Security finding:** Full `npm audit` reports 39 development/transitive findings (30 moderate, 9 high, no critical); the production dependency audit is clean. Several Nx/build-tool advisories have no available non-breaking fix. No forced major upgrades were applied; recheck during dependency upgrades and CI setup.

**Ruling:** Nx inferred the root package's legacy `lint` target and caused recursive `run-many` execution. Set `package.json` `nx.includedScripts` to an empty list so Nx does not infer root package scripts. Nx still infers root ESLint for the legacy `src` tree; that target passes with one existing unused-parameter warning.

**Scope note:** The initial health route is a liveness check. PostgreSQL-backed readiness is completed with database configuration/migrations in Task 2, because no database provider exists in the Task 1 skeleton.

## Task 2 — PostgreSQL schema, migrations, and initial Admin bootstrap

**Status:** Complete; commit `feat: add PostgreSQL schema and admin bootstrap`.

**Delivered:** Added TypeORM entities and a versioned migration for users, sessions, documents/chunks, conversations/messages, and citations. The schema enforces normalized username uniqueness, role/status constraints, a composite FK binding messages to their conversation owner, ownership/order/expiry indexes, conversation/message idempotency indexes, and explicit cascade/restrict/set-null policies. `npm run db:migrate` and `npm run db:revert` run the TypeORM CLI with a dedicated CommonJS TypeScript configuration. `npm run admin:create` interactively collects and confirms a hidden password, stores an Argon2id hash, serializes first-admin attempts with a PostgreSQL advisory lock, and rejects a second Admin. `/api/v1/health` now checks PostgreSQL and returns a safe 503 body when it is unavailable.

**Verification:** `npm ci` succeeded. Full Nx lint/test/build succeeded; API tests passed 10/10 against a temporary isolated PostgreSQL 18 cluster, including normalized username uniqueness, rejection of cross-user message ownership, migration down/up, citation retention after document deletion, and conversation deletion cascades. The legacy Express suite passed 4/4. `npm audit --omit=dev` reported zero vulnerabilities. `npm run db:revert` then `npm run db:migrate` succeeded on a disposable `*_test` database. The real Admin CLI created a temporary test user; SQL inspection confirmed an `$argon2id$` hash and no plaintext match. A running Nest API returned `{"status":"ok","database":"up"}`. A fresh database migrated without installing `uuid-ossp` (TypeORM extension installation is disabled).

**Environment note:** Docker remains unavailable. A temporary PostgreSQL cluster was initialized within the ignored worktree `var/` directory using the installed PostgreSQL 18 binaries and was bound to localhost only; the repository's existing PostgreSQL service and data were not changed.

**Ruling:** Scope `test:legacy` to the two existing JavaScript test files. Node 24's default test discovery included the new PostgreSQL TypeScript integration test under `apps/api/test`, then attempted to run it without Jest/TypeScript module handling. The application suites remain separated: Nx/Jest for the new API and Node test runner for the archived Express reference.

## Task 3 — Username/password authentication and role access

**Status:** Complete; commit `feat: add username password auth and role access`.

**Delivered:** Added login, session restore, logout, CSRF and role guards, cookie-backed opaque sessions (only token hashes persist), credential throttling, validated login/user DTOs, normalized usernames, and Admin-only user listing/provisioning/role/status updates with last-Admin protection. Passwords use Argon2id. Safe browser-facing contracts live in the Nx `api-contract` library; API and security behavior are documented.

**Verification:** PostgreSQL-backed API integration suite passed 16/16 tests against the isolated `customer_support_task3_test` database; API lint passed. Full `npx nx run-many -t lint test build --skip-nx-cache --outputStyle=static` passed for four projects (the first broad run without a test database skipped DB-dependent suites; the explicit database run passed all 16). Legacy Express tests passed 4/4; `npm audit --omit=dev` reported zero vulnerabilities; `git diff --check` was clean.

**Security coverage:** Tests verify generic credential errors, disabled and expired sessions, HttpOnly/SameSite cookie flags, token hashing at rest, CSRF enforcement, Admin role checks, account activation/role changes, last-Admin safety, logout revocation, and throttle responses.

## Task 4 — Secure document upload, extraction, storage, and indexing

**Status:** Complete; commit `feat: add secure document ingestion`.

**Delivered:** Added an authenticated document API for Admin upload/retry/delete and session-only listing. The local `DocumentStorage` adapter generates UUID keys under a configured root and applies private file permissions. Upload validation enforces a configurable cap up to 20 MiB, safe basenames, matching extension/MIME, PDF signature, strict UTF-8, and duplicate SHA-256 prevention with a database unique index. PDF uses the maintained `pdf-parse` 2.4.5 API with JavaScript evaluation disabled and page-wise extraction; TXT/Markdown preserve section headings. Text is stored as bounded overlapping chunks with page/section metadata. Failures retain a sanitized `FAILED` record for retry; deletion removes the document and cascaded chunks while database FKs preserve historical citation snapshots. API, security, architecture, environment, and development documentation now cover the lifecycle.

**Verification:** Full Nx tests passed (29 API tests and 1 web test), including valid PDF/TXT/Markdown, malformed PDF, spoofed MIME, traversal filename, configured oversize, duplicate checksum, Admin-only access, retry, storage failure compensation, and physical file deletion. Chunker/storage unit tests passed. Full Nx lint/build passed; legacy Express tests passed 4/4 after adapting its parser to v2; `npm audit --omit=dev` reported zero vulnerabilities; `git diff --check` was clean. The compiled Nest production target started against the isolated PostgreSQL database, `/api/v1/health` returned database-ready, and an authenticated PDF upload returned `201` with status `INDEXED`.

**Ruling:** Upgrade `pdf-parse` from the legacy v1 API to current 2.4.5 before parsing untrusted customer files. Version 2 uses PDF.js's ESM worker, so Jest needs Node VM modules; `scripts/run-tests.cjs` enables the Node flag cross-platform for `npm test` and `npm run test:api`. The legacy Express PDF flow was updated to v2 and still passes its smoke test. Keep API/database integration tests on a dedicated `TEST_DATABASE_URL` ending in `_test`.

## Task 5 — Grounded PostgreSQL retrieval and LLM provider boundary

**Status:** Complete; committed as `feat: add grounded PostgreSQL retrieval`.

**Delivered:** Added a migration-managed `tsvector` update trigger, parameterized PostgreSQL `websearch_to_tsquery` retrieval with stable rank/UUID ordering and a five-chunk maximum, plus a bounded exact-substring fallback when PostgreSQL produces no lexemes for a query. Retrieval excludes failed/deleted documents and returns source/page/section metadata. Added `AnswerPolicy` with a configurable evidence threshold, bounded JSON context, untrusted-source instruction, explicit citations, and a no-evidence abstention path. Added the `LlmProvider` interface, deterministic fake, and OpenRouter SSE adapter with server-only credentials, safe errors, timeout/cancellation handling, and response caps. Added a versioned knowledge/evaluation corpus and testing, architecture, development, and security documentation.

**Verification:** Full Nx test run passed (41 API tests and 1 web test), including PostgreSQL integration coverage for ranking, deterministic tie ordering, five-result cap, deleted/failed exclusion, Arabic exact-substring fallback, and the versioned evaluation cases. Full Nx lint/build passed; the legacy Express tests passed 4/4; `npm audit --omit=dev` reported zero vulnerabilities; `git diff --check` was clean. No live LLM credentials were needed.

**Ruling:** PostgreSQL's built-in `simple` text-search parser yielded no lexemes for the Arabic test query. Keep lexical search for parsed terms and use a parameterized exact-substring fallback only when `numnode(tsquery) = 0`; record the language limitation and fallback in architecture/testing docs.

## Task 6 — Durable conversations and streaming chat API

**Status:** Complete; committed as `feat: persist conversations and stream grounded chat`.

**Delivered:** Added authenticated create/list/get/archive/delete conversation routes and owner-scoped, ordered message history with safe citation snapshots. Added cookie/CSRF-protected `POST /api/v1/chat`, whose SSE contract is shared through `libs/api-contract`. Chat persists the user and pending assistant messages before retrieval/provider work, supports server-created conversations, safely replays completed `requestId`s, and rejects changed-content reuse. It streams deltas, persists citations with the final answer, abstains without a provider call when evidence is insufficient, and records provider failures or disconnected partial output as failed/interrupted without a completion event. Added `FakeLlmProvider` injection, API/security/development/testing docs, and runtime retrieval policy configuration.

**Verification:** Full Nx tests passed (48 API tests and 1 web test), including owner isolation for read/archive/delete, CSRF enforcement, message/citation persistence and history ordering, exact event order, idempotent replay after later turns, changed-content conflict, no-evidence abstention, Arabic evidence flow, provider failure, and client disconnect after a partial delta. Full Nx lint/build passed; legacy Express tests passed 4/4; `npm audit --omit=dev` reported zero vulnerabilities; `git diff --check` was clean. Tests used a temporary UTF-8 PostgreSQL 18 cluster and deterministic fake LLM; no live provider credentials were used.

**Rulings:** Multiple messages created in one PostgreSQL transaction can share `created_at`; history adds a role tie-breaker so the user message appears before its assistant response. Assistant rows keep the originating request id in private provider metadata so replay resolves the matching answer even after later turns. Client-side arbitrary-byte SSE parsing is deferred to Task 8 with the Angular parser.

## Task 7 — Angular authentication and Admin workflows

**Status:** Complete; committed as `feat: add Angular auth and admin workspace`.

**Delivered:** In-memory cookie-session client with API restore and CSRF headers; generic username/password login; role-guarded Admin navigation; Admin user provisioning, role and activation changes; document upload, status, retry, and removal flows; mobile-aware split-flap visual direction and component-review approval. Agent navigation does not expose Admin screens. The `/chat` Agent route is explicitly interim and is replaced in Task 8.

**Verification:** Angular unit tests pass 20/20 across 7 files; production web build succeeds (371.13 kB initial raw, 94.75 kB estimated transfer); `npx nx run web:lint --skip-nx-cache` succeeds with no warnings. API-backed screens use typed contracts; loading, empty, failed, indexed, processing, retry, and validation states are represented.

**Visual review:** The in-browser component review approved both the masthead and side rail and confirmed all mapped component regions. The chosen approved comp and direction rationale are retained in `docs/product/ui-direction-task7.md`. The CLI launcher was unavailable in this shell, so browser receipt and local sources were used instead of the CLI verify command.

**Limit:** A live database-backed browser sign-in could not be validated as part of this unit/build pass; full-stack and browser acceptance remain in Task 9. Document processing status refreshes on user refresh; no automatic polling is implied.

## Task 8 — Agent chat, citations, and conversation history

**Status:** Complete; committed as `feat: add agent chat and conversation history`.

**Delivered:** Added a streaming fetch client for the cookie/CSRF-protected chat endpoint, a typed SSE parser that handles LF/CRLF and arbitrary network chunk boundaries, durable conversation create/list/reopen, and an Agent chat screen for partial, completed, abstaining, failed, and cancelled replies. Citations display source, page/section, and open the original stored document. Added an authenticated `GET /documents/:id/content` response with inline disposition, `nosniff`, sandbox CSP, and private no-store caching. Conversation history now carries the safe document id needed to open citations.

**Verification:** Angular tests pass 30/30 across 10 files; API unit tests pass 24/24. `api:build`, `web:build`, and both lint targets pass. The API integration suite reports six PostgreSQL suites skipped because `TEST_DATABASE_URL` is unset; source access is covered by unit tests and a PostgreSQL integration case for Task 9 verification. Web production build emits an `anyComponentStyle` warning for the chat component (6.96 kB against a 4 kB warning budget, below its 8 kB error budget).

**Limit:** Interactive database-backed streaming was not exercised in this shell because there is no configured `DATABASE_URL` or `TEST_DATABASE_URL`. The source links point to the authenticated API route and use the same-site session cookie.

## Task 9 — End-to-end acceptance, operations, and migration closeout

**Status:** Implemented; local database-backed acceptance verification is blocked by the absence of a PostgreSQL test service in this environment.

**Delivered:** Added Playwright flows for one-time Admin bootstrap/login, Agent provisioning, TXT upload/indexing, streamed source-cited answer, history after reload, Agent UI and API denial for Admin access, deterministic provider failure, unsupported upload, and logout. Playwright setup only accepts `TEST_DATABASE_URL` with a `_test` database suffix, applies migrations, resets application tables, and seeds a known test-only Admin. CI provisions PostgreSQL and Chromium, migrates, tests, runs browser acceptance, lints, and builds. Replaced the Express-first README with the Nx product workflow and retained the original instructions in `docs/product/legacy-express.md`. Added operations and recovery-boundary guidance.

**Verification:** `npm test`, `npm run lint`, and `npm run build` all pass. Nx recognizes the isolated `web:serve-e2e` target; Playwright parses and lists both acceptance tests; `git diff --check` is clean. Session expiry and cross-owner conversation denial remain covered by PostgreSQL API integration tests.

**Limit:** This environment has no Docker executable or accessible database credentials/service on the configured test port, so real PostgreSQL migrations and browser acceptance cannot be executed here. CI contains the clean PostgreSQL and browser path.
# Implementation log

Entries below preserve the results observed at each historical phase. The Express/SQLite runtime and its smoke tests have since been retired; see [the archive note](../history/express-demo.md). Past command names describe checks run at that time and are not current run instructions.

## Local database workflow follow-up — 2026-10-19

Added loopback-only creation for the exact `teamWorkspace` name and `_test` databases, idempotent local/test Admin and Agent fixtures, indexed sample knowledge, and cross-platform `db:*` setup scripts. Unit tests, lint, build, Playwright discovery, and documentation link checks pass. Local PostgreSQL creation and database-backed E2E remain unverified because this environment has no Docker executable and nothing is listening on `localhost:5433`; no database has been created on this machine by this follow-up.
