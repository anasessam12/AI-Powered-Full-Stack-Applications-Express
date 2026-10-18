import { MigrationInterface, QueryRunner } from 'typeorm';

export class SearchVectorTrigger1700000002000 implements MigrationInterface {
  name = 'SearchVectorTrigger1700000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE FUNCTION document_chunks_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector := to_tsvector('simple', COALESCE(NEW.content, ''));
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER document_chunks_search_vector_trigger
      BEFORE INSERT OR UPDATE OF content ON document_chunks
      FOR EACH ROW EXECUTE FUNCTION document_chunks_search_vector_update()
    `);
    await queryRunner.query(`
      UPDATE document_chunks
      SET search_vector = to_tsvector('simple', COALESCE(content, ''))
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TRIGGER document_chunks_search_vector_trigger ON document_chunks');
    await queryRunner.query('DROP FUNCTION document_chunks_search_vector_update()');
    await queryRunner.query("ALTER TABLE document_chunks ALTER COLUMN search_vector SET DEFAULT ' '::tsvector");
  }
}
