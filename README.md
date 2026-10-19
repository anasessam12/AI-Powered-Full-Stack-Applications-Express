# Fieldnote — Customer Support Knowledge Workspace

Fieldnote is an Nx monorepo for a private support workspace. Admins provision username/password accounts and maintain a searchable document library; Agents ask questions and receive streamed answers with citations. NestJS and PostgreSQL provide the API, sessions, indexing, retrieval, and conversation history. Angular provides the web app.

## Run locally

Requirements: Node.js 24.21.0, npm 11, and Docker Compose v2.

```powershell
npm ci
npm run db:setup
npm start
```

Open `http://localhost:4200`. `db:setup` creates `.env` only if missing, starts PostgreSQL, creates the exact-case `teamWorkspace` database, applies migrations, and seeds the local Admin/Agent and example knowledge. It never drops a database or removes the Compose volume. Local-only accounts: `workspace.admin` / `Team-workspace-admin-2026!` and `workspace.agent` / `Team-workspace-agent-2026!`. Change or remove these before exposing the machine or database to anyone else. Add an OpenRouter key and model to ignored `.env` to enable live answers. Tests use a deterministic provider and do not need provider credentials.

## Quality checks

```powershell
npm test
npm run lint
npm run build
```

PostgreSQL integration and browser acceptance tests require a loopback database named with the `_test` suffix. Use `npm run db:create:test`, then set `DATABASE_URL` and `TEST_DATABASE_URL` to that test database and run `npm run db:migrate`, `npm test`, or `npm run test:e2e`. Playwright truncates application tables in that database and seeds known Admin/Agent accounts, so never point it at shared or production data.

See the [product overview](docs/product/README.md), [local development](docs/product/development.md), [testing](docs/product/testing.md), [operations](docs/product/operations.md), [architecture](docs/product/architecture.md), and [security](docs/product/security.md). The retired Express/SQLite workshop runtime is recorded in [the historical note](docs/history/express-demo.md); it is not part of the runnable product.
