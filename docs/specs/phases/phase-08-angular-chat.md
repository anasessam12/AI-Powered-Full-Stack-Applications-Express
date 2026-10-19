# Phase 08 — Agent chat, citations, and history

**Status:** Delivered. **Source phase:** original product implementation Task 8.

## Objective

Replace the interim Agent route with persistent chat that makes source evidence and response state clear.

## Delivered scope

- Cookie/CSRF fetch client and SSE parser supporting LF/CRLF and arbitrary network chunk boundaries.
- Conversation create/list/reopen, streaming partial/completed/abstaining/failed/cancelled states, citations with page/section, and authenticated source opening.
- Safe conversation history and source snapshots.

## API, data, and UI boundaries

- UI consumes shared API contracts and passes a stable request ID for idempotency.
- Original files are served through an authenticated API route with `nosniff`, sandbox CSP, and private no-store headers.
- Stream updates communicate state without noisy per-token announcements.

## Acceptance criteria

- History survives reload and answer state is explicit.
- Citations identify a source and authenticated users can open its bytes.
- Parser tolerates arbitrary framing boundaries; failed streams are not shown as completed.

## Verification evidence

Historical log records Angular SSE/chat tests, API unit tests, and lint/build success. It also says interactive DB-backed streaming was not exercised and DB integration suites were skipped without `TEST_DATABASE_URL`.

## Known limits and links

Browser acceptance requires PostgreSQL and is tracked in Phase 09. See [implementation history](../../product/implementation-log.md), [chat UI](../../../apps/web/src/app/chat/chat-page.component.ts), [SSE parser](../../../apps/web/src/app/core/sse/sse-parser.ts), and [source route](../../../apps/api/src/app/documents/documents.controller.ts).
