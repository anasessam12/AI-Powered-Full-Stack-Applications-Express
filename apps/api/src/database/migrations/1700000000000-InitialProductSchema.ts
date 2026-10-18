import { MigrationInterface, QueryRunner } from 'typeorm';

/** Initial durable schema for the single-organization support assistant. */
export class InitialProductSchema1700000000000 implements MigrationInterface {
  name = 'InitialProductSchema1700000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        username varchar(64) NOT NULL,
        normalized_username varchar(64) NOT NULL,
        password_hash varchar(255) NOT NULL,
        role varchar(16) NOT NULL CHECK (role IN ('ADMIN', 'AGENT')),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT users_normalized_username_uq UNIQUE (normalized_username)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash char(64) NOT NULL UNIQUE,
        csrf_token_hash char(64) NOT NULL,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        last_seen_at timestamptz
      )
    `);
    await queryRunner.query('CREATE INDEX sessions_user_id_idx ON sessions(user_id)');
    await queryRunner.query('CREATE INDEX sessions_expires_at_idx ON sessions(expires_at)');

    await queryRunner.query(`
      CREATE TABLE documents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        display_name varchar(255) NOT NULL,
        storage_key varchar(512) NOT NULL UNIQUE,
        mime_type varchar(127) NOT NULL,
        byte_size bigint NOT NULL CHECK (byte_size > 0),
        checksum_sha256 char(64) NOT NULL,
        status varchar(16) NOT NULL CHECK (status IN ('PROCESSING', 'INDEXED', 'FAILED')),
        error_code varchar(64),
        deleted_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query('CREATE INDEX documents_status_idx ON documents(status)');
    await queryRunner.query('CREATE INDEX documents_checksum_sha256_idx ON documents(checksum_sha256)');

    await queryRunner.query(`
      CREATE TABLE document_chunks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        ordinal integer NOT NULL CHECK (ordinal >= 0),
        content text NOT NULL,
        page_number integer CHECK (page_number IS NULL OR page_number > 0),
        section varchar(255),
        search_vector tsvector NOT NULL DEFAULT ''::tsvector,
        CONSTRAINT document_chunks_document_ordinal_uq UNIQUE (document_id, ordinal)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX document_chunks_search_vector_idx ON document_chunks USING GIN (search_vector)',
    );

    await queryRunner.query(`
      CREATE TABLE conversations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        title varchar(160) NOT NULL,
        archived_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT conversations_id_user_id_uq UNIQUE (id, user_id)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX conversations_user_updated_idx ON conversations(user_id, updated_at DESC)',
    );

    await queryRunner.query(`
      CREATE TABLE messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id uuid NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        role varchar(16) NOT NULL CHECK (role IN ('USER', 'ASSISTANT')),
        content text NOT NULL,
        status varchar(16) NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'INTERRUPTED')),
        request_id uuid,
        provider_metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz,
        CONSTRAINT messages_conversation_owner_fk
          FOREIGN KEY (conversation_id, user_id)
          REFERENCES conversations(id, user_id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX messages_conversation_created_idx ON messages(conversation_id, created_at)',
    );
    await queryRunner.query(
      "CREATE UNIQUE INDEX messages_user_request_uq ON messages(user_id, request_id) WHERE role = 'USER' AND request_id IS NOT NULL",
    );

    await queryRunner.query(`
      CREATE TABLE citations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
        chunk_id uuid REFERENCES document_chunks(id) ON DELETE SET NULL,
        display_source varchar(255) NOT NULL,
        page_number integer CHECK (page_number IS NULL OR page_number > 0),
        section varchar(255),
        rank integer NOT NULL CHECK (rank > 0),
        score double precision CHECK (score IS NULL OR score >= 0)
      )
    `);
    await queryRunner.query('CREATE INDEX citations_message_rank_idx ON citations(message_id, rank)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'citations',
      'messages',
      'conversations',
      'document_chunks',
      'documents',
      'sessions',
      'users',
    ]) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table}`);
    }
  }
}
