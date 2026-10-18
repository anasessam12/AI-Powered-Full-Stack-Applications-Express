import { QueryRunner } from 'typeorm';
import { InitialProductSchema1700000000000 } from './migrations/1700000000000-InitialProductSchema';

describe('InitialProductSchema1700000000000', () => {
  it('creates the complete relational model and its integrity constraints', async () => {
    const statements: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        statements.push(sql);
        return [];
      }),
    } as unknown as QueryRunner;

    await new InitialProductSchema1700000000000().up(queryRunner);

    const sql = statements.join('\n');
    for (const table of [
      'users',
      'sessions',
      'documents',
      'document_chunks',
      'conversations',
      'messages',
      'citations',
    ]) {
      expect(sql).toContain(`CREATE TABLE ${table}`);
    }
    expect(sql).toMatch(/UNIQUE\s*\(normalized_username\)/i);
    expect(sql).toMatch(/token_hash[^,]*UNIQUE/i);
    expect(sql).toMatch(/FOREIGN KEY\s*\(conversation_id, user_id\)[\s\S]*ON DELETE CASCADE/i);
    expect(sql).toMatch(/document_id uuid REFERENCES documents\(id\) ON DELETE SET NULL/i);
    expect(sql).toMatch(/USING GIN\s*\(search_vector\)/i);
    expect(sql).toMatch(/CREATE INDEX[^;]*sessions_expires_at_idx/i);
    expect(sql).toMatch(/CREATE INDEX[^;]*documents_status_idx/i);
  });

  it('drops dependent tables before referenced tables', async () => {
    const statements: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        statements.push(sql);
        return [];
      }),
    } as unknown as QueryRunner;

    await new InitialProductSchema1700000000000().down(queryRunner);

    expect(statements.map((sql) => sql.match(/DROP TABLE IF EXISTS (\w+)/i)?.[1])).toEqual([
      'citations',
      'messages',
      'conversations',
      'document_chunks',
      'documents',
      'sessions',
      'users',
    ]);
  });
});
