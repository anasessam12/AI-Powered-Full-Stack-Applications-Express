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
