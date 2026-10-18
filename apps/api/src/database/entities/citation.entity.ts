import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'citations' })
@Index('citations_message_rank_idx', ['messageId', 'rank'])
export class Citation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'message_id', type: 'uuid' })
  messageId!: string;

  @Column({ name: 'document_id', type: 'uuid', nullable: true })
  documentId!: string | null;

  @Column({ name: 'chunk_id', type: 'uuid', nullable: true })
  chunkId!: string | null;

  @Column({ name: 'display_source', type: 'varchar', length: 255 })
  displaySource!: string;

  @Column({ name: 'page_number', type: 'integer', nullable: true })
  pageNumber!: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  section!: string | null;

  @Column({ type: 'integer' })
  rank!: number;

  @Column({ type: 'double precision', nullable: true })
  score!: number | null;
}
