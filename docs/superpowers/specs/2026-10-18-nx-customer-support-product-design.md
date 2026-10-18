# Nx Customer Support Assistant — Product Design

**Status:** Design approved by user; implementation plan pending review  
**Date:** 2026-10-18  
**Product scope:** Full-stack internal customer-support knowledge assistant

## 1. Goal

Replace the current Express/SQLite/single-page demo with a maintainable Nx monorepo containing an Angular application, a NestJS API, and PostgreSQL. Deliver a usable internal product with real accounts, role-based access, document ingestion, grounded AI chat, citations, and persisted conversation history. Preserve the recognizable Admin/Agent workflow from the demo while making its authentication and backend real.

This is a modular monolith for one organization. It is not a customer-facing support portal or a microservices platform.

## 2. Users and permissions

- **Admin:** signs in, manages users, uploads and deletes knowledge documents, sees indexing status, and uses chat/history.
- **Agent:** signs in, searches the approved knowledge base through chat, sees citations, and manages their own conversations.
- Users are provisioned by an Admin. Public self-registration and password reset are out of scope for v1.
- Login uses a unique username and password. Passwords are stored using a modern adaptive password hash; plaintext passwords are never persisted or logged. Sessions are revocable, expire, and are associated with a user and role. Authorization is enforced by the API on every protected operation.
- Optional seeded demo accounts may be provided only in development/test environments. They are not a production authentication mode and production startup must not create known default credentials.

## 3. Core user journeys

1. An Admin creates an account for an Agent; the Agent signs in with username and password.
2. An Admin uploads a supported PDF, TXT, or Markdown document. The API validates type and size, stores the file behind a storage adapter, extracts text, chunks it, indexes it, and exposes `processing`, `indexed`, or `failed` status. The Admin can retry or delete a failed/indexed document.
3. An Agent starts or resumes a conversation and submits a question. The API retrieves relevant chunks, calls the configured LLM provider, streams answer events and citations, and persists the user message, assistant response, and citation references.
4. A user lists and reopens only their own conversations. An Admin can manage users and documents, but does not automatically gain access to private Agent conversations.
5. If the LLM or ingestion provider fails, the UI reports a recoverable error; the system does not present a partial response as completed.

## 4. Architecture

Use an **integrated Nx workspace** with a modular monolith:

- `apps/web`: Angular application for login, Admin user/document management, Agent chat, citations, and conversation history.
- `apps/api`: NestJS HTTP API with feature modules for authentication/sessions, users, documents/ingestion, conversations/chat, retrieval, and health.
- `libs/api-contract`: API request/response contracts and generated or hand-maintained client types, with a single source of truth. Do not share server entities or persistence models with the browser.
- `libs/testing`: only shared test utilities that emerge from actual duplication; avoid speculative libraries and excessive workspace fragmentation.
- PostgreSQL is the durable source of truth. TypeORM entities and versioned migrations define relational schema changes. Repositories isolate persistence, and transactions protect related writes.
- Document storage is behind an interface. Local filesystem storage is for development; production storage is configured explicitly. Database records retain object key, checksum, MIME type, size, owner, and processing state. Files are not served from arbitrary user-supplied paths.
- LLM access is behind a provider interface. Provider credentials remain server-side. Tests use a deterministic fake provider; no real provider credential is required for local tests.
- Nx commands, dependency versions, Node compatibility, and Angular/Nest plugin compatibility are pinned and verified in the implementation plan before scaffold.

The existing Express application is a behavioral reference and migration source. Its chat flow, demo role selection, allowed document formats, SSE concepts, and citations inform the new product, but its username-only login and in-memory/empty conversation behavior are not treated as acceptable backend implementations.

## 5. API and interaction contract

Expose versioned REST endpoints documented with OpenAPI. The initial resource surface is:

- `/api/v1/auth/login`, `/api/v1/auth/logout`, `/api/v1/auth/session`
- `/api/v1/users` (Admin-only account provisioning and role management)
- `/api/v1/documents` (Admin-only upload, list/status, retry, and delete)
- `/api/v1/conversations`, `/api/v1/conversations/:id/messages`
- `/api/v1/chat` (authenticated streaming response)
- `/api/v1/health`

Use secure, HTTP-only, same-site session cookies with CSRF protection for browser-authenticated state-changing requests. Do not put bearer/session credentials in localStorage. Apply request validation, upload limits, consistent error responses, and authorization checks at the service boundary. Rate-limit login and chat endpoints and audit security-sensitive Admin actions without logging passwords, session secrets, prompts containing sensitive data, or provider credentials.

Chat streams over SSE using `fetch` with cookie credentials. Events include `message.started`, `message.delta`, `citations`, `message.completed`, and `message.failed`; each event has a conversation/message identifier and stable schema. The stream parser must handle arbitrary network chunk boundaries. Persist the user message before generation; finalize the assistant message and citations transactionally when possible, and mark interrupted/failed generations accurately. Reconnecting must not duplicate a user message or silently replay an answer.

## 6. Data model

Initial relational model:

- `User`: id, unique normalized username, password hash, role (`ADMIN` or `AGENT`), active flag, timestamps.
- `Session`: opaque token hash, user id, expiry, revocation and creation metadata.
- `Document`: owner, safe display name, storage key, content metadata/checksum, processing status, error code, timestamps.
- `DocumentChunk`: document id, ordinal, extracted text, page/section metadata, and PostgreSQL full-text search representation.
- `Conversation`: owner user id, title, timestamps, archive state.
- `Message`: conversation id, role, content, status, provider/model metadata where safe, timestamps.
- `Citation`: assistant message id, document/chunk ids, display source and page/section references, retrieval rank/score where appropriate.

Use foreign keys and indexes for ownership, ordering, session expiry, document status, and retrieval. Delete behavior must be explicit: deleting a document removes or invalidates its chunks and prevents future citations while preserving past message text; conversation deletion follows a documented retention policy. No multi-tenant schema is required in v1.

## 7. Retrieval and answer quality

Start with PostgreSQL full-text search over extracted chunks, with deterministic ranking and bounded context assembly. Preserve source and page/section metadata through retrieval to citations. Do not claim an answer is grounded when no relevant sources are found; return a clear insufficient-evidence response. Establish a small, versioned evaluation corpus and acceptance checks for retrieval relevance, citation correctness, and injection-resilient handling of document content before considering embeddings/pgvector. Embeddings and external vector services are out of initial scope unless evaluation demonstrates a concrete need.

## 8. UX and accessibility

Retain the current core workflow—sign in, manage knowledge documents, ask questions, inspect citations—but replace demo-only states with production-shaped loading, empty, validation, permission, retry, and failure states. The Angular interface must be responsive, keyboard operable, label form controls, expose status updates accessibly, and provide readable source references. Admin and Agent capabilities should be visible according to role while the API remains the security authority. Apply the Impeccable frontend workflow during the UI design/implementation stage.

## 9. Security and operational requirements

- Secrets come from environment/configuration and are excluded from source control. Provide `.env.example` with names and safe placeholders only.
- Apply password hashing, session rotation/revocation/expiry, CSRF protection, login throttling, authorization, and safe upload validation.
- Restrict CORS/origins for deployment. Set secure cookie flags in production. Use TLS at the deployment boundary.
- Add structured logs with request correlation and redaction; avoid logging document bodies, passwords, session tokens, and raw prompts by default.
- Provide health/readiness checks, graceful shutdown, migrations, seed tooling, local PostgreSQL Compose setup, and documented backup/restore expectations.
- No cloud deployment, public customer portal, SSO integration, billing, email workflows, or multi-organization tenancy is required for v1.

## 10. Verification and acceptance criteria

The product is acceptable when:

1. A clean checkout can start local PostgreSQL, apply migrations, create an initial Admin through a safe documented setup command, and run the Angular and NestJS apps using documented Nx commands.
2. Real username/password login works; invalid credentials are rejected, password hashes are stored, sessions expire/revoke, and unauthenticated requests are denied.
3. Admin-only user/document operations reject Agent requests at the API boundary.
4. Valid documents can be uploaded, processed, searched, cited, retried after failure, and deleted. Invalid/oversized files are rejected safely.
5. Agents can create, stream, persist, list, and reopen conversations; messages and citations remain after application restart and are isolated by owner.
6. SSE works across chunk boundaries and reports provider failures/interruption without marking incomplete output as successful.
7. Automated checks include unit tests for policy/retrieval logic, API integration tests against PostgreSQL, Angular tests for the primary states, and an end-to-end happy path plus role denial and provider failure.
8. Lint, type checks, production builds, and tests pass from a clean workspace; no secrets are committed.

## 11. Decisions and open implementation details

Approved product decisions: Nx integrated monorepo; Angular + NestJS + PostgreSQL; modular monolith; real username/password accounts; Admin/Agent roles; durable documents, messages, conversations, and citations; PostgreSQL full-text retrieval first; no customer portal or SSO in v1.

The implementation plan must verify and pin compatible tool versions, choose exact upload/storage libraries and file limits, define password/session parameters and initial Admin bootstrap, establish concrete request/response schemas and SSE examples, and select supported extraction libraries. These details must not weaken the security or acceptance requirements above.
