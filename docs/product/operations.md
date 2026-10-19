# Operations and deployment boundary

## Configuration and runtime

Run `npm run db:setup` for a first local install after configuring `DATABASE_ADMIN_URL`; it creates `.env` only if absent and never drops the database. Set `DATABASE_URL`, `WEB_ORIGIN`, `API_PORT`, `DOCUMENT_STORAGE_ROOT`, `DOCUMENT_MAX_BYTES`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and retrieval thresholds explicitly in a deployment environment. Keep provider credentials server-side and out of browser bundles, logs, screenshots, and source control. Template database passwords and fixed seed users are local/test-only values; do not carry them into deployment.

Run `npm run db:migrate` as a controlled release step before serving traffic. Start the API and Angular static build behind a TLS-terminating reverse proxy that forwards `/api` to NestJS and serves the SPA. Configure the exact allowed web origin, secure cookie behavior (`NODE_ENV=production`), request/body limits, health probes, and graceful shutdown. The current repository documents local and CI operation; it does not include a deployment-specific container, secret manager, HA database, or cloud storage integration.

## Bootstrap and access

Local development seeds `workspace.admin` and `workspace.agent`, plus a fictional support source. The seed is loopback-only, refuses production, hashes passwords with Argon2id, and preserves existing passwords. These fixed credentials must never be deployed. For a fresh production installation, use `npm run admin:create` once after migrations from an interactive trusted terminal; it hides the password, serializes concurrent bootstrap attempts, and refuses a second initial Admin. Create later users through the Admin UI. Treat test credentials as disposable and rotate any real account credentials through the organization's approved process.

## Documents and backups

Original documents are stored under `DOCUMENT_STORAGE_ROOT` (default `var/documents`); PostgreSQL stores document metadata, chunks, accounts, sessions, conversations, messages, and citations. Back up PostgreSQL and the document directory together and preserve their recovery point relationship. PostgreSQL backups should be encrypted and access-controlled; validate restore procedures in an isolated environment before relying on them. Restoring the database without corresponding document bytes can leave citations inaccessible.

## Monitoring and incident handling

Use `/api/v1/health` for readiness; it reports database availability. Capture process-level request/error metrics and database/storage capacity at the deployment layer. Application errors avoid logging passwords, session tokens, CSRF tokens, full prompts, provider keys, or uploaded content. Restrict access to operational logs and traces because request metadata can still be sensitive. On provider outage, the API preserves failed answer state rather than presenting partial text as completed; investigate provider health and retry from the client when service returns.

## Safe test database

Both PostgreSQL integration tests and Playwright require a loopback database name ending `_test`. Playwright truncates only application tables in that database and seeds fixed test Admin/Agent accounts and knowledge. Never set `TEST_DATABASE_URL` to a shared, developer-local, or production database.
