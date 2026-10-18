# Nx Customer Support Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a complete internal customer-support assistant in an Nx monorepo with Angular, NestJS, PostgreSQL, real username/password accounts, document ingestion, grounded streaming chat, citations, and durable history.

**Architecture:** Replace the runtime Express/SQLite demo with an integrated Nx workspace containing one Angular app and one modular NestJS API. PostgreSQL via TypeORM is the durable store; browser-safe API contracts are separated from server entities; document and LLM providers sit behind interfaces; local PostgreSQL and file storage support development.

**Tech Stack:** Node 24.21.x; Nx 23.3.0; Angular 22.2.3; NestJS 11.2.7; TypeScript 6.0.3; PostgreSQL; TypeORM; Nx Jest/Vitest test runners; Playwright for end-to-end tests. Pin exact patch versions and commit `package-lock.json`; keep all `nx`/`@nx/*` versions synchronized. Angular 22.2.3 is selected because npm audit identified a high-severity advisory affecting Angular Router before 22.2.0; Nx 23.3 supports current Angular versions.

**Spec:** `docs/superpowers/specs/2026-10-18-nx-customer-support-product-design.md`

## Global Constraints

- “This is a modular monolith for one organization. It is not a customer-facing support portal or a microservices platform.”
- “Login uses a unique username and password. Passwords are stored using a modern adaptive password hash; plaintext passwords are never persisted or logged.”
- “Optional seeded demo accounts may be provided only in development/test environments. They are not a production authentication mode and production startup must not create known default credentials.”
- “PostgreSQL is the durable source of truth. TypeORM entities and versioned migrations define relational schema changes.”
- “Document storage is behind an interface. Local filesystem storage is for development; production storage is configured explicitly.”
- “Provider credentials remain server-side. Tests use a deterministic fake provider; no real provider credential is required for local tests.”
- “Use secure, HTTP-only, same-site session cookies with CSRF protection for browser-authenticated state-changing requests. Do not put bearer/session credentials in localStorage.”
- “Chat streams over SSE using `fetch` with cookie credentials.”
- “Start with PostgreSQL full-text search over extracted chunks, with deterministic ranking and bounded context assembly.”
- “Secrets come from environment/configuration and are excluded from source control.”
- “No cloud deployment, public customer portal, SSO integration, billing, email workflows, or multi-organization tenancy is required for v1.”
- Add no production default credentials or real provider keys to source, fixtures, logs, or screenshots.
- Each task ends with the listed verification and a separate conventional commit; do not combine task commits.

## Review Focus

- **Untrusted file input:** spoofed MIME, traversal filenames, oversized and malformed documents must fail without writing outside configured storage. Pin in Task 4 upload and extraction tests.
- **Authentication abuse:** wrong passwords, disabled users, expired/revoked cookies, and login throttling must not grant a session. Pin in Task 3 auth integration tests.
- **Cross-user access:** guessing another user's conversation/message/document identifier must not disclose or mutate it. Pin in Tasks 3 and 6 API tests.
- **Streaming interruption:** client disconnect/provider error must leave an accurately failed/incomplete message and must not produce a completed event. Pin in Task 6 chat-stream tests.
- **Untrusted retrieved text:** prompt injection in a document and empty/irrelevant retrieval must not be represented as verified grounded answers. Pin in Task 5 retrieval/answer-policy tests.

---

## File Map

The exact generated Angular/Nest project filenames will follow the selected Nx generators, then be committed as generated. Keep application behavior in focused feature modules.

- `package.json`, `package-lock.json`, `nx.json`, `tsconfig.base.json`, `eslint.config.*`, `.gitignore`: workspace scripts, pinned dependencies, task graph, TypeScript aliases, lint, and ignored runtime data.
- `apps/api/src/main.ts`, `apps/api/src/app/app.module.ts`: HTTP bootstrap, security middleware, global validation/error handling, and root module composition.
- `apps/api/src/app/{auth,users,documents,conversations,chat,retrieval,health}/`: feature modules, controllers, services, guards, repositories, entities, and DTOs grouped by domain.
- `apps/api/src/database/{data-source,migrations}/`: TypeORM configuration and versioned schema migrations.
- `apps/api/src/storage/`, `apps/api/src/llm/`: document-storage and model-provider interfaces with local/dev and fake/test implementations.
- `apps/api/test/`: Nest HTTP integration tests using PostgreSQL and deterministic adapters.
- `apps/web/src/app/{core,auth,admin,chat}/`: session-aware shell, login, user/document administration, conversation list, streaming chat and citations.
- `libs/api-contract/src/`: OpenAPI source/spec plus browser-safe request/response and event contracts. Do not export TypeORM models.
- `apps/web-e2e/`: Playwright flows for login, authorization, upload, chat, citations, history, and errors.
- `docker-compose.yml`, `.env.example`: local PostgreSQL only and safe configuration template.
- `docs/product/architecture.md`, `docs/product/development.md`, `docs/product/api.md`, `docs/product/security.md`, `docs/product/testing.md`, `docs/product/operations.md`: maintained implementation/runbook docs, extended in the owning task.
- Existing `src/`, `frontend/`, `artifacts/`, and legacy root scripts remain as a read-only migration reference until the new product passes acceptance; remove/retire them only in the final migration task with a documented decision and tests.

## Task 1: Bootstrap the Nx workspace and local development environment

**Files:** workspace root config/package files; generated `apps/web`, `apps/api`; `docker-compose.yml`; `.env.example`; `.gitignore`; `docs/product/architecture.md`; `docs/product/development.md`.

**Interfaces:** Produces Nx project names `web`, `api`, Nx commands `serve`, `build`, `lint`, `test`, and local PostgreSQL service `postgres` for later tasks.

- [x] **Step 1: Pin a compatible toolchain.** Verify official Nx Angular matrix and Angular runtime compatibility. Use Nx 23.3.0, Angular 22.2.3, NestJS 11.2.7, Node 24.21.x and TypeScript 6.0.3; record exact patch versions in the lockfile and version rationale in `docs/product/architecture.md`.
- [x] **Step 2: Create the integrated workspace skeleton.** Generate Angular `apps/web` and NestJS `apps/api`; align every `@nx/*` package version; enable strict TypeScript and lint/test/build targets; add root scripts forwarding to `nx`.
- [x] **Step 3: Configure PostgreSQL for local development.** Add Compose health check, persistent named volume, safe `.env.example`, ignored local env/runtime uploads, and documented start/stop/reset commands. Do not add credentials to tracked defaults beyond disposable local-only values.
- [x] **Step 4: Write failing health smoke tests.** Add an API integration test for `GET /api/v1/health` returning readiness status and a web smoke test for the Angular root shell. Run and verify failure because the routes are not implemented.
- [x] **Step 5: Implement basic health/readiness.** Add public API health/readiness controller that reports database readiness without leaking configuration; ensure Angular shell renders at root. Run focused tests and expect both to pass. (The route currently provides liveness; database-backed readiness is deferred until the database provider lands in Task 2.)
- [x] **Step 6: Verify workspace baseline.** Run `npm ci`, `npx nx show projects`, `npx nx run-many -t lint test build`, and `docker compose config`; expected: both apps are discovered and all generated targets pass. (Docker CLI is unavailable here; Compose YAML parsing passed, and `docker compose config` remains to verify in a Docker-enabled environment.)
- [ ] **Step 7: Commit.** `git add package.json package-lock.json nx.json tsconfig.base.json eslint.config.* apps libs docker-compose.yml .env.example .gitignore docs/product/architecture.md docs/product/development.md` then `git commit -m "build: bootstrap Nx Angular and Nest workspace"`.

## Task 2: Establish PostgreSQL schema, migrations, and safe initial Admin setup

**Files:** `apps/api/src/database/**`, entities under `apps/api/src/app/{users,auth,documents,conversations}/`, `apps/api/src/cli/bootstrap-admin.ts`, migration scripts, PostgreSQL test config, `apps/api/test/database/**`, `docs/product/development.md`, `docs/product/architecture.md`.

**Interfaces:** Produces `User`, `Session`, `Document`, `DocumentChunk`, `Conversation`, `Message`, and `Citation` entities/repositories with schema and ownership indexes. Bootstrap command accepts username and a hidden password prompt; it creates the first Admin only and refuses to run when an Admin already exists.

- [x] **Step 1: Write migration contract tests.** Assert empty PostgreSQL migrates to all required tables/constraints, down/up migration behavior is deterministic, username normalization is unique, and foreign-key delete policy matches the spec.
- [x] **Step 2: Run the tests and verify failure.** Expected: missing migration/entity/table errors against the test database.
- [x] **Step 3: Implement entities and migrations.** Add explicit enums/statuses, foreign keys, timestamps, uniqueness, ownership/order/expiry/status indexes, and document-citation invalidation semantics. Store only a password hash field.
- [x] **Step 4: Implement initial Admin bootstrap.** Add an explicit command with interactive hidden password entry and adaptive Argon2id hash; fail safely if run in production without interactive secret input or if initial Admin already exists. Never seed a known password.
- [x] **Step 5: Verify schema/bootstrap tests.** Run the migration integration suite against PostgreSQL, including empty DB and duplicate username/second-bootstrap rejection. Expected: all pass and no plaintext password is present in DB.
- [x] **Step 6: Document and commit.** Explain migration and bootstrap workflow in development docs; commit `feat: add PostgreSQL schema and admin bootstrap`.

## Task 3: Implement real authentication, sessions, user administration, and authorization

**Files:** `apps/api/src/app/auth/**`, `apps/api/src/app/users/**`, `apps/api/src/app/app.module.ts`, `apps/api/src/main.ts`, `apps/api/test/auth/**`, `apps/api/test/users/**`, `libs/api-contract/src/auth/**`, `docs/product/security.md`, `docs/product/api.md`.

**Interfaces:** `POST /api/v1/auth/login { username, password }`; `POST /api/v1/auth/logout`; `GET /api/v1/auth/session`; Admin-only `GET/POST/PATCH /api/v1/users`. Browser session uses opaque random cookie; DB stores only its hash. Session response includes user id, normalized username, role, and CSRF token. Protected writes require matching CSRF header.

- [ ] **Step 1: Write failing API tests.** Cover valid/invalid login, generic credential errors, disabled user rejection, no session cookie on failure, cookie flags, hash-only session persistence, session expiry/revocation/logout, CSRF denial, login throttling, Admin account provisioning, and Agent-forbidden user management.
- [ ] **Step 2: Run the tests and verify failure.** Expected: routes/guards/session behavior do not exist.
- [ ] **Step 3: Implement password and session services.** Argon2id password hashes; cryptographically random opaque token; hash token at rest; rotation on login; expiry/revocation; HTTP-only, same-site cookie; secure flag in production; server-side session validation.
- [ ] **Step 4: Implement authentication and role guards.** Add validated DTOs, normalized usernames, generic login errors, CSRF token lifecycle/header check, login rate limiting, and API-level role enforcement. Ensure production startup never seeds demo identities.
- [ ] **Step 5: Implement Admin user management.** Create Agent/Admin accounts, activate/deactivate, change role with last-Admin safety, and never return hashes. Require fresh authorization on every request.
- [ ] **Step 6: Verify and document.** Run auth/user PostgreSQL integration tests and lint/typecheck; document cookie/CSRF/error contract and safe account setup. Expected: all authentication/session/user-management cases pass; conversation owner-isolation cases are verified in Task 6.
- [ ] **Step 7: Commit.** `git commit -am "feat: add username password auth and role access"` (include new files explicitly with `git add`).

## Task 4: Implement secure document upload, extraction, storage, and indexing lifecycle

**Files:** `apps/api/src/app/documents/**`, `apps/api/src/storage/**`, `apps/api/src/app/retrieval/chunking/**`, document migrations if needed, `apps/api/test/documents/**`, `docs/product/api.md`, `docs/product/security.md`.

**Interfaces:** Admin-only multipart `POST /api/v1/documents`; authenticated `GET /api/v1/documents`; Admin-only `POST /api/v1/documents/:id/retry` and `DELETE /api/v1/documents/:id`. Storage adapter exposes `put(stream, metadata)`, `open(key)`, and `delete(key)`. Extraction returns page/section-aware text; chunking returns ordinal text and source metadata. Use a configurable 20 MiB limit for v1 and accepted PDF, TXT, Markdown formats.

- [ ] **Step 1: Write failing upload/extraction tests.** Include valid PDF/TXT/Markdown, spoofed MIME/magic, empty/malformed PDF, over-limit file, traversal filename, duplicate checksum behavior, extractor failure/retry, storage failure cleanup, Admin-only denial, and safe deletion invalidating future retrieval citations.
- [ ] **Step 2: Run the tests and verify failure.** Expected: upload routes and storage adapters are absent.
- [ ] **Step 3: Implement storage and validation.** Use generated opaque storage keys, canonical configured local root, verify resolved paths stay under root, enforce size/type using bytes and parser validation, never trust original filename as path, and clean up partial writes.
- [ ] **Step 4: Implement extraction, chunking, and status lifecycle.** Persist `processing`, extract with maintained parsers, create bounded overlapping chunks with page/section metadata, index transactionally, set `indexed` or sanitized `failed` error; retry is idempotent.
- [ ] **Step 5: Verify document tests and API contract.** Run PostgreSQL integration suite; assert no malformed input wrote outside storage root, status transitions are accurate, and deletion preserves historical message text while removing retrieval eligibility.
- [ ] **Step 6: Document and commit.** Document formats, 20 MiB cap, storage configuration and retention; commit `feat: add secure document ingestion`.

## Task 5: Implement PostgreSQL retrieval and grounded LLM provider boundary

**Files:** `apps/api/src/app/retrieval/**`, `apps/api/src/llm/**`, `apps/api/src/app/chat/answer-policy.ts`, retrieval migrations/indexes, `apps/api/test/retrieval/**`, `apps/api/test/llm/**`, versioned fixtures under `apps/api/test/fixtures/knowledge/`, `docs/product/architecture.md`, `docs/product/testing.md`.

**Interfaces:** `LlmProvider.stream({ system, question, context, signal }): AsyncIterable<ProviderEvent>`; fake provider deterministic in tests. Retrieval accepts query and returns at most 5 ranked chunks with source/page metadata. Answer policy returns evidence-required instructions and an insufficient-evidence result when no chunk clears the configured threshold. Provider config is server-only.

- [ ] **Step 1: Write failing retrieval/provider tests.** Test deterministic rank/tie-break, no deleted/failed document chunks, bounded context, no-results threshold, injection text treated as untrusted source data, provider timeout/error/cancel, fake provider stream, and absence of provider credential from browser bundle/log payload.
- [ ] **Step 2: Run the tests and verify failure.** Expected: retrieval/provider interfaces are missing.
- [ ] **Step 3: Implement PostgreSQL full-text retrieval.** Use a migration-defined language-aware `tsvector` or generated search column, parameterized `websearch_to_tsquery`, stable rank plus id tie-break, top 5, and bounded context assembly. Keep retrieval behind repository/service APIs.
- [ ] **Step 4: Implement LLM boundary and answer policy.** Add provider interface/configuration and deterministic fake. Mark retrieved text as untrusted data in model instructions; require citations for factual claims; return no-evidence response without calling provider when retrieval is empty/under threshold; honor cancellation and timeout.
- [ ] **Step 5: Verify and document.** Run retrieval tests and versioned evaluation corpus assertions for relevant chunk, source and page citation; expected: known questions retrieve expected sources and empty corpus gives abstention.
- [ ] **Step 6: Commit.** `git commit -am "feat: add grounded PostgreSQL retrieval"` (include new files explicitly).

## Task 6: Implement durable conversations and streaming chat API

**Files:** `apps/api/src/app/conversations/**`, `apps/api/src/app/chat/**`, `libs/api-contract/src/chat/**`, `apps/api/test/chat/**`, `apps/api/test/conversations/**`, `docs/product/api.md`, `docs/product/testing.md`.

**Interfaces:** Authenticated users can `GET/POST /api/v1/conversations`, `GET/DELETE /api/v1/conversations/:id`, `GET /api/v1/conversations/:id/messages`; users see only owned conversations. `POST /api/v1/chat` accepts `{ conversationId?, message, requestId }`. SSE event schemas: `message.started`, `message.delta`, `citations`, `message.completed`, `message.failed`; all include conversation/message ids and stable JSON data. `requestId` is unique per user and idempotent.

- [ ] **Step 1: Write failing API/stream tests.** Test owner isolation on every conversation/message endpoint, create/list/archive/delete behavior, request idempotency, persisted user message before generation, citations mapped to stored chunks, exact successful event order, arbitrary byte chunk parsing, provider error, client disconnect/cancel, and no completion event for partial failure.
- [ ] **Step 2: Run the tests and verify failure.** Expected: persisted conversations and chat event contract are missing.
- [ ] **Step 3: Implement conversation service.** Enforce ownership in repository query predicates, persist title/created/updated fields, messages and status, and explicit retention/delete behavior. Never authorize based on frontend role alone.
- [ ] **Step 4: Implement chat orchestration and SSE controller.** Save the user message before retrieval/provider call; stream validated deltas; emit citations from retrieved chunks; transactionally finalize assistant message/citations; mark interrupted or failed output accurately; cancel upstream provider on disconnect; idempotency prevents duplicate user turns.
- [ ] **Step 5: Verify and document.** Run chat/conversation integration tests against PostgreSQL and fake LLM; expected: restart persistence and cross-owner denial pass, failures stay non-completed.
- [ ] **Step 6: Commit.** `git commit -am "feat: persist conversations and stream grounded chat"` (include new files explicitly).

## Task 7: Build Angular authentication shell and Admin workflows

**Files:** `apps/web/src/app/core/**`, `apps/web/src/app/auth/**`, `apps/web/src/app/admin/users/**`, `apps/web/src/app/admin/documents/**`, `apps/web/src/app/app.routes.ts`, contract types under `libs/api-contract/src/**`, `apps/web/src/app/**/*.spec.ts`, `docs/product/api.md`.

**Interfaces:** Angular session service calls auth routes with `withCredentials`; state is in memory and restored from `/auth/session`, never localStorage. Mutating requests include CSRF token. Role-aware routes are for UX only; API remains authoritative. Admin UI provides user create/activate/role management and document upload/status/retry/delete.

- [ ] **Step 1: Write failing Angular tests.** Cover login form validation, generic login failure, session restore, logout, CSRF header, route behavior by role, user management states, upload progress/status/retry, and visible permission/error states.
- [ ] **Step 2: Run tests and verify failure.** Expected: product login/admin routes and session client are absent.
- [ ] **Step 3: Implement accessible application shell and auth.** Build responsive navigation, username/password form with keyboard labels, errors, loading, session restore, and logout. Do not store credential or CSRF secret in localStorage.
- [ ] **Step 4: Implement Admin user/document screens.** Connect API contract, validate upload UX, report processing states and retry/delete results; ensure Agent sees no Admin controls.
- [ ] **Step 5: Apply Impeccable UX review and verify.** Run Angular tests, lint and production build; check keyboard-only flow, focus management, responsive states and accessible live updates.
- [ ] **Step 6: Document and commit.** Add UI/session behavior to product docs and commit `feat: add Angular auth and admin workspace`.

## Task 8: Build Agent chat, citation and conversation-history experience

**Files:** `apps/web/src/app/chat/**`, `apps/web/src/app/core/sse/**`, `libs/api-contract/src/chat/**`, `apps/web/src/app/**/*.spec.ts`, `apps/web-e2e/src/**`, `docs/product/testing.md`.

**Interfaces:** Chat client sends `POST /api/v1/chat` with cookie credentials and CSRF header; SSE parser consumes event schemas from Task 6. Conversation client lists/reopens user-owned history. UI exposes answer status and citations as source/page links.

- [ ] **Step 1: Write failing UI tests.** Cover conversation create/reopen, streaming text split at every event boundary, citation source display, insufficient evidence, empty/loading/error states, failed/interrupted answer, duplicate-submit prevention, and role-aware navigation.
- [ ] **Step 2: Run tests and verify failure.** Expected: Agent workflow and SSE parser are absent.
- [ ] **Step 3: Implement SSE parser and chat client.** Parse CRLF/LF SSE framing across arbitrary chunks, handle abort and failed events, update partial UI without treating it as completed, and pass stable request id for idempotency.
- [ ] **Step 4: Implement conversation and citation UI.** Persist/reopen histories, show source and page/section, communicate evidence absence clearly, and retain useful local draft only when safe.
- [ ] **Step 5: Verify UI tests and accessibility.** Run focused Angular tests; check stream announcement behavior and keyboard navigation without announcing every token noisily.
- [ ] **Step 6: Commit.** `git commit -am "feat: add agent chat and conversation history"` (include new files explicitly).

## Task 9: Complete end-to-end acceptance, operations, and migration closeout

**Files:** `apps/web-e2e/**`, `playwright.config.*`, root CI workflow, `docs/product/{development,security,testing,operations,api,architecture}.md`, `.env.example`, root README and legacy entrypoints as required by migration decision.

**Interfaces:** One documented clean-checkout workflow starts PostgreSQL, migrates, bootstraps first Admin, serves API/web, runs tests, and builds production artifacts. The existing Express app is no longer the default product run target; preserve repository history and document whether reference source is archived or removed.

- [ ] **Step 1: Write failing Playwright acceptance flows.** Cover Admin bootstrap/login, create Agent, Agent login, upload a real fixture, ask a fixture-backed question, streaming citations, persisted history after reload, Agent denied Admin routes, cross-user conversation denial, invalid upload, provider failure, and logout/session expiry.
- [ ] **Step 2: Run E2E tests and verify meaningful failures.** Expected: missing workflows or incomplete API/UI behavior; use deterministic provider and test PostgreSQL.
- [ ] **Step 3: Complete CI and operational documentation.** CI runs install, lint, typecheck, unit/integration/e2e tests, migrations on clean PostgreSQL, and production builds. Document config, safe Admin bootstrap, backup/restore assumptions, storage paths, logs/redaction, and no-cloud deployment boundary.
- [ ] **Step 4: Decide and complete legacy migration closeout.** Confirm new app is the default README/run command. Remove obsolete Express runtime from default commands only after all acceptance flows pass; preserve historical workshop evidence and reference behavior notes.
- [ ] **Step 5: Run clean-checkout verification.** From clean install run `npm ci`, `docker compose up -d postgres`, migration, interactive Admin bootstrap, `npx nx run-many -t lint test build`, and Playwright E2E. Expected: all green; inspect Git for keys and generated uploads.
- [ ] **Step 6: Commit.** Commit CI, docs and migration closeout as `chore: verify and document full product workflow`.

## Coverage Self-Review

- Real username/password login, session lifecycle, provisioning and role enforcement: Task 2, Task 3, Task 7, Task 9.
- Document storage, validation, extraction, indexing, status, retry, delete: Task 4, Task 7, Task 9.
- PostgreSQL full-text retrieval, evidence policy, provider boundary and evaluation corpus: Task 5.
- Persisted conversations/messages/citations, SSE semantics, failure handling and owner isolation: Task 6, Task 8, Task 9.
- Nx setup, pinned compatible toolchain, local PostgreSQL, migrations, bootstrap, commands and docs: Tasks 1, 2, 9.
- Security, accessibility, tests, CI, operations, and secret handling: Tasks 1–9, with final integrated verification in Task 9.
- Review Focus risks are explicitly pinned to tests in Tasks 3–6.

## Compatibility References

- Nx Angular compatibility: https://nx.dev/docs/kb/angular-nx-version-matrix
- Angular runtime compatibility: https://angular.dev/reference/versions
- Nx NestJS support: https://nx.dev/docs/technologies/node/nest/introduction
