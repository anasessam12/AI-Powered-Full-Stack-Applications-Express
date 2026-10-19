# Product Architecture

## Runtime shape

The product is an Nx integrated monorepo and a single-organization modular monolith:

- `apps/web`: Angular 22.2.3 customer-support workspace.
- `apps/api`: NestJS 11.2.7 versioned API; the global prefix is `/api/v1`.
- PostgreSQL 18 is the durable store. TypeORM entities and versioned migrations own schema changes; schema synchronization is disabled.
- `libs/api-contract`: browser-safe API contracts; server persistence entities are not shared with the browser.

The retired Express/SQLite workshop application is preserved as a short historical note under `docs/history/express-demo.md`; it is not part of the product runtime. `npm start` and `npm run dev` target the Angular product.

## Toolchain and compatibility

- Node.js: 24.21.0 (`.nvmrc`; Angular 22.2 requires Node 24.15+ on the Node 24 line).
- Nx and every `@nx/*` package: 23.3.0.
- Angular framework, CLI, compiler and build packages: 22.2.3. This patch line is used because npm audit reported an Angular Router high-severity advisory for versions before 22.2.0.
- NestJS runtime/testing packages: 11.2.7; Nest schematics: 11.1.0.
- TypeScript: 6.0.3; `@types/node`: 24.19.2.
- Local development connects to the native PostgreSQL service at `localhost:5432` by default. `DATABASE_ADMIN_URL` provisions a restricted `support_app` role and the exact-case `teamWorkspace` database; it does not change existing roles or drop databases.
- `package-lock.json` is authoritative for transitive package versions. Direct framework versions are exact in `package.json`.

Compatibility was checked against Nx's Angular matrix and Angular's Node/TypeScript requirements. The Angular app is client-rendered; no SSR project is generated.

## Boundaries

API feature modules own their controllers, DTOs, policy checks, services, and repositories. Auth/session, users, documents, conversations/chat, retrieval, and health remain modules in one Nest process. Provider credentials stay in the API process. Document storage and LLM access are abstracted so local/test adapters do not leak into browser code.

The initial schema creates users, sessions, documents/chunks, conversations/messages, and citations. Username uniqueness is enforced on the normalized value. Session token hashes are unique and indexed by expiry. A composite foreign key binds every message's user to its conversation owner. Conversation deletion cascades to its messages; deleting a document removes its chunks but sets citation document/chunk references to null, preserving the citation's display-source snapshot alongside historical message text. User deletion is restricted while owned data exists. Use migrations for schema changes; never enable TypeORM `synchronize` outside throwaway experiments.

Password credentials use Argon2id. The first Admin is created only by the interactive `npm run admin:create` command, which hides and confirms the password, serializes concurrent bootstrap attempts, and refuses if any Admin already exists. It never seeds a default account.

Documents are stored by a `DocumentStorage` adapter; the initial local adapter writes random UUID keys beneath `DOCUMENT_STORAGE_ROOT` with private file permissions. Uploads are capped at 20 MiB, type-checked, extracted with `pdf-parse` 2.x for PDFs or strict UTF-8 decoding for TXT/Markdown, split into bounded overlapping chunks, and indexed in PostgreSQL. `DOCUMENT_MAX_BYTES` may lower the cap. A unique checksum index rejects duplicate content. Deleting a document physically removes its storage bytes and chunks; database foreign keys null citation references while preserving historical message text and citation snapshots.

PostgreSQL full-text retrieval uses the `simple` text-search configuration for language-neutral lexical matching. Because PostgreSQL's default parser may produce no lexemes for some scripts, queries with no parsed terms also use a parameterized exact-substring fallback. A database trigger refreshes each chunk vector when content changes; retrieval ranks lexical matches by `ts_rank_cd`, breaks ties by chunk UUID, filters to indexed non-deleted documents, and returns at most five chunks. `AnswerPolicy` applies a relevance threshold, caps serialized context, marks retrieved content as untrusted JSON data, and abstains without enough evidence. The `LlmProvider` boundary has a deterministic test fake and an OpenRouter SSE adapter; its key and model are read only by the API, with bounded timeout, cancellation, and output size.
