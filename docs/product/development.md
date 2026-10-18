# Local Development

## Prerequisites

- Node.js 24.21.0 (see `.nvmrc`) and npm 11.
- Docker Compose v2 for the repository-managed PostgreSQL service.

## First run

1. Copy `.env.example` to `.env`. Its database values are disposable local-development credentials; choose new secrets for any deployed environment.
2. Install the locked dependencies: `npm ci`.
3. Start PostgreSQL: `docker compose up -d postgres`. The service exposes host port 5433 to avoid colliding with a locally installed PostgreSQL on 5432.
4. Start the Angular app and its API dependency: `npm start` (equivalent to `npx nx serve web`).
5. Apply the database schema: `npm run db:migrate`.
6. Create the initial Admin in an interactive terminal: `npm run admin:create`. Enter a unique username and a strong password when prompted; the password is hidden and is never seeded or logged.
7. Open `http://localhost:4200`. The health endpoint is `http://localhost:3000/api/v1/health` and returns 503 if PostgreSQL is unavailable.

The application currently has the initial shell and database foundation; authentication and product workflows are added in subsequent implementation tasks. Do not interpret the development database credentials as product user credentials or production authentication.

## Common commands

- `npm start` / `npm run dev`: serve Angular; the Nx target starts the API dependency.
- `npx nx serve api`: serve the API by itself.
- `npm run db:migrate`: apply pending TypeORM migrations.
- `npm run db:revert`: revert the last migration; use only when its effects are understood.
- `npm run admin:create`: securely prompt for and create the first Admin once.
- `npm test`: run Nx project tests. PostgreSQL schema integration tests also require `TEST_DATABASE_URL` pointing to a dedicated database ending in `_test`; run them with `npx nx test api --runInBand`.
- `npm test`: run Nx project tests.
- `npm run test:legacy`: run the existing Express reference tests.
- `npm run lint`: run Nx lint targets.
- `npm run build`: run Nx builds.
- `docker compose down`: stop local PostgreSQL while retaining its named volume.
- `docker compose down -v`: remove the local database volume and all its data.

`OPENROUTER_API_KEY` is blank in the template. Add a real provider key only to local ignored `.env`; never commit it or copy it into browser settings, docs, prompts, or logs.
