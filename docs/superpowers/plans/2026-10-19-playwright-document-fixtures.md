# Playwright Document Fixtures and UI Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed realistic TXT, Markdown, and PDF knowledge into local/test databases, then verify the main Admin and Agent workflows in Playwright.

**Architecture:** Extend the existing workspace seeder to use the production `DocumentsService` for fixture ingestion, so PDF extraction and indexing stay consistent with uploads. Fix zoneless Angular state updates where asynchronous API results currently leave Admin pages stuck in loading, and expand Playwright around the dedicated `_test` database with a deterministic provider.

**Tech Stack:** Nx, Angular 22 zoneless change detection, NestJS, TypeORM, PostgreSQL, Playwright, `pdf-parse`.

**Spec:** `docs/superpowers/specs/2026-10-19-playwright-document-fixtures.md`

## Global Constraints

- Browser acceptance tests may truncate tables only in a loopback database whose name ends in `_test`.
- Local seed is additive and idempotent; do not drop databases, rewrite existing users, or replace local passwords.
- Do not use Docker or an external LLM provider.
- Keep Playwright file uploads limited to PDF, TXT, and Markdown fixtures.

## Review Focus

- PDF parsing may yield empty text or lose page metadata; assert indexed content and `page_number = 1`.
- Angular zoneless callbacks may update component fields without rendering; assert the DOM after API responses.
- Playwright may reuse an already-running local server connected to `teamWorkspace`; force isolated test servers.
- Repeated seeds must not duplicate documents or stored assets; rerun seed and verify unchanged counts.
- Unsupported files must be rejected client-side and leave upload disabled.

---

### Task 1: Add real seed fixtures and production-path ingestion

**Files:**
- Create: `apps/api/test/fixtures/seed/returns-policy.txt`
- Create: `apps/api/test/fixtures/seed/exchange-policy.md`
- Create: `apps/api/test/fixtures/seed/billing-policy.pdf`
- Modify: `apps/api/src/database/seeds/workspace-seed.ts`
- Modify: `apps/api/src/database/seeds/workspace-seed.spec.ts`
- Test: `apps/web-e2e/src/support-product.e2e.spec.ts`

**Interfaces:**
- Consume: `DocumentsService.create(file, owner)` and `WORKSPACE_SEED_ACCOUNTS`.
- Produce: `seedWorkspace(dataSource, mode)` adds exactly the three new fixture documents if their checksum is absent and reports the number created.

- [x] **Step 1: Add failing E2E expectations** for Admin list rows and seeded fixture file names/statuses; directly assert the Admin users API returns the seeded Agent before asserting the UI renders it.
- [x] **Step 2: Run the focused Playwright test** and confirm the API assertion passes while the UI rendering assertion fails in the loading state.
- [x] **Step 3: Create the TXT, Markdown, and one-page PDF fixtures** with the exact facts from the spec; inspect the PDF extraction text and page layout.
- [x] **Step 4: Update `seedWorkspace`** to checksum-check each fixture and index it through `DocumentsService` using the fixture extension and MIME type.
- [x] **Step 5: Run local seed twice** and query the dedicated test database to prove one row per fixture, `INDEXED` statuses, searchable chunks, and PDF page 1.
- [x] **Step 6: Commit** as `test: seed representative support document formats` (`99265ae`).

### Task 2: Render asynchronous Admin state in zoneless Angular

**Files:**
- Modify: `apps/web/src/app/admin/users/users-page.component.ts`
- Modify: `apps/web/src/app/admin/documents/documents-page.component.ts`
- Modify: `apps/web/src/app/chat/chat-page.component.ts`
- Modify: `apps/web/src/app/auth/login/login-page.component.ts`
- Test: `apps/web-e2e/src/support-product.e2e.spec.ts`

**Interfaces:**
- Consume: the existing `HttpClient` Observables and Angular `ChangeDetectorRef`.
- Produce: loading, data, success, and error state changes render after async callbacks.

- [x] **Step 1: Assert loading ends and seeded users/documents become visible** after successful API responses.
- [x] **Step 2: Run the focused Playwright test** to confirm those DOM assertions fail before the production change.
- [x] **Step 3: Inject `ChangeDetectorRef` and call `markForCheck()`** after API `next`, `error`, and `finalize` state changes in the affected pages, including conversation history and message loading.
- [x] **Step 4: Run the focused Playwright test** and confirm the API-backed data and states render.
- [x] **Step 5: Commit** as `fix: refresh admin views after async api updates` (`a217c8b`).

### Task 3: Exercise Admin and Agent workflows with Playwright

**Files:**
- Modify: `apps/web-e2e/playwright.config.ts`
- Modify: `apps/web-e2e/src/support-product.e2e.spec.ts`
- Modify: `apps/web-e2e/acceptance-llm-provider.ts`
- Modify: `apps/api/src/app/retrieval/retrieval.service.ts`
- Modify: `apps/api/src/app/retrieval/answer-policy.ts`
- Modify: `.gitignore`
- Modify: `docs/product/testing.md`

**Interfaces:**
- Consume: the fixture data from Task 1 and async-render behavior from Task 2.
- Produce: `npm run test:e2e` loads ignored `.env`, uses a dedicated PostgreSQL `_test` target, and runs one isolated API/web pair.

- [x] **Step 1: Write Playwright cases** for indexed document visibility, questions/citations for TXT, Markdown, PDF, and account-security, reload persistence, Agent restrictions, and unsupported upload validation; include unsupported question abstention and provider failure.
- [x] **Step 2: Run E2E tests** and confirm the original loading and matching issues with test evidence.
- [x] **Step 3: Make the acceptance LLM provider answer deterministically by question** and configure Playwright not to reuse an existing application server.
- [x] **Step 4: Assert UI and API/database state** after each completed action.
- [x] **Step 5: Run all Playwright tests**, query the local/test database for seeded documents/chunks and persisted messages, then run API tests and builds.
- [x] **Step 6: Commit** as `test: verify seeded support workflows in playwright`.
