# Product Cleanup, Documentation, and Local Database Implementation Plan

**Status:** Approved; implementation in progress
**Date:** 2026-10-19

> **For agentic workers:** Execute this plan task by task. Keep one commit per task, as requested. Use `superpowers:executing-plans` and verify each change before committing it.

**Goal:** Retire the unused Express demo, document every shipped implementation phase and product feature, and provide a safe one-command local PostgreSQL setup using the exact database name `teamWorkspace` with deterministic local/test fixtures.

**Architecture:** Keep the existing Nx Angular/NestJS modular monolith and TypeORM migrations. Create the mixed-case PostgreSQL database through a quoted identifier from a local-only Node/Nest CLI; keep test data behind an explicit `_test` database guard. Seed fictional users, source files, indexed chunks, and credentials only in local/test modes. Preserve workshop/design history while removing the retired Express runtime and its runnable instructions.

**Tech Stack:** Nx 23, Angular 22, NestJS 11, TypeORM 0.3, PostgreSQL 18.6, Node.js 24, `pg`, Jest, Playwright, Markdown/Mermaid, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-10-19-product-cleanup-docs-local-db-design.md`

## Global Constraints

- The local product database name is exactly `teamWorkspace`; preserve uppercase `W` by creating it with `CREATE DATABASE "teamWorkspace"`.
- The disposable test database name ends in `_test`; default it to `teamWorkspace_test`.
- Normal local setup accepts only a loopback host and never drops a database, truncates the development database, or removes the Compose volume.
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

- [ ] **Step 1: Write failing database-target tests.** Add `local_database_preserves_mixed_case_name`, `local_database_rejects_remote_host`, `test_database_requires_test_suffix`, `test_database_rejects_remote_host`, `create_database_uses_quoted_exact_case`, and `create_database_skips_existing_name`; assert accepted URL target names are exactly `teamWorkspace` and `teamWorkspace_test` and fake-client SQL uses the correct quoted constant.
- [ ] **Step 2: Run API tests and verify failure.** Run `npm run test:api`; expected: the new database target tests fail because the resolver is missing while existing suites continue to run.
- [ ] **Step 3: Implement `resolveDatabaseTarget(mode, env)` in `database-target.ts`.** Parse the correct URL, require loopback host (`localhost`, `127.0.0.1`, or `::1`), require exact local database name or `_test` suffix, and reject production local mode before any connection.
- [ ] **Step 4: Implement the create-if-absent CLI.** Connect with `pg` to `postgres` (retry connection for up to 60 seconds while local Compose becomes healthy), parameterize the catalog lookup, quote only validated identifiers in `CREATE DATABASE`, skip creation if the exact catalog name exists, and close the connection on success or failure.
- [ ] **Step 5: Update Compose and environment defaults.** Set the container's maintenance DB to `postgres`, keep volume `postgres_data`, default `DATABASE_URL` to host port 5433 and `/teamWorkspace`, add `TEST_DATABASE_URL` for `/teamWorkspace_test`, and preserve all local credentials as development-only placeholders.
- [ ] **Step 6: Verify guards and command behavior.** Run focused API tests and `git diff --check`; expected: all target-validation tests pass and repeated create reports already-existing databases without dropping or rewriting them. When Docker is available, verify `SELECT datname FROM pg_database WHERE datname IN ('teamWorkspace','teamworkspace')` returns only exact `teamWorkspace`.
- [ ] **Step 7: Commit.** `feat: create guarded local PostgreSQL databases`.

### Task 3: Add repeatable local and test seed fixtures

**Files:**
- Create: `apps/api/src/database/seeds/workspace-seed.ts`
- Create: `apps/api/src/database/seeds/workspace-seed.spec.ts`
- Create: `apps/api/test/fixtures/seed/account-security.md`
- Modify: `apps/api/src/cli/create-database.ts` only to share the validated target resolver; add seed CLI `apps/api/src/cli/seed-workspace.ts`
- Modify: `apps/web-e2e/global-setup.ts`
- Modify: `apps/api/test/fixtures/seed/**` if test-only credentials or fixture manifest are needed

**Interfaces:** Export `seedWorkspace(dataSource: DataSource, mode: 'local' | 'test'): Promise<{ usersCreated: number; documentsCreated: number }>`; local mode requires exact `teamWorkspace` and loopback. Test mode requires `TEST_DATABASE_URL` with `_test`. Local usernames/passwords are `workspace.admin` / `Team-workspace-admin-2026!` and `workspace.agent` / `Team-workspace-agent-2026!`; test usernames/passwords are `support.e2e.admin` / `E2e-admin-password-91!` and `support.e2e.agent` / `E2e-agent-password-121!`. Store fixture source bytes through `DocumentStorage`, hash their bytes, save an `INDEXED` document and generated chunks, and rely on the existing search-vector trigger.

- [ ] **Step 1: Write failing guard and idempotency tests.** Add `seed_refuses_production_and_remote_local_targets`, `seed_refuses_non_test_database`, and PostgreSQL integration cases `seed_creates_admin_agent_and_searchable_source` and `seed_is_repeatable_without_overwriting_passwords`; assert both role credentials verify against Argon2id hashes, two users only, one document/checksum, retrievable chunk, and unchanged password hash after rerun.
- [ ] **Step 2: Run focused tests and verify failure.** Run the seed unit suite and, with `TEST_DATABASE_URL`, the focused PostgreSQL seed integration suite; expected: missing seed API/fixture behavior fails.
- [ ] **Step 3: Implement `seedWorkspace(dataSource, mode)`.** Validate environment/database target before writes, create the two role accounts only if absent, hash create-time credentials using `hashPassword`, preserve an existing password on rerun, write the Markdown fixture using the storage adapter, and upsert indexed metadata/chunks by stable checksum without duplicates.
- [ ] **Step 4: Implement the seed CLI and E2E bootstrap.** Add `local` and `test` modes; set `DATABASE_URL` to the guarded target before importing `AppDataSource`, apply migrations only in the dedicated test setup, run `seedWorkspace`, print usernames and counts without passwords, and close the source. In Playwright global setup, retain the `_test` guard, truncate only test tables, run migrations, seed test roles/fixture, and use `var/e2e-documents` as isolated test storage.
- [ ] **Step 5: Verify seed behavior.** Run seed unit tests and available API suites; with PostgreSQL available run integration tests twice and verify counts stay stable, fixture bytes open, and retrieval cites `account-security.md`. Add a Playwright flow that signs in using the seeded test Agent and asks about the fixture so the fixed role credentials and source citation are exercised in a browser.
- [ ] **Step 6: Commit.** `feat: seed local roles and support knowledge`.

### Task 4: Write specifications for all nine completed implementation phases

**Files:**
- Create: `docs/specs/phases/phase-01-nx-foundation.md` through `phase-09-product-acceptance.md`
- Source: `docs/superpowers/plans/2026-10-19-nx-customer-support-product.md`, `docs/product/implementation-log.md`, current migrations/tests/routes

**Interfaces:** Every phase page uses the same fields: objective, delivered scope, APIs/data/UI touched, acceptance criteria, verification evidence, status/known limits, and links to feature docs/code/tests. Preserve historical results; do not claim PostgreSQL E2E passed locally.

- [ ] **Step 1: Draft all nine phase specifications.** Map original tasks in order: Nx foundation; database/auth; Admin bootstrap/user access; document ingestion; retrieval/provider boundary; durable conversations/streaming API; Angular Admin workflows; Angular Agent chat/history; final acceptance/operations/migration closeout.
- [ ] **Step 2: Self-check phase coverage.** Compare each page with its original plan task and implementation-log section; every acceptance result and known limitation must have source evidence or be explicitly labeled unverified.
- [ ] **Step 3: Commit the phase-spec set.** `docs: add specifications for completed product phases`.

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

- [ ] **Step 1: Write the product and feature index.** Explain the single-organization purpose, Admin/Agent journeys, modular monolith, current local startup, and links to all feature/spec/database pages.
- [ ] **Step 2: Write the feature pages from implementation evidence.** Use current controllers, DTOs, Angular routes, services, and tests; document actual roles, cookie/CSRF behavior, document flow, search abstention, SSE events, ownership, and source retrieval without proposing unimplemented capabilities.
- [ ] **Step 3: Write the Mermaid ERD and relationship table.** Show User 1:N Session/Document/Conversation/Message; Document 1:N Chunk; Conversation 1:N Message; Message 1:N Citation; nullable Citation references to Document/Chunk. Record actual composite ownership FK, cascade/restrict/set-null behavior, and indexes from migrations.
- [ ] **Step 4: Verify documentation links and schema claims.** Check every link resolves; compare ERD/FK/index claims with `apps/api/src/database/migrations/*.ts` and `apps/api/test/database/schema.integration.spec.ts`.
- [ ] **Step 5: Commit.** `docs: document product features and database relationships`.

### Task 6: Add package workflows and align README, CI, and local setup docs

**Files:**
- Create: `scripts/database/setup-local.cjs`
- Modify: `package.json`, `package-lock.json`, `.env.example`, `.github/workflows/ci.yml`, `README.md`, `docs/product/development.md`, `docs/product/testing.md`, `docs/product/operations.md`, `docs/product/implementation-log.md`

**Interfaces:** Add `db:up`, `db:stop`, `db:status`, `db:create`, `db:create:test`, `db:migrate`, `db:seed:local`, `db:seed:test`, `db:setup`, `dev`, `start:api`, and `test:e2e` scripts. `db:setup` runs non-destructive local Compose startup → exact-case DB creation → migrations → local seed. The setup script copies `.env.example` only when `.env` is absent and uses Node child-process invocation so it works in PowerShell and CI shells.

- [ ] **Step 1: Write orchestration-script tests.** Add `setup_local_does_not_overwrite_existing_env`, `setup_local_copies_template_if_missing`, and `setup_local_stops_on_database_or_migration_failure`; inject a child-process runner to assert command order without requiring Docker in unit tests.
- [ ] **Step 2: Run those tests and verify failure.** Expected: `setup-local.cjs` is absent and orchestration behavior is not implemented.
- [ ] **Step 3: Implement cross-platform local setup orchestration.** Ensure `.env.example` is copied only if `.env` is absent; invoke `docker compose up -d postgres`, `db:create`, `db:migrate`, and `db:seed:local` sequentially; stop immediately on the first non-zero exit and never call `down -v`, truncate, or drop.
- [ ] **Step 4: Add package scripts and environment values.** Set `.env.example` to maintenance `POSTGRES_DB=postgres`, `DATABASE_URL=postgresql://support_app:local_dev_only_change_me@localhost:5433/teamWorkspace`, and `TEST_DATABASE_URL=postgresql://support_app:local_dev_only_change_me@localhost:5433/teamWorkspace_test`. Add package scripts for lifecycle, migration, seeds, app serving, and checks; regenerate the lockfile only if dependencies changed.
- [ ] **Step 5: Update top-level and operational instructions.** Make README and development guide use `Copy-Item .env.example .env`, `npm ci`, `npm run db:setup`, and `npm start`; document only the local/test credentials, test database guard, port 5433, persistent volume, and non-destructive setup.
- [ ] **Step 6: Align CI to the guarded test database.** Start PostgreSQL with maintenance DB `postgres`; set `TEST_DATABASE_URL` to `teamWorkspace_test`; run `db:create:test` before migrations/tests. Keep deterministic provider and Chromium E2E setup; do not seed development credentials in CI.
- [ ] **Step 7: Verify package and docs.** Run setup script unit tests, `npm run db:status`, `npm run lint`, `npm test`, Playwright `--list`, and `git diff --check`; expected: scripts resolve cross-platform and all active run docs use one setup sequence.
- [ ] **Step 8: Commit.** `docs: add local database and product run workflows`.

### Task 7: Create the requested local database and run integrated verification

**Files:**
- Modify: `docs/product/implementation-log.md` only with verified results or a precise environment limitation
- Local-only ignored file: `.env` copied from template if missing; local named Compose volume/database are not committed

**Interfaces:** Use only `npm run db:setup` for local creation; database catalog name must equal `teamWorkspace`. Do not reset or remove any existing database or volume.

- [ ] **Step 1: Create local configuration without overwriting.** If `.env` is absent, run the setup command's copy behavior; verify `.env` remains git-ignored and never print its contents.
- [ ] **Step 2: Create and seed PostgreSQL.** Run `npm run db:setup`; verify Compose health, exact catalog name, migrations applied, two roles seeded, indexed fixture available, and database URL case preserved.
- [ ] **Step 3: Verify app workflows and quality gates.** Run `npm start`, authenticate as seeded local Admin and Agent, confirm Admin access controls, check the seeded document is indexed and can ground a citation, then run `npm test`, `npm run test:e2e` with `TEST_DATABASE_URL`, `npm run lint`, and `npm run build`.
- [ ] **Step 4: Review cleanup and secret boundary.** Run `git diff --check`, `git status --short`, `git grep -n` for removed runtime paths and secrets; verify no local `.env`, `var/`, `data/`, or database files are staged.
- [ ] **Step 5: Record results and commit.** Update implementation log with commands and observed outcomes, then commit `docs: record local database and full-stack verification`. If Docker is unavailable, record the exact unavailable check and leave database-creation acceptance explicitly pending rather than claiming completion.

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
