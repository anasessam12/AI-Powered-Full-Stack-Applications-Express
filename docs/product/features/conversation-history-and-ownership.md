# Conversation history and ownership

## User and journey

Agents can create, list, reopen, archive, and delete their own conversations. Messages are returned in order with safe citation snapshots. An Agent cannot inspect another user's conversation by guessing its ID.

## API contract

Authenticated routes are `GET/POST /api/v1/conversations`, `GET /api/v1/conversations/:id`, `GET /api/v1/conversations/:id/messages`, `PATCH /api/v1/conversations/:id`, and `DELETE /api/v1/conversations/:id`. Mutations require CSRF. Every query is scoped to the current session user.

## Persistence and security

`conversations.user_id` owns its messages. A composite unique key `(id,user_id)` plus composite message FK ensures a message's user matches the conversation owner. Conversation deletion cascades to messages, then citations. User deletion is restricted while durable records are owned.

## Failure behavior and tests

Missing or other-user IDs are returned as not found, avoiding ownership disclosure. Tests cover owner isolation, ordered history, archive/delete, and cascades. See [conversation service](../../../apps/api/src/app/conversations/conversations.service.ts), [controller](../../../apps/api/src/app/conversations/conversations.controller.ts), and [schema migration](../../../apps/api/src/database/migrations/1700000000000-InitialProductSchema.ts).
