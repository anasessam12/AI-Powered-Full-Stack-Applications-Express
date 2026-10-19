# Streaming chat and citations

## User and journey

An authenticated Agent sends a question from the chat workspace and receives answer deltas with an explicit completion, abstention, failure, or interruption state. Citations expose source name and available page/section details.

## API contract

`POST /api/v1/chat` accepts question, optional conversation ID, and a request ID; session cookie and CSRF header are required. The response is server-sent events defined in `libs/api-contract`. The user message and pending assistant row persist before retrieval/provider work. Completion/citations persist before the final event.

## Persistence and security

`messages` records role, content, state, request ID, provider metadata, and times. `citations` links to message and may reference a current document/chunk while retaining source/page/section/rank/score snapshots. Only an authenticated session can open source bytes through the document route.

## Failure behavior and tests

Insufficient evidence abstains. Provider failure and client disconnect persist safe failed/interrupted states and do not emit a false completion. Same request ID/content replays idempotently; changed content conflicts. Angular's parser handles arbitrary LF/CRLF chunk boundaries and cancellation. See [chat service](../../../apps/api/src/app/chat/chat.service.ts), [API contract](../../../libs/api-contract/src/lib/chat/chat.contract.ts), [SSE parser](../../../apps/web/src/app/core/sse/sse-parser.ts), and [chat page](../../../apps/web/src/app/chat/chat-page.component.ts).
