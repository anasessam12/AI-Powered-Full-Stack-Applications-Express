# Phase 09 — Product acceptance and operations closeout

**Status:** Implemented; local PostgreSQL-backed browser acceptance was not verified in the recorded phase. **Source phase:** original product implementation Task 9.

## Objective

Define browser acceptance flows, CI quality checks, operations guidance, and migration boundary from the workshop runtime.

## Delivered scope

- Playwright scenarios for Admin/Agent access, document upload/indexing, grounded streaming/citations, history, denied Admin access, unsupported upload, deterministic provider failure, and logout.
- Dedicated `_test` guard; Playwright applies migrations and clears only application tables in the explicitly disposable test database.
- CI PostgreSQL/Chromium workflow and security, testing, development, API, architecture, and operations docs.
- README describes the Nx product. The retired Express runtime has since been removed while its history remains archived.

## API, data, and UI boundaries

- Browser acceptance uses a deterministic fake provider and dedicated test database.
- CI provisions test services; local setup preserves developer data and Compose volumes.

## Acceptance criteria

- Clean-checkout workflow is documented; CI runs tests, E2E, lint, and production build.
- E2E setup rejects database names without `_test`.
- Local E2E is not claimed without database-backed evidence.

## Verification evidence

Historical log records `npm test`, lint, build, and Playwright discovery as passing. It explicitly says real migrations and browser acceptance were not run because Docker and a reachable database were unavailable. Current cleanup/seed checks are recorded in the implementation plan.

## Known limits and links

This phase did not create a developer-local database. Follow-up work adds guarded creation and role/document seeds, but the database itself remains pending until PostgreSQL is running. See [implementation history](../../product/implementation-log.md), [E2E setup](../../../apps/web-e2e/global-setup.ts), [CI](../../../.github/workflows/ci.yml), and [operations](../../product/operations.md).
