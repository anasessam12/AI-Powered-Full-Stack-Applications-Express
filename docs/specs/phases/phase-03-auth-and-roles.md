# Phase 03 — Authentication, sessions, and role access

**Status:** Delivered. **Source phase:** original product implementation Task 3.

## Objective

Provide username/password authentication and enforce Admin/Agent permissions at the API boundary.

## Delivered scope

- Login, session restore, logout, CSRF protection, role guards, credential throttling, normalized usernames, and opaque cookie sessions whose token hashes are persisted.
- Admin-only user listing/provisioning, role and activation changes, and last-Admin protection.
- Browser-safe API contracts in `libs/api-contract`.

## API, data, and UI boundaries

- The API is authoritative; Angular role guards are navigation UX only.
- Passwords use Argon2id. Session cookies are HTTP-only and mutations require CSRF.
- Admin manages users; Agent has no Admin capability.

## Acceptance criteria

- Valid credentials establish a restorable session; logout revokes it.
- CSRF and role checks protect writes and Admin endpoints.
- Last-Admin protections preserve administrator access.

## Verification evidence

Historical log records 16/16 PostgreSQL API integration tests against an isolated `_test` database, including normalized usernames and role enforcement.

## Known limits and links

The product is single-organization; external identity providers are outside scope. See [implementation history](../../product/implementation-log.md), [auth routes](../../../apps/api/src/app/auth/auth.controller.ts), [auth service](../../../apps/api/src/app/auth/auth.service.ts), and [user service](../../../apps/api/src/app/users/users.service.ts).
