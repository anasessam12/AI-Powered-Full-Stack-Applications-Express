# API Contract

All routes use `/api/v1`. JSON request bodies reject unknown properties. Responses use the shared browser-safe types in `libs/api-contract`; TypeORM entities stay in the API application.

## Authentication and sessions

| Method | Route | Access | Result |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | Public | `{ user, csrfToken }`; sets the session cookie |
| `GET` | `/auth/session` | Session | `{ user, csrfToken }` |
| `POST` | `/auth/logout` | Session + CSRF | `204`; revokes session and expires cookie |

Login accepts `{ username, password }`. Unknown usernames, incorrect passwords, and disabled accounts share the same `401` response. The API never returns a password hash or session token in JSON.

## User administration

| Method | Route | Access | Result |
| --- | --- | --- | --- |
| `GET` | `/users` | Admin | Array of safe user records |
| `POST` | `/users` | Admin + CSRF | Creates `{ username, password, role }` as an active account |
| `PATCH` | `/users/:id` | Admin + CSRF | Updates `role`, `isActive`, or both |

There is no public registration or user deletion. Account creation returns the new user without credentials. Role changes and deactivation are checked against the current database record. The API rejects a change that would leave no active Admin.

## Documents

| Method | Route | Access | Result |
| --- | --- | --- | --- |
| `POST` | `/documents` | Admin + CSRF | Multipart `file`; stores, extracts, chunks, and indexes the document |
| `GET` | `/documents` | Session | Safe document metadata, newest first |
| `POST` | `/documents/:id/retry` | Admin + CSRF | Re-runs extraction and indexing for a failed document |
| `DELETE` | `/documents/:id` | Admin + CSRF | `204`; removes the document, chunks, and stored bytes |
| `GET` | `/documents/:id/content` | Session | Opens the stored source inline with private no-store headers |

Accepted content is PDF, UTF-8 TXT, or UTF-8 Markdown. Files default to a 20 MiB limit, configurable with `DOCUMENT_MAX_BYTES` up to a hard 20 MiB ceiling. A SHA-256 uniqueness constraint prevents duplicate content. The API response never returns internal storage keys or filesystem paths. Failed extraction leaves a `FAILED` record with a sanitized error code and retains the original for Admin retry.

## Conversations and grounded chat

| Method | Route | Access | Result |
| --- | --- | --- | --- |
| `GET` | `/conversations` | Session | The caller's latest 100 conversations |
| `POST` | `/conversations` | Session + CSRF | Creates a conversation; optional `{ title }` |
| `GET` | `/conversations/:id` | Owner session | Safe conversation metadata |
| `GET` | `/conversations/:id/messages` | Owner session | Ordered user/assistant history with source snapshots |
| `PATCH` | `/conversations/:id` | Owner session + CSRF | `{ archived: boolean }` |
| `DELETE` | `/conversations/:id` | Owner session + CSRF | `204`; removes history and citations |
| `POST` | `/chat` | Session + CSRF | Streams a grounded answer as SSE |

Chat accepts `{ conversationId?, message, requestId }`; `message` is limited to 8,000 characters and `requestId` is a UUID unique per user. Retrieval uses at most the first 500 characters. With no conversation id, the API creates a conversation. Repeating a completed request id replays its persisted answer and citations; reusing the id with changed content returns `409`. The API stores the user message before retrieval/provider work. If retrieval does not meet the evidence threshold, it stores and streams the fixed abstention without calling the model.

SSE event names and JSON bodies are defined by `ChatEventContract` in `libs/api-contract`:

- `message.started`: conversation id, user message id, and assistant message id.
- `message.delta`: conversation id, assistant message id, and answer text delta.
- `citations`: source, page/section, chunk/document ids, and rank when evidence supports the answer.
- `message.completed`: terminal success after the assistant message and citations are persisted.
- `message.failed`: sanitized failure code; partial output remains `FAILED` or `INTERRUPTED` and no completion event is sent.

Every conversation query is scoped to the authenticated owner; another user's identifiers return `404`. Client disconnects cancel provider work, and partial assistant output is persisted as interrupted.

## Cookie and CSRF behavior

The session cookie is named `support_session` by default, scoped to `/api/v1`, `HttpOnly`, and `SameSite=Lax`; it is `Secure` when `NODE_ENV=production`. Configure its lifetime with `SESSION_TTL_SECONDS` (60 seconds to 30 days). Configure the only allowed browser origin with `WEB_ORIGIN`.

The browser restores in-memory auth state from `GET /auth/session`; the session cookie remains unavailable to JavaScript. Every authenticated state-changing request must send the session's `csrfToken` in `X-CSRF-Token`. CSRF tokens are derived from the random session secret and have only their hash stored in PostgreSQL. The API checks the session and role from PostgreSQL on each protected request.

Login is limited to five failed attempts per normalized username and client IP per minute. This release uses a bounded in-process limiter suitable for the single-instance local setup; deployments with multiple API instances should use a shared rate-limit store.

## Angular browser behavior

The browser client starts at `/login`. It restores sign-in state from `GET /auth/session`; the HTTP-only cookie is the only persisted session credential. The API's CSRF token remains in the in-memory session signal. Login failures intentionally use one generic credential message. Angular route guards redirect by role for navigation convenience; every protected operation is still authorized by the API.

Admins use `/admin/users` to create named accounts (minimum 12-character password in this UI), change roles, and deactivate/reactivate accounts. The signed-in Admin's own role and activation controls are disabled; the API remains responsible for the last-active-Admin invariant. `/admin/documents` accepts PDF, TXT, or Markdown up to 20 MiB, displays only API-returned library records and persisted `INDEXED`/`PROCESSING`/`FAILED` status, supports retry for failed documents, and confirms removal. Upload progress is shown only for actual browser transfer events; it does not imply indexing progress.

The Agent `/chat` route is session-protected and currently an honest interim workspace screen. Task 8 replaces it with persisted conversations, SSE answers, and citations. The role guard is a user-experience control and must never be used as authorization.
