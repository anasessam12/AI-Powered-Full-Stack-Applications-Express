# Phase 02 — PostgreSQL schema and authentication foundation

**Status:** Delivered. **Source phase:** original product implementation Task 2.

## Objective

Define durable product data and a secure first-Admin bootstrap path.

## Delivered scope

- TypeORM entities and migrations for users, sessions, documents/chunks, conversations/messages, and citations.
- Normalized username uniqueness, role/status constraints, message/conversation owner composite FK, indexes, and deliberate cascade/restrict/set-null rules.
- Migration CLI, interactive one-time Admin bootstrap with Argon2id and advisory lock, and database-aware health status.

## API, data, and UI boundaries

- Migrations own schema changes; `synchronize` is disabled.
- Admin bootstrap is a terminal CLI and never logs a password.
- Health reports a safe 503 while PostgreSQL is unavailable.

## Acceptance criteria

- Fresh databases migrate without optional UUID extensions.
- Normalized usernames cannot collide and ownership constraints prevent cross-user messages.
- Bootstrap creates one Admin and refuses a second bootstrap.

## Verification evidence

Historical log records PostgreSQL migration/integration checks, migration down/up, Argon2id hash inspection, and a healthy Nest endpoint.

## Known limits and links

Login/session APIs and role management arrived in Phase 03. See [implementation history](../../product/implementation-log.md), [entities](../../../apps/api/src/database/entities/index.ts), [migrations](../../../apps/api/src/database/migrations/), and [Admin bootstrap](../../../apps/api/src/cli/admin-bootstrap.ts).
