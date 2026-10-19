# Phase 06 — Durable conversation and streaming API

**Status:** Delivered. **Source phase:** original product implementation Task 6.

## Objective

Persist support conversations and provide a resilient, CSRF-protected streaming API.

## Delivered scope

- Owner-scoped conversation create/list/read/archive/delete and ordered messages with citation snapshots.
- `POST /api/v1/chat` persists the user and pending assistant message before retrieval/provider work, supports request-id replay, and rejects changed-content reuse.
- SSE deltas, final citations, evidence abstention, provider failure, and interrupted partial-response states.

## API, data, and UI boundaries

- Sessions and CSRF protect chat requests; ownership is enforced by API policy and relational constraints.
- Shared event contracts are browser-safe in `libs/api-contract`; persistence remains API-owned.
- Completion is emitted only after final response persistence.

## Acceptance criteria

- History survives reload and is owner-scoped.
- Replayed request IDs are idempotent; changed-payload reuse conflicts.
- Failures and disconnects persist safe failed/interrupted states.

## Verification evidence

Historical log records PostgreSQL-backed tests for ownership, event order, citations, replay, abstention, provider failure, and client disconnect using a deterministic provider.

## Known limits and links

Streaming requires an authenticated browser session. See [implementation history](../../product/implementation-log.md), [chat controller](../../../apps/api/src/app/chat/chat.controller.ts), [chat service](../../../apps/api/src/app/chat/chat.service.ts), and [chat contracts](../../../libs/api-contract/src/lib/chat/chat.contract.ts).
