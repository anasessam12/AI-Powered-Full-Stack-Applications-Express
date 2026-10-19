# Product Cleanup, Documentation, and Local Database Implementation Plan

**Status:** Approved; implementation in progress
**Date:** 2026-10-19

> **For agentic workers:** Execute this plan task by task. Keep one commit per task, as requested. Use `superpowers:executing-plans` and verify each change before committing it.

**Goal:** Retire the unused Express demo, document every shipped implementation phase and product feature, and provide a safe one-command local PostgreSQL setup using the exact database name `teamWorkspace` with deterministic local/test fixtures.

**Architecture:** Keep the existing Nx Angular/NestJS modular monolith and TypeORM migrations. Create the mixed-case PostgreSQL database through a quoted identifier from a local-only Node/Nest CLI; keep test data behind an explicit `_test` database guard. Seed fictional users, source files, indexed chunks, and credentials only in local/test modes. Preserve workshop/design history while removing the retired Express runtime and its runnable instructions.

**Tech Stack:** Nx 23, Angular 22, NestJS 11, TypeORM 0.3, PostgreSQL 18, Node.js 24, `pg`, Jest, Playwright, Markdown/Mermaid, native local PostgreSQL service.

**Spec:** `docs/superpowers/specs/2026-10-19-product-cleanup-docs-local-db-design.md`

## Global Constraints

- The local product database name is exactly `teamWorkspace`; preserve uppercase `W` by creating it with `CREATE DATABASE "teamWorkspace"`.
- The disposable test database name ends in `_test`; default it to `teamWorkspace_test`.
- Normal local setup accepts only a loopback host and never drops a database or truncates the development database.
- Test seed/reset accepts only an explicit `_test` database.
- Fixed usernames/passwords are development/test-only. Reject local seeding under `NODE_ENV=production`; hash passwords with the existing Argon2id service.
- TypeORM migrations own schema changes; never enable schema synchronization. Keep production's interactive `admin:create` command unchanged.
- Keep workshop/design history and ignored local data. Remove active Express runtime code and stale instructions that imply it can still run.
- Commit after each implementation task using the message provided by that task.

## Review Focus

- Mixed-case database identifiers: test that the catalog contains exactly `teamWorkspace`, not `teamworkspace`.
- Remote or unexpected database URL: test local-create rejects non-loopback and test-create rejects any database name without `_test` before connecting or changing state.
- Repeat seeding: test the second seed does not duplicate users/documents or change manually changed passwords.
- File/index consistency: test stored fixture bytes match the seeded display name/checksum and retrieval returns the expected source/chunk.
- Retired entrypoints: test npm scripts and active docs no longer point to Express/SQLite runtime files while historical workshop context remains.

---

### Task 1: Remove the retired Express runtime

**Files:**
- Delete: `src/**`, `frontend/**`, `seed/knowledge_base.json`, `tests/app.test.js`, `tests/http.test.js`, `scripts/setup.js`, `IMPLEMENTATION_COMPLETE.md`
- Modify: `package.json`, `README.md`, `docs/product/{architecture,development,testing,implementation-log}.md`, `docs/project/baseline.md`, `docs/workshop/01-brief.md`
- Move and rewrite as archive: `docs/product/legacy-express.md` → `docs/history/express-demo.md`
- Keep: `scripts/run-tests.cjs`, `apps/**`, `libs/**`, `apps/web-e2e/**`, `docs/workshop/**`, `artifacts/**`

**Interfaces:** No product API changes. Keep `npm test`, `npm run test:api`, `npm run test:e2e`, `admin:create`, and migration commands. Remove `legacy:*` and `test:legacy` scripts. Keep any dependency used by NestJS, Angular, or the maintained tests, including Express types/runtime required by Nest's HTTP adapter.

- [x] **Step 1: Record the active runtime boundary.** `git ls-files` identified the legacy app files; `scripts/run-tests.cjs` remains the root `npm test` runner.
- [x] **Step 2: Run baseline verification.** `npm test`, `npm run test:legacy` (4/4), `npm run lint`, and `npm run build` passed before cleanup.
- [x] **Step 3: Remove Express-only runtime files and package scripts.** Removed the retired runtime and commands; retained shared dependencies and workshop artifacts.
- [x] **Step 4: Archive historical context and remove stale active commands.** Replaced the old guide with an archive note and updated active docs and historical labels.
- [x] **Step 5: Verify the retired app is no longer runnable or referenced by active docs.** Post-cleanup `npm test`, `npm run lint`, `npm run build`, `git diff --check` passed; the stale-reference search returned no active matches.
- [x] **Step 6: Commit.** `chore: remove retired Express demo runtime`.

### Task 2: Create exact-case local and guarded test databases

**Files:**
- Create: `apps/api/src/database/database-target.ts`
- Create: `apps/api/src/database/database-target.spec.ts`
- Create: `apps/api/src/cli/create-database.ts`
- Create: `apps/api/src/cli/create-database.spec.ts` (or exercise the exported CLI service in the database-target suite)
- Modify: `docker-compose.yml`, `.env.example`, `apps/api/src/database/data-source.ts` only if URL handling needs correction

**Interfaces:** Export `DatabaseCreationClient` with `query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>`; `resolveDatabaseTarget(mode: 'local' | 'test', env: NodeJS.ProcessEnv): { connectionUrl: string; databaseName: 'teamWorkspace' | `${string}_test` }`; and `createDatabaseIfMissing(client: DatabaseCreationClient, databaseName: 'teamWorkspace' | `${string}_test`): Promise<'created' | 'existing'>`. Test-mode names must match `^[A-Za-z0-9_]+_test$`. CLI mode `local` reads `DATABASE_URL`; mode `test` reads `TEST_DATABASE_URL`. Both connect to the maintenance database `postgres` and create only a validated, quoted identifier if absent.

- [x] **Step 1: Write failing database-target tests.** Added target, remote-host, protocol, suffix, production, exact-quoted-create, and existing-database-skip tests.
- [x] **Step 2: Run API tests and verify failure.** The new suite failed first because the resolver was missing; an added protocol guard test also failed because HTTP URLs were accepted.
- [x] **Step 3: Implement `resolveDatabaseTarget(mode, env)` in `database-target.ts`.** Requires a PostgreSQL URL, loopback host, a database name, exact `teamWorkspace` local target, `_test` test target, and non-production local mode.
- [x] **Step 4: Implement the create-if-absent CLI.** Connects to maintenance database `postgres` with bounded retries, parameterizes lookup, creates a quoted validated identifier only when absent, and closes the connection.
- [x] **Step 5: Update Compose and environment defaults.** Compose maintenance DB is `postgres`; `.env.example` targets `teamWorkspace` and `teamWorkspace_test` on port 5433 with development-only credentials.
- [x] **Step 6: Verify guards and command behavior.** `npm run test:api -- --runInBand`, `npm run build`, and `git diff --check` passed. Docker/catalog verification remains for Task 7.
- [x] **Step 7: Commit.** `feat: create guarded local PostgreSQL databases`.

### Task 3: Add repeatable local and test seed fixtures

**Files:**
- Create: `apps/api/src/database/seeds/workspace-seed.ts`
- Create: `apps/api/src/database/seeds/workspace-seed.spec.ts`
- Create: `apps/api/test/fixtures/seed/account-security.md`
- Modify: `apps/api/src/cli/create-database.ts` only to share the validated target resolver; add seed CLI `apps/api/src/cli/seed-workspace.ts`
- Modify: `apps/web-e2e/global-setup.ts`
- Modify: `apps/api/test/fixtures/seed/**` if test-only credentials or fixture manifest are needed

**Interfaces:** Export `seedWorkspace(dataSource: DataSource, mode: 'local' | 'test'): Promise<{ usersCreated: number; documentsCreated: number }>`; local mode requires exact `teamWorkspace` and loopback. Test mode requires `TEST_DATABASE_URL` with `_test`. Local usernames/passwords are `workspace.admin` / `Team-workspace-admin-2026!` and `workspace.agent` / `Team-workspace-agent-2026!`; test usernames/passwords are `support.e2e.admin` / `E2e-admin-password-91!` and `support.e2e.agent` / `E2e-agent-password-121!`. Store fixture source bytes through `DocumentStorage`, hash their bytes, save an `INDEXED` document and generated chunks, and rely on the existing search-vector trigger.

- [x] **Step 1: Write failing guard and idempotency tests.** Added production/remote/non-test guards and an isolated in-memory seed test for two Argon2id role users, one indexed source, chunk content, repeat-run counts, and password preservation.
- [x] **Step 2: Run focused tests and verify failure.** The guard suite initially failed because the seed API was missing; focused API tests now pass.
- [x] **Step 3: Implement `seedWorkspace(dataSource, mode)`.** Validates the database target and source URL before writes, creates accounts only when absent, hashes initial passwords, and persists fixture bytes/checksum/indexed document/chunks idempotently.
- [x] **Step 4: Implement the seed CLI and E2E bootstrap.** Added local/test CLI modes; Playwright validates `_test`, resets only test tables, migrates, seeds Admin/Agent/source, and stores files under `var/e2e-documents`.
- [x] **Step 5: Verify seed behavior.** API tests, lint, build, and Playwright spec discovery passed. PostgreSQL-backed integration and full Playwright execution await the local database, which was unavailable on port 5433 during this task. Added seeded Agent sign-in and source citation coverage.
- [x] **Step 6: Commit.** `feat: seed local roles and support knowledge`.

### Task 4: Write specifications for all nine completed implementation phases

**Files:**
- Create: `docs/specs/phases/phase-01-nx-foundation.md` through `phase-09-product-acceptance.md`
- Source: `docs/superpowers/plans/2026-10-19-nx-customer-support-product.md`, `docs/product/implementation-log.md`, current migrations/tests/routes

**Interfaces:** Every phase page uses the same fields: objective, delivered scope, APIs/data/UI touched, acceptance criteria, verification evidence, status/known limits, and links to feature docs/code/tests. Preserve historical results; do not claim PostgreSQL E2E passed locally.

- [x] **Step 1: Draft all nine phase specifications.** Added phase 01–09 pages in original implementation order.
- [x] **Step 2: Self-check phase coverage.** Each page states objective, delivered scope, boundaries, acceptance, historical verification, limits, and links. Phase 09 explicitly marks local DB/E2E unverified.
- [x] **Step 3: Commit the phase-spec set.** `docs: add specifications for completed product phases`.

### Task 5: Add feature docs and database relationship reference

**Files:**
- Create: `docs/product/README.md`
- Create: `docs/product/features/authentication-and-sessions.md`
- Create: `docs/product/features/user-and-role-administration.md`
- Create: `docs/product/features/document-ingestion-and-library.md`
- Create: `docs/product/features/retrieval-and-evidence.md`
- Create: `docs/product/features/llm-provider.md`
- Create: `docs/product/features/streaming-chat-and-citations.md`
- Create: `docs/product/features/conversation-history-and-ownership.md`
- Create: `docs/product/features/health-and-operations.md`
- Create: `docs/product/database.md`

**Interfaces:** Product overview links all phase and feature pages. Each feature page states user/role, journey/API contract, persistence/source-of-truth, failure behavior, security boundary, and owning tests. Database ERD tables are `users`, `sessions`, `documents`, `document_chunks`, `conversations`, `messages`, and `citations`.

- [x] **Step 1: Write the product and feature index.** Documented the single-organization product, Admin/Agent journeys, architecture, startup pointer, and phase/feature/database links.
- [x] **Step 2: Write the feature pages from implementation evidence.** Added eight feature guides using current controllers, services, contracts, storage, retrieval, and UI behavior.
- [x] **Step 3: Write the Mermaid ERD and relationship table.** Recorded the composite ownership FK, deletion behavior, nullable citation pointers and snapshots, and actual indexes.
- [x] **Step 4: Verify documentation links and schema claims.** All relative links resolve. ERD, FKs, deletion behavior, and indexes were checked against the three migrations and entity definitions.
- [x] **Step 5: Commit.** `docs: document product features and database relationships`.

### Task 6: Add package workflows and align README, CI, and local setup docs

**Files:**
- Create: `scripts/database/setup-local.cjs`
- Modify: `package.json`, `package-lock.json`, `.env.example`, `.github/workflows/ci.yml`, `README.md`, `docs/product/development.md`, `docs/product/testing.md`, `docs/product/operations.md`, `docs/product/implementation-log.md`

**Interfaces:** Add `db:create`, `db:create:test`, `db:migrate`, `db:seed:local`, `db:seed:test`, `db:setup`, `dev`, `start:api`, and `test:e2e` scripts. `db:setup` runs non-destructive exact-case database creation → migrations → local seed against native local PostgreSQL. The setup script copies `.env.example` only when `.env` is absent and uses Node child-process invocation so it works in PowerShell and CI shells.

- [x] **Step 1: Write orchestration-script tests.** Added no-overwrite, copy-if-missing, and stop-on-create/migration/seed-failure tests with an injected runner.
- [x] **Step 2: Run those tests and verify failure.** The first run failed because the setup module was missing.
- [x] **Step 3: Implement cross-platform local setup orchestration.** Copies `.env.example` only when absent; runs create, migrate, and seed sequentially and exits on the first failure. Follow-up update replaces Compose startup with native PostgreSQL and separate admin/app connection URLs.
- [x] **Step 4: Add package scripts and environment values.** Added lifecycle/create/migrate/seed/setup/API scripts and exact local/test URLs. No dependencies changed, so lockfile was not modified.
- [x] **Step 5: Update top-level and operational instructions.** README/development/testing/operations describe setup, fixed local/test users, pgAdmin host/port, native PostgreSQL, and database protections.
- [x] **Step 6: Align CI to the guarded test database.** CI now uses maintenance DB `postgres`, creates `teamWorkspace_test` before migrations, and keeps deterministic provider/Chromium flow.
- [x] **Step 7: Verify package and docs.** API tests, lint, build, Playwright `--list`, JSON parsing, documentation links, and `git diff --check` pass. `db:status` remains unavailable because Docker is not installed in this environment.
- [x] **Step 8: Commit.** `docs: add local database and product run workflows`.

### Task 7: Create the requested local database and run integrated verification

**Files:**
- Modify: `docs/product/implementation-log.md` only with verified results or a precise environment limitation
- Local-only ignored file: `.env` copied from template if missing; native PostgreSQL data is not committed

**Interfaces:** Use only `npm run db:setup` for local creation; database catalog name must equal `teamWorkspace`. Do not reset or remove any existing database.

- [x] **Step 1: Create local configuration without overwriting.** `.env` was copied from the template by the earlier setup attempt; it remains ignored and was updated to native port 5432 without printing its contents. The local administrator password still requires the machine owner's value.
- [ ] **Step 2: Create and seed PostgreSQL.** Pending: the installed PostgreSQL 18 service listens on localhost:5432, but template credentials were rejected (`28P01`). Configure the valid local `DATABASE_ADMIN_URL`, rerun `npm run db:setup`, then verify database, migrations, seeded roles, and indexed fixture.
- [ ] **Step 3: Verify app workflows and quality gates.** Unit/API tests, lint, build, and Playwright discovery pass. Database integration, app login/citation acceptance, and live E2E remain pending the administrator credential and database setup.
- [x] **Step 4: Review cleanup and secret boundary.** `git diff --check` and active-runtime scans completed; `.env` remains ignored and no local data or credentials are staged.
- [x] **Step 5: Record results and commit.** Implementation log records native PostgreSQL and the exact credential limitation. Follow-up changes are committed separately; database-creation acceptance remains pending rather than reported complete.

## Coverage Self-Review

- Legacy deletion and retained history: Task 1.
- Exact `teamWorkspace` database creation and safe lifecycle: Task 2 and Task 6.
- Admin/Agent and searchable document fixtures, idempotency, local/test isolation: Task 3.
- Nine phase specifications: Task 4.
- Feature overview, per-feature docs, and relational ERD: Task 5.
- Package run commands, environment template, CI, and clean-first-run instructions: Task 6.
- Actual local database, login/source workflows, secret boundary, and integrated verification: Task 7.

## Execution Notes

The user previously requested inline plan execution with a separate commit after each task. Continue in the existing approved worktree and do not create another worktree. The user has approved the design; this written plan still requires review before code implementation begins.
