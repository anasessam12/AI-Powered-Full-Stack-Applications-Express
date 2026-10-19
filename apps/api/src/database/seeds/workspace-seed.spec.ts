import { DataSource, Repository } from 'typeorm';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { verifyPassword } from '../../security/password-hasher';
import { Document } from '../entities/document.entity';
import { DocumentChunk } from '../entities/document-chunk.entity';
import { User } from '../entities/user.entity';
import { WORKSPACE_SEED_ACCOUNTS } from './workspace-seed';
import { seedWorkspace } from './workspace-seed';
import { DocumentsService } from '../../app/documents/documents.service';

function unopenedDataSource(url: string): DataSource {
  return { options: { url }, getRepository: jest.fn() } as unknown as DataSource;
}

function memoryDataSource(url: string) {
  function repository<T extends { id?: string }>(Entity: new () => T) {
    const rows: T[] = [];
    return {
      rows,
      create(values: Partial<T>) { return Object.assign(new Entity(), values); },
      async findOneBy(criteria: Partial<T>) {
        return rows.find((row) => Object.entries(criteria).every(([key, value]) => row[key as keyof T] === value)) ?? null;
      },
      async save(value: T | T[]) {
        const batch = Array.isArray(value) ? value : [value];
        for (const row of batch) {
          row.id ??= randomUUID();
          if (!rows.includes(row)) rows.push(row);
        }
        return Array.isArray(value) ? batch : batch[0];
      },
    };
  }

  const userRepository = repository(User);
  const documentRepository = repository(Document);
  const chunkRepository = repository(DocumentChunk);
  const repositories = new Map<unknown, unknown>([
    [User, userRepository], [Document, documentRepository], [DocumentChunk, chunkRepository],
  ]);
  const manager = { getRepository: (entity: unknown) => repositories.get(entity) };
  const source = {
    options: { url },
    transaction: async (work: (value: typeof manager) => Promise<unknown>) => work(manager),
  } as unknown as DataSource;
  return { source, userRepository, documentRepository, chunkRepository };
}

describe('seedWorkspace target guards', () => {
  it('refuses production local seeding before touching repositories', async () => {
    const source = unopenedDataSource('postgresql://support_app:secret@localhost:5432/teamWorkspace');
    await expect(seedWorkspace(source, 'local', {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://support_app:secret@localhost:5432/teamWorkspace',
    })).rejects.toThrow(/production/i);
    expect(source.getRepository).not.toHaveBeenCalled();
  });

  it('refuses remote local seeding before touching repositories', async () => {
    const source = unopenedDataSource('postgresql://support_app:secret@db.example.com:5432/teamWorkspace');
    await expect(seedWorkspace(source, 'local', {
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://support_app:secret@db.example.com:5432/teamWorkspace',
    })).rejects.toThrow(/loopback/i);
    expect(source.getRepository).not.toHaveBeenCalled();
  });

  it('refuses a test URL without the _test suffix before touching repositories', async () => {
    const source = unopenedDataSource('postgresql://support_app:secret@localhost:5432/teamWorkspace');
    await expect(seedWorkspace(source, 'test', {
      TEST_DATABASE_URL: 'postgresql://support_app:secret@localhost:5432/teamWorkspace',
    })).rejects.toThrow(/_test/);
    expect(source.getRepository).not.toHaveBeenCalled();
  });
});

describe('seedWorkspace idempotency', () => {
  it('creates both role accounts and searchable knowledge once without replacing an existing password', async () => {
    const root = await mkdtemp(join(tmpdir(), 'team-workspace-seed-'));
    const databaseUrl = 'postgresql://support_app:secret@localhost:5432/teamWorkspace';
    const env = { NODE_ENV: 'development', DATABASE_URL: databaseUrl, DOCUMENT_STORAGE_ROOT: root };
    const memory = memoryDataSource(databaseUrl);
    const ingest = jest.spyOn(DocumentsService.prototype, 'create').mockImplementation(async function (file, actor) {
      const documents = this['documents'] as Repository<Document>;
      const chunks = this['chunks'] as Repository<DocumentChunk>;
      const checksumSha256 = createHash('sha256').update(file.buffer).digest('hex');
      const document = await documents.save(documents.create({
        id: randomUUID(), ownerUserId: actor.id, displayName: file.originalname,
        checksumSha256, status: 'INDEXED',
      } as Partial<Document>)) as Document;
      await chunks.save(chunks.create({ documentId: document.id, content: file.buffer.toString('utf8') } as Partial<DocumentChunk>));
      return { id: document.id, displayName: document.displayName, status: document.status };
    });
    try {
      await expect(seedWorkspace(memory.source, 'local', env)).resolves.toEqual({ usersCreated: 2, documentsCreated: 4 });
      const users = memory.userRepository.rows;
      const admin = users.find((user) => user.username === 'workspace.admin');
      if (!admin) throw new Error('Seeded Admin was not stored.');
      expect(users).toHaveLength(2);
      expect(admin.passwordHash).toMatch(/^\$argon2id\$/);
      expect(await verifyPassword(admin.passwordHash, WORKSPACE_SEED_ACCOUNTS.local[0].password)).toBe(true);
      expect(memory.documentRepository.rows).toHaveLength(4);
      expect(memory.documentRepository.rows.every((document) => document.status === 'INDEXED')).toBe(true);
      expect(memory.chunkRepository.rows.some((chunk) => chunk.content.includes('Change a password immediately'))).toBe(true);
      expect(ingest).toHaveBeenCalledTimes(4);

      const originalHash = admin.passwordHash;
      admin.passwordHash = '$argon2id$manually-changed-hash';
      await expect(seedWorkspace(memory.source, 'local', env)).resolves.toEqual({ usersCreated: 0, documentsCreated: 0 });
      expect(users).toHaveLength(2);
      expect(memory.documentRepository.rows).toHaveLength(4);
      expect(ingest).toHaveBeenCalledTimes(4);
      expect(admin.passwordHash).not.toBe(originalHash);
      expect(admin.passwordHash).toBe('$argon2id$manually-changed-hash');
    } finally {
      ingest.mockRestore();
      await rm(root, { recursive: true, force: true });
    }
  });
});
