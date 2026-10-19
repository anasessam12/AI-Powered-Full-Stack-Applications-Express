# Phase 04 — Secure document ingestion and library

**Status:** Delivered. **Source phase:** original product implementation Task 4.

## Objective

Let Admins add support material that is safely stored, extracted, chunked, and indexed.

## Delivered scope

- Admin upload/retry/delete and session-only document listing.
- UUID-keyed private local storage, 20 MiB maximum, strict filename/type/MIME/PDF signature/UTF-8 checks, and SHA-256 duplicate prevention.
- PDF page-aware extraction, TXT/Markdown extraction, bounded overlapping chunks with section/page metadata, sanitized failed status, and cleanup on deletion.

## API, data, and UI boundaries

- Admin controls the library. Uploaded files are held by `DocumentStorage`, not PostgreSQL blobs.
- `documents` stores metadata/checksum/status; `document_chunks` stores text and index fields.
- API validates content and the browser reports upload/processing outcomes.

## Acceptance criteria

- Supported uploads become `INDEXED`; duplicate content is rejected.
- Invalid, oversized, spoofed, or malformed files fail safely.
- Retry and delete operate on document lifecycle and storage.

## Verification evidence

Historical log records format, size, MIME, traversal, checksum, retry, access, and storage cleanup tests; an authenticated PDF upload reached `INDEXED` against PostgreSQL.

## Known limits and links

Supported inputs are PDF, TXT, and Markdown. See [implementation history](../../product/implementation-log.md), [documents API](../../../apps/api/src/app/documents/), [local storage](../../../apps/api/src/storage/local-document-storage.ts), and [chunker](../../../apps/api/src/app/retrieval/chunking/document-chunker.ts).
