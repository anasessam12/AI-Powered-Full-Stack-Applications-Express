# Fieldnote — Customer Support Knowledge Workspace

Fieldnote is an Nx monorepo for a private support workspace. Admins provision username/password accounts and maintain a searchable document library; Agents ask questions and receive streamed answers with citations. NestJS and PostgreSQL provide the API, sessions, indexing, retrieval, and conversation history. Angular provides the web app.

## Run locally

Requirements: Node.js 24.21.0, npm 11, and Docker Compose v2.

```powershell
Copy-Item .env.example .env
npm ci
docker compose up -d postgres
npm run db:migrate
npm run admin:create
npm start
```

Open `http://localhost:4200`. The bootstrap command prompts for the one-time Admin username and a strong password; no default account is seeded. Add an OpenRouter key and model to the ignored local `.env` to enable live answers. Tests use a deterministic provider and do not need provider credentials.

## Quality checks

```powershell
npm test
npm run lint
npm run build
```

PostgreSQL integration and browser acceptance tests require a disposable database named with the `_test` suffix. Set `TEST_DATABASE_URL` to that database, then run `npm run test:e2e`. The Playwright setup truncates application tables and bootstraps a known test Admin, so never point it at a shared or production database.

See [local development](docs/product/development.md), [testing](docs/product/testing.md), [operations](docs/product/operations.md), [architecture](docs/product/architecture.md), and [security](docs/product/security.md). The retired Express/SQLite workshop runtime is recorded in [the historical note](docs/history/express-demo.md); it is not part of the runnable product.
