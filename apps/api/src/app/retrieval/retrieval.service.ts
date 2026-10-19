import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  content: string;
  sourceName: string;
  pageNumber: number | null;
  section: string | null;
  score: number;
}

interface RetrievalRow {
  chunkId: string;
  documentId: string;
  content: string;
  sourceName: string;
  pageNumber: number | null;
  section: string | null;
  score: number | string;
}

const MAX_RESULTS = 5;
const MAX_QUERY_CHARACTERS = 500;
const QUESTION_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'could', 'do', 'does', 'for', 'from',
  'have', 'how', 'if', 'in', 'is', 'it', 'may', 'of', 'on', 'or', 'should', 'the', 'to', 'what',
  'when', 'where', 'which', 'who', 'why', 'within', 'with',
]);

@Injectable()
export class RetrievalService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async search(query: string, limit = MAX_RESULTS): Promise<RetrievedChunk[]> {
    const normalized = query.trim();
    if (!normalized) return [];
    if (normalized.length > MAX_QUERY_CHARACTERS) {
      throw new BadRequestException(`Search query must be ${MAX_QUERY_CHARACTERS} characters or fewer.`);
    }
    const terms = (normalized.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
      .filter((term) => !QUESTION_STOP_WORDS.has(term));
    const boundedLimit = Math.min(MAX_RESULTS, Math.max(1, Math.floor(limit)));
    const rows = (await this.dataSource.query(
      `WITH search_query AS (
         SELECT replace(plainto_tsquery('simple', $2)::text, ' & ', ' | ')::tsquery AS value
       )
       SELECT
         chunk.id AS "chunkId",
         document.id AS "documentId",
         chunk.content AS "content",
         document.display_name AS "sourceName",
         chunk.page_number AS "pageNumber",
         chunk.section AS "section",
         CASE
           WHEN chunk.search_vector @@ search_query.value
             THEN ts_rank_cd(chunk.search_vector, search_query.value)
           ELSE 0.02
         END AS "score"
       FROM search_query
       JOIN document_chunks AS chunk
         ON chunk.search_vector @@ search_query.value
         OR (numnode(search_query.value) = 0 AND chunk.content ILIKE '%' || $1 || '%')
       JOIN documents AS document ON document.id = chunk.document_id
       WHERE document.status = 'INDEXED'
         AND document.deleted_at IS NULL
       ORDER BY "score" DESC, chunk.id ASC
       LIMIT $3`,
      [normalized, terms.join(' '), boundedLimit],
    )) as RetrievalRow[];

    return rows.map((row) => ({ ...row, score: Number(row.score) }));
  }
}
