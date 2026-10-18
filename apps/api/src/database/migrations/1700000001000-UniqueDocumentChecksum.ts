import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueDocumentChecksum1700000001000 implements MigrationInterface {
  name = 'UniqueDocumentChecksum1700000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX documents_checksum_sha256_idx');
    await queryRunner.query('CREATE UNIQUE INDEX documents_checksum_sha256_uq ON documents(checksum_sha256)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX documents_checksum_sha256_uq');
    await queryRunner.query('CREATE INDEX documents_checksum_sha256_idx ON documents(checksum_sha256)');
  }
}
