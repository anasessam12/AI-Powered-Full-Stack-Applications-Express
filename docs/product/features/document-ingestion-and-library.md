# Document ingestion and library

## User and journey

Admins upload approved PDF, TXT, or Markdown knowledge, review processing status, retry a failed index, or remove a source. Signed-in users can list the current library and open source bytes for a citation.

## API contract

- `GET /api/v1/documents` lists active document metadata for an authenticated user.
- `POST /api/v1/documents` accepts one multipart `file`; Admin plus CSRF required.
- `POST /api/v1/documents/:id/retry` and `DELETE /api/v1/documents/:id` are Admin mutations with CSRF.
- `GET /api/v1/documents/:id/content` streams an active source to an authenticated session.

## Persistence and security

The API validates basename, extension/MIME pairing, PDF signature, strict UTF-8, non-empty bytes, and the configured maximum (up to 20 MiB). SHA-256 prevents duplicate content. Original bytes are written under private UUID storage keys; PostgreSQL holds metadata and bounded overlapping text chunks. PDF extraction retains page numbers; Markdown headings become section metadata. The search-vector trigger indexes chunk text.

Source responses use private no-store caching, `nosniff`, and sandbox CSP. Storage keys are random and path traversal is rejected. Deletion removes bytes and chunks; citation display snapshots remain.

## Failure behavior and tests

Invalid/oversized files fail validation. Extraction failures produce a sanitized `FAILED` state that can be retried. Duplicate checksums conflict. See [document service](../../../apps/api/src/app/documents/documents.service.ts), [controller](../../../apps/api/src/app/documents/documents.controller.ts), and [storage adapter](../../../apps/api/src/storage/local-document-storage.ts).
