# Product cleanup, documentation, and local database design

**Status:** Awaiting user review  
**Date:** 2026-10-19  
**Repository:** Nx Angular + NestJS + PostgreSQL customer-support workspace

## 1. Goal

Finish the migration from the Express demonstration into one unambiguous Nx product repository. Remove the obsolete Express runtime, document the delivered product by implementation phase and feature, provide an understandable relational schema reference, and make a clean local PostgreSQL database with useful development and test fixtures easy to create.

The local development database must be named exactly `teamWorkspace`, preserving the uppercase `W`. Tests use a separate disposable database whose name ends in `_test`. No existing local volume or database is dropped by setup commands.

## 2. Repository cleanup boundary

Delete the inactive Express application and its runtime-only files: `src/`, `frontend/`, the old `seed/knowledge_base.json`, `tests/app.test.js`, `tests/http.test.js`, `scripts/setup.js`, `IMPLEMENTATION_COMPLETE.md`, and Express-specific package scripts. Keep scripts still required by the maintained product, including `scripts/run-tests.cjs`, migration, Admin bootstrap, and Playwright commands. Remove dependencies only when they are confirmed to be exclusive to the retired application; keep dependencies required by NestJS or maintained tests.

Retain `docs/workshop/`, original `artifacts/`, earlier product design and phase plans, and the implementation record as historical evidence. Remove or rewrite instructions that tell developers to run Express/SQLite. Any historical reference that remains must be clearly labeled archival and must not expose a supported runtime command. Do not remove ignored local `data/`, `var/`, `.env`, Docker volumes, or user-created files as part of source cleanup.

## 3. Product documentation structure

Create a product documentation overview that explains the product purpose, Admin/Agent journeys, architecture, local prerequisites, primary commands, and links to all feature and database documents.

Create one phase specification for each of the nine implementation phases already represented by the approved product plan and implementation log. Each phase spec records its intent, delivered scope, API/data/UI boundaries, acceptance criteria, verification evidence, and links to the owning feature docs and source. Label status accurately where full PostgreSQL browser acceptance is still pending.

Create a feature-document index and a focused page for each user-visible or operational feature: authentication and sessions; user/role administration; document upload and indexing; retrieval and evidence policy; model-provider boundary; streaming chat and citations; conversation history and ownership; local development, CI, and operations. Avoid restating implementation details without linking to their owning code and tests.

Create a database reference with a Mermaid ER diagram, table responsibilities, foreign-key directions and delete rules, important unique constraints/indexes, migration ownership, and seed behavior. It must explain that TypeORM migrations are authoritative and schema synchronization is disabled.

## 4. PostgreSQL lifecycle and naming

Compose continues to run PostgreSQL 18.6 with a named persistent volume. The maintenance database used to initialize the container is separate from the product database. An idempotent repository command connects to that maintenance database and issues a quoted PostgreSQL `CREATE DATABASE "teamWorkspace"` only when the exact-case database does not exist. The product `DATABASE_URL` points to `/teamWorkspace`.

Provide a separate idempotent creation path for a dedicated test database (default `teamWorkspace_test`). PostgreSQL database creation is performed outside a transaction. Creation scripts must validate the target host and name; the normal setup command may target only loopback/local Compose. The test seeder and destructive test reset may target only an explicit `_test` database. No default command drops a database, truncates the local development database, or removes the Compose volume.

## 5. Seed fixtures and accounts

Maintain source-controlled, fictional support-policy fixtures under the API test/seed fixture tree. The local development seed creates one Admin and one Agent and registers at least one indexed source document with searchable chunks and consistent stored source bytes, so local users can explore role permissions, citations, and source links. It is idempotent and uses stable IDs/checksums or deterministic upsert logic to avoid duplicate users and documents.

Development-only account names and fixed test passwords are documented as disposable local credentials. Seeding must reject `NODE_ENV=production` and non-loopback development database hosts. The CI/test seeder uses deterministic test credentials and refuses databases that do not end in `_test`. Passwords are hashed with the existing Argon2id service and are never inserted or logged as plaintext. The interactive one-time production Admin bootstrap remains unchanged and does not create known credentials.

## 6. Package commands and first run

Expose clear scripts for starting/stopping and checking local PostgreSQL, creating the exact-case development database, migrating, seeding local fixtures, seeding/resetting only test databases, and serving/building/linting/testing the Angular + NestJS product. Provide one documented first-run command sequence that copies `.env.example` without overwriting an existing `.env`, installs locked dependencies, starts PostgreSQL, creates `teamWorkspace`, migrates, seeds, then starts the product. Keep ordinary `npm start`/`npm run dev` behavior aligned with the documented product.

README and `docs/product/development.md` show the same commands and local demo credentials. Testing docs distinguish unit tests, PostgreSQL integration tests, E2E tests, and the test-only seed. The operations doc describes volume persistence and warns that reset/volume-removal commands destroy data.

## 7. Acceptance criteria

- No executable Express/SQLite demo source, old UI, demo-only seed, old smoke tests, or legacy launch/setup scripts remain in the product repository.
- Active API/web/test commands continue to work and no required NestJS dependency is removed as a false positive.
- `npm run db:setup` creates a database whose catalog name is exactly `teamWorkspace`, applies migrations, and adds one usable Admin, one Agent, and an indexed fixture without dropping prior data.
- The local fixture file and indexed source are available to both the Admin UI and the citation/source-opening workflow.
- The test seed is deterministic, repeatable, and blocked for any database name without `_test`.
- Every implementation phase and product feature has an indexed spec/doc page; documentation reflects actual API routes, roles, storage, constraints, and test behavior.
- A clean-checkout command reference covers install, local DB setup, app startup, unit/integration/E2E tests, lint, and build.

## 8. Explicit non-goals

Do not change product feature behavior, schema relationships, authentication policy, production bootstrap, LLM provider, retrieval ranking, or deployment topology. Do not invent production/demo users in CI or production. Do not delete workshop/source artifacts or existing user-local database data.
