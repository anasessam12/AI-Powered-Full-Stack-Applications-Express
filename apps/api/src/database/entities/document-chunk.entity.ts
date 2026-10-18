import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'document_chunks' })
@Index('document_chunks_document_ordinal_uq', ['documentId', 'ordinal'], { unique: true })
export class DocumentChunk {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId!: string;

  @Column({ type: 'integer' })
  ordinal!: number;

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'page_number', type: 'integer', nullable: true })
  pageNumber!: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  section!: string | null;

  @Column({ name: 'search_vector', type: 'tsvector', select: false, default: "' '::tsvector" })
  searchVector!: string;
}
