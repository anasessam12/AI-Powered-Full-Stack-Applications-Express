# Local Development

## Prerequisites

- Node.js 24.21.0 (see `.nvmrc`) and npm 11.
- A local PostgreSQL service (18 recommended), listening on `localhost:5432`.

## First run

1. Install the locked dependencies: `npm ci`.
2. Make sure the local PostgreSQL service is running and `DATABASE_ADMIN_URL` in ignored `.env` has a valid administrator login.
3. Run `npm run start:local`. It runs `npm run db:setup` first: `.env` is copied from `.env.example` only when missing, the app role/database are created if missing, migrations are applied, and local Admin/Agent accounts plus the indexed sample document are added. Then it serves Angular and its NestJS API dependency. Setup never drops the database or changes an existing app-role password. Open `http://localhost:4200`. The health endpoint is `http://localhost:3000/api/v1/health` and returns 503 if PostgreSQL is unavailable.

The local-only login accounts are `workspace.admin` / `Team-workspace-admin-2026!` (Admin) and `workspace.agent` / `Team-workspace-agent-2026!` (Agent). They are seeded only in local mode, are not production credentials, and an existing account's password is never overwritten by rerunning the seed. For a fresh production installation, use `npm run admin:create` after migrations.

The API supports username/password sessions, Admin user management, document ingestion, durable owner-scoped conversation history, and grounded streaming chat. Angular provides the Admin and Agent workflows. Do not interpret the development database credentials as product user credentials or production authentication.

## Common commands

- `npm start` / `npm run dev`: serve Angular; the Nx target starts the API dependency.
- `npm run start:local`: safely set up the local database, then start the full product.
- `npm run start:api`: serve only the NestJS API.
- `npx nx serve api`: serve the API by itself.
- `npm run db:setup`: safe first-run setup, migrations, and local fixtures; it never drops databases.
- `npm run db:create` / `npm run db:create:test`: create `teamWorkspace` or a guarded `_test` database if missing.
- `npm run db:migrate`: apply pending TypeORM migrations.
- `npm run db:revert`: revert the last migration; use only when its effects are understood.
- `npm run db:seed:local` / `npm run db:seed:test`: seed local or test-only accounts and example source after migration.
- `npm run admin:create`: securely prompt for and create the first Admin once.
- `npm test`: run all Nx project tests. The script enables Node's VM modules for Jest because the maintained PDF parser uses the ESM PDF.js worker. `npm run test:api` runs the API suite. PostgreSQL integration tests also require `TEST_DATABASE_URL` pointing to a dedicated database ending in `_test`.
- `npm run test:e2e`: run Playwright acceptance flows against a real Angular app, Nest API and dedicated PostgreSQL test database. Setup resets application tables and seeds test Admin/Agent accounts; it refuses non-loopback database URLs and names without the `_test` suffix.
- `docs/product/testing.md`: integration-test setup, deterministic provider tests, and retrieval evaluation conventions.
- `npm run lint`: run Nx lint targets.
- `npm run build`: run Nx builds.
- PostgreSQL is reachable to desktop tools such as pgAdmin at host `localhost`, port `5432`. Register the server with your PostgreSQL administrator credentials and maintenance database `postgres`; refresh its database tree to see `teamWorkspace` after setup. On Windows, manage the installed PostgreSQL service through Services or pgAdmin; the project scripts do not start or stop it.
- `DATABASE_ADMIN_URL` is only for local database provisioning; `DATABASE_URL` uses the restricted `support_app` role. URL-encode reserved characters in passwords. Use the same app role/password in `DATABASE_URL` and `TEST_DATABASE_URL`.

`OPENROUTER_API_KEY` is blank in the template. Add a real provider key only to local ignored `.env`; never commit it or copy it into browser settings, docs, prompts, or logs.
