# Phase 01 — Nx foundation and local development baseline

**Status:** Delivered. **Source phase:** original product implementation Task 1.

## Objective

Replace the workshop's single-page starting point with a maintainable Nx monorepo for an Angular client and NestJS API.

## Delivered scope

- Nx integrated workspace with `apps/web` (Angular 22), `apps/api` (NestJS 11), aligned Nx plugins, and `libs/api-contract`.
- Pinned Node/npm/TypeScript toolchain, root test/lint/build commands, PostgreSQL Compose service, environment template, versioned health endpoint, and product docs.
- The Express runtime has since been retired; history remains in `docs/history/express-demo.md`.

## API, data, and UI boundaries

- API health: `GET /api/v1/health`.
- Client owns UI and safe contracts; API owns persistence and server credentials.
- PostgreSQL schema and product workflows arrived in later phases.

## Acceptance criteria

- Nx discovers `api`, `web`, and root package projects.
- Lint, tests, and builds run through workspace commands.
- Angular is the product UI entrypoint and NestJS is the API runtime.

## Verification evidence

The historical implementation log records successful `npm ci`, Nx discovery, lint/test/build, Compose parsing, and baseline smoke tests. Current post-cleanup verification is recorded in the latest implementation-log entries.

## Known limits and links

No authentication or document workflow was included at this stage. See [implementation history](../../product/implementation-log.md), [architecture](../../product/architecture.md), [API project](../../../apps/api/project.json), and [health controller](../../../apps/api/src/app/health/health.controller.ts).
