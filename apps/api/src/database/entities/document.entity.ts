import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum DocumentStatus {
  PROCESSING = 'PROCESSING',
  INDEXED = 'INDEXED',
  FAILED = 'FAILED',
}

@Entity({ name: 'documents' })
@Index('documents_status_idx', ['status'])
@Index('documents_checksum_sha256_idx', ['checksumSha256'])
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 255 })
  displayName!: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 512, unique: true })
  storageKey!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 127 })
  mimeType!: string;

  @Column({ name: 'byte_size', type: 'bigint' })
  byteSize!: string;

  @Column({ name: 'checksum_sha256', type: 'char', length: 64 })
  checksumSha256!: string;

  @Column({ type: 'varchar', length: 16 })
  status!: DocumentStatus;

  @Column({ name: 'error_code', type: 'varchar', length: 64, nullable: true })
  errorCode!: string | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
