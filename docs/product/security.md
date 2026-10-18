# Security Notes

## Credentials and sessions

- Usernames are trimmed and case-normalized before lookup and uniqueness checks. Passwords must be at least 12 UTF-8 bytes and no more than 1024 bytes.
- Passwords use Argon2id with 64 MiB memory cost, three iterations, and one lane. The raw password is never persisted or logged. User entities hide the hash from default ORM selects, and HTTP responses use explicit safe DTOs.
- The first Admin is provisioned with `npm run admin:create`; the terminal hides and confirms the password. The command refuses non-interactive execution and refuses to create a second Admin. It does not seed a default identity.
- A login creates a 256-bit random opaque cookie token. PostgreSQL stores its SHA-256 hash, expiry, and revocation timestamp. Every protected request reloads the active user and session from PostgreSQL; role changes and deactivation therefore take effect on the next request.
- Cookies are HttpOnly, SameSite=Lax, scoped to `/api/v1`, and Secure in production. Browser clients must not put session credentials in localStorage.

## CSRF, authorization, and abuse controls

- The session response returns a deterministic CSRF token derived from the random session secret. PostgreSQL stores only its SHA-256 hash. `X-CSRF-Token` is required for authenticated methods that change state; `GET`, `HEAD`, and `OPTIONS` are exempt.
- Admin roles are checked by Nest guards using the current database user. Frontend route visibility is only a usability aid.
- Login uses a generic failure response and performs Argon2 work for unknown/disabled accounts to reduce username timing differences. A bounded limiter allows five failures per normalized username/client IP per minute.
- Admin user changes are logged with actor/target ids and the changed role/activation fields. Passwords, cookies, CSRF values, and password hashes are excluded from audit logs.
- CORS allows the configured `WEB_ORIGIN`, credentials, and only the API's supported headers. A production reverse proxy must terminate TLS; the application sets Secure cookies when `NODE_ENV=production`.

The login limiter is in-process in this single-instance release. A multi-instance deployment must replace it with a shared rate-limit store before scaling API replicas.
