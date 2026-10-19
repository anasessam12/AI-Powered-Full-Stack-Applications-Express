# Local Development

## Prerequisites

- Node.js 24.21.0 (see `.nvmrc`) and npm 11.
- Docker Compose v2 for the repository-managed PostgreSQL service.

## First run

1. Install the locked dependencies: `npm ci`.
2. Run `npm run db:setup`. It creates `.env` from `.env.example` only when missing, starts PostgreSQL, creates exact-case `teamWorkspace`, applies migrations, and adds local Admin/Agent accounts plus an indexed sample document.
3. Run `npm start` and open `http://localhost:4200`. The health endpoint is `http://localhost:3000/api/v1/health` and returns 503 if PostgreSQL is unavailable.

The local-only login accounts are `workspace.admin` / `Team-workspace-admin-2026!` (Admin) and `workspace.agent` / `Team-workspace-agent-2026!` (Agent). They are seeded only in local mode, are not production credentials, and an existing account's password is never overwritten by rerunning the seed. For a fresh production installation, use `npm run admin:create` after migrations.

The API supports username/password sessions, Admin user management, document ingestion, durable owner-scoped conversation history, and grounded streaming chat. Angular provides the Admin and Agent workflows. Do not interpret the development database credentials as product user credentials or production authentication.

## Common commands

- `npm start` / `npm run dev`: serve Angular; the Nx target starts the API dependency.
- `npm run start:api`: serve only the NestJS API.
- `npx nx serve api`: serve the API by itself.
- `npm run db:up`: start the repository PostgreSQL container.
- `npm run db:stop`: stop PostgreSQL while preserving its named volume.
- `npm run db:status`: inspect the Compose service state.
- `npm run db:setup`: safe first-run setup, migrations, and local fixtures; it never drops databases or volumes.
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
- PostgreSQL is reachable to desktop tools such as pgAdmin at host `localhost`, port `5433`, maintenance database `postgres`, user `support_app`, using the local password in ignored `.env`. Refresh the server's database tree to see `teamWorkspace` after setup.
- Prefer `npm run db:stop` for routine shutdown; it preserves the named volume.

`OPENROUTER_API_KEY` is blank in the template. Add a real provider key only to local ignored `.env`; never commit it or copy it into browser settings, docs, prompts, or logs.
