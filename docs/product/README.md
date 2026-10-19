# Fieldnote product overview

Fieldnote is a single-organization support knowledge workspace. Admins manage the team and approved source documents. Agents ask questions and receive streamed answers with citations. Angular is the web client; NestJS is the modular API; PostgreSQL stores users, sessions, document indexes, conversations, messages, and citation snapshots. Original files live in a private local storage directory.

## Main journeys

- **Admin:** sign in, create or update Admin/Agent accounts, upload and manage PDF/TXT/Markdown support sources, review their indexing status.
- **Agent:** sign in, ask a question, inspect streamed answer state and citations, open an authorized source, and return to saved conversation history.

The API enforces roles, CSRF, session ownership, validation, and evidence policy. The Angular guards improve navigation but are not a security boundary. LLM credentials stay in the API. See [architecture](architecture.md), [development](development.md), and [operations](operations.md).

## Specifications and feature guides

The implementation is described phase-by-phase in [phase specs](../specs/phases/phase-01-nx-foundation.md). Feature behavior is documented here:

- [Authentication and sessions](features/authentication-and-sessions.md)
- [User and role administration](features/user-and-role-administration.md)
- [Document ingestion and library](features/document-ingestion-and-library.md)
- [Retrieval and evidence policy](features/retrieval-and-evidence.md)
- [LLM provider boundary](features/llm-provider.md)
- [Streaming chat and citations](features/streaming-chat-and-citations.md)
- [Conversation history and ownership](features/conversation-history-and-ownership.md)
- [Health and operations](features/health-and-operations.md)
- [Database relationships](database.md)

## Data and local startup

The database schema is migration-managed; `synchronize` is disabled. See [database relationships](database.md). The intended local workflow is `npm run db:setup`, then `npm start`; scripts and actual machine setup are being completed in the approved cleanup plan. Local/test accounts are disposable and must never be used in production.
