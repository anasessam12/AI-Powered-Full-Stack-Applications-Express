# Authentication and sessions

## User and journey

Admins and Agents sign in with a normalized username and password. The browser can restore an existing session, then sign out to revoke it.

## API contract

- `POST /api/v1/auth/login` accepts username/password and returns a safe user plus CSRF token; it sets an opaque HTTP-only session cookie.
- `GET /api/v1/auth/session` restores the current session and its CSRF token.
- `POST /api/v1/auth/logout` requires session and CSRF, revokes the session, and expires the cookie.

## Persistence and security

Passwords are Argon2id hashes. Session token hashes, CSRF token hashes, expiry, revocation, and activity metadata live in `sessions`; raw session tokens are only in the HTTP-only cookie. Cookies use `SameSite=Lax`, `/api/v1` path, and `Secure` in production. Login throttling limits repeated credential attempts. Browser session state stays in memory and is restored from the API; secrets are not written to localStorage.

## Failure behavior and tests

Invalid credentials return a generic authentication error. Missing/expired/revoked sessions are unauthorized; invalid CSRF is forbidden. Auth integration tests cover login, restore, logout, CSRF, throttling, and password verification. See [auth service](../../../apps/api/src/app/auth/auth.service.ts), [controller](../../../apps/api/src/app/auth/auth.controller.ts), and [Angular session client](../../../apps/web/src/app/core/auth/session.service.ts).
