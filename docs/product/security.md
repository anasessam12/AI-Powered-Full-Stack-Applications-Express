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

## Uploaded documents

- Multipart uploads are buffered only up to the hard 20 MiB limit. `DOCUMENT_MAX_BYTES` can lower the cap for a deployment; values above 20 MiB are rejected at startup.
- The filename is validated as a single basename and never forms a storage path. Storage keys are random UUIDs with a validated extension; the local adapter checks every resolved key stays below its configured root and creates files with owner-only permissions.
- The server checks extension, declared MIME type, PDF signature, and strict UTF-8 decoding for text formats. The PDF parser disables JavaScript evaluation; malformed or empty extraction is recorded as failed and not indexed.
- Stored text is untrusted source material. The API stores chunk/page/section metadata for downstream retrieval, but document text must never be treated as system instructions.
- Configure `DOCUMENT_STORAGE_ROOT` on a persistent volume and include it in the application's backup/retention plan. Do not expose that directory from the web server.

## Retrieval and model boundary

- Full-text retrieval uses parameterized `websearch_to_tsquery` input. It returns only chunks from `INDEXED`, non-deleted documents and caps results at five.
- Evidence text is serialized as bounded JSON and explicitly marked untrusted in the system instruction. Retrieved instructions never override policy. If no chunk reaches the configured `RETRIEVAL_MIN_SCORE`, the application abstains without calling the provider.
- `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` are loaded in the API process only. Provider errors are sanitized, requests time out, caller cancellation propagates, and generation is capped at 1,200 tokens and 40,000 response characters.
- Tests use `FakeLlmProvider` or mocked fetch responses; tests and builds do not require a live provider key.
- Conversation and message queries always include the authenticated owner id; foreign ids return `404`. Chat request ids are unique per user and reject changed content on replay. User messages are persisted before provider calls. A provider failure or client disconnect records the assistant turn as failed/interrupted and never emits a completion event for partial output.
