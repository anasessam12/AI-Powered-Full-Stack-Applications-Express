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

Accepted content is PDF, UTF-8 TXT, or UTF-8 Markdown. Files default to a 20 MiB limit, configurable with `DOCUMENT_MAX_BYTES` up to a hard 20 MiB ceiling. A SHA-256 uniqueness constraint prevents duplicate content. The API response never returns internal storage keys or filesystem paths. Failed extraction leaves a `FAILED` record with a sanitized error code and retains the original for Admin retry.

## Cookie and CSRF behavior

The session cookie is named `support_session` by default, scoped to `/api/v1`, `HttpOnly`, and `SameSite=Lax`; it is `Secure` when `NODE_ENV=production`. Configure its lifetime with `SESSION_TTL_SECONDS` (60 seconds to 30 days). Configure the only allowed browser origin with `WEB_ORIGIN`.

The browser restores in-memory auth state from `GET /auth/session`; the session cookie remains unavailable to JavaScript. Every authenticated state-changing request must send the session's `csrfToken` in `X-CSRF-Token`. CSRF tokens are derived from the random session secret and have only their hash stored in PostgreSQL. The API checks the session and role from PostgreSQL on each protected request.

Login is limited to five failed attempts per normalized username and client IP per minute. This release uses a bounded in-process limiter suitable for the single-instance local setup; deployments with multiple API instances should use a shared rate-limit store.
