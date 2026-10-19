# Database relationships

The schema is PostgreSQL and TypeORM-migration managed. `synchronize` remains disabled. The ER diagram reflects the foreign keys in `1700000000000-InitialProductSchema`; the checksum and search-vector migrations add uniqueness and search indexing.

```mermaid
erDiagram
  USERS ||--o{ SESSIONS : authenticates
  USERS ||--o{ DOCUMENTS : owns
  DOCUMENTS ||--o{ DOCUMENT_CHUNKS : indexes
  USERS ||--o{ CONVERSATIONS : owns
  CONVERSATIONS ||--o{ MESSAGES : contains
  USERS ||--o{ MESSAGES : authors
  MESSAGES ||--o{ CITATIONS : records
  DOCUMENTS o|--o{ CITATIONS : currently_references
  DOCUMENT_CHUNKS o|--o{ CITATIONS : currently_references

  USERS {
    uuid id PK
    varchar username
    varchar normalized_username UK
    varchar password_hash
    varchar role
    boolean is_active
  }
  SESSIONS {
    uuid id PK
    uuid user_id FK
    char token_hash UK
    char csrf_token_hash
    timestamptz expires_at
    timestamptz revoked_at
  }
  DOCUMENTS {
    uuid id PK
    uuid owner_user_id FK
    varchar display_name
    varchar storage_key UK
    char checksum_sha256 UK
    varchar status
    timestamptz deleted_at
  }
  DOCUMENT_CHUNKS {
    uuid id PK
    uuid document_id FK
    integer ordinal
    text content
    tsvector search_vector
  }
  CONVERSATIONS {
    uuid id PK
    uuid user_id FK
    varchar title
    timestamptz archived_at
  }
  MESSAGES {
    uuid id PK
    uuid conversation_id FK
    uuid user_id FK
    varchar role
    text content
    varchar status
    uuid request_id
  }
  CITATIONS {
    uuid id PK
    uuid message_id FK
    uuid document_id FK
    uuid chunk_id FK
    varchar display_source
    integer rank
  }
```

## Relationship rules

| Parent → child | Cardinality | Delete behavior / invariant |
| --- | --- | --- |
| users → sessions | 1 to many | `ON DELETE CASCADE`; token hash unique, user and expiry indexed. |
| users → documents | 1 to many | `ON DELETE RESTRICT`; owner is required. |
| documents → document_chunks | 1 to many | `ON DELETE CASCADE`; `(document_id, ordinal)` unique; GIN index covers `search_vector`. |
| users → conversations | 1 to many | `ON DELETE RESTRICT`; `(id,user_id)` unique supports ownership FK. |
| conversations → messages | 1 to many | Composite `(conversation_id,user_id)` FK references `(id,user_id)` and cascades on conversation delete. |
| users → messages | 1 to many | `ON DELETE RESTRICT`; duplicates conversation owner in FK to prevent cross-owner messages. |
| messages → citations | 1 to many | `ON DELETE CASCADE`; rank ordered per message by index. |
| documents/chunks → citations | 1 to many, nullable | `ON DELETE SET NULL`; citation source/page/section/rank/score snapshot remains. The schema has independent document and chunk FKs, not a composite check that the chunk belongs to that document. |

## Indexes and persistence notes

- Users: unique `normalized_username`.
- Sessions: unique `token_hash`; indexes on `user_id` and `expires_at`.
- Documents: unique `storage_key`; unique SHA-256 checksum (added by migration); status index.
- Chunks: unique `(document_id, ordinal)` and GIN `search_vector`; trigger refreshes the `simple` tsvector on insert or content update.
- Conversations: unique `(id,user_id)` and `(user_id, updated_at DESC)` index.
- Messages: `(conversation_id, created_at)` index and partial unique `(user_id, request_id)` for user messages with a request ID.
- Citations: `(message_id, rank)` index.

Original document bytes are stored via `DocumentStorage`; `storage_key` identifies them. PostgreSQL stores document metadata, chunk text, and evidence snapshots. See [initial migration](../../apps/api/src/database/migrations/1700000000000-InitialProductSchema.ts), [checksum migration](../../apps/api/src/database/migrations/1700000001000-UniqueDocumentChecksum.ts), and [search migration](../../apps/api/src/database/migrations/1700000002000-SearchVectorTrigger.ts).
