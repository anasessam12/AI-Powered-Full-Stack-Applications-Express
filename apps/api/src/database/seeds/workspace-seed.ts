import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DataSource, EntityManager } from 'typeorm';
import { chunkDocumentText } from '../../app/retrieval/chunking/document-chunker';
import { Document, DocumentStatus } from '../entities/document.entity';
import { DocumentChunk } from '../entities/document-chunk.entity';
import { User, UserRole } from '../entities/user.entity';
import { resolveDatabaseTarget, DatabaseMode } from '../database-target';
import { LocalDocumentStorage } from '../../storage/local-document-storage';
import { hashPassword } from '../../security/password-hasher';

export const WORKSPACE_SEED_ACCOUNTS = {
  local: [
    { username: 'workspace.admin', password: 'Team-workspace-admin-2026!', role: UserRole.ADMIN },
    { username: 'workspace.agent', password: 'Team-workspace-agent-2026!', role: UserRole.AGENT },
  ],
  test: [
    { username: 'support.e2e.admin', password: 'E2e-admin-password-91!', role: UserRole.ADMIN },
    { username: 'support.e2e.agent', password: 'E2e-agent-password-121!', role: UserRole.AGENT },
  ],
} as const;

type SeedResult = { usersCreated: number; documentsCreated: number };

function assertSourceTarget(dataSource: DataSource, mode: DatabaseMode, env: NodeJS.ProcessEnv): void {
  const target = resolveDatabaseTarget(mode, env);
  const sourceUrl = 'url' in dataSource.options ? dataSource.options.url : undefined;
  if (typeof sourceUrl !== 'string') throw new Error('Seed requires a data source configured with an explicit database URL.');
  const parsedSource = new URL(sourceUrl);
  const parsedTarget = new URL(target.connectionUrl);
  const sourceDatabase = decodeURIComponent(parsedSource.pathname.replace(/^\//, ''));
  const targetDatabase = decodeURIComponent(parsedTarget.pathname.replace(/^\//, ''));
  if (parsedSource.hostname !== parsedTarget.hostname || parsedSource.port !== parsedTarget.port || sourceDatabase !== targetDatabase) {
    throw new Error('Seed data source does not match the validated local/test database target.');
  }
}

async function seedAccounts(manager: EntityManager, mode: DatabaseMode): Promise<{ admin: User; usersCreated: number }> {
  const users = manager.getRepository(User);
  let admin: User | undefined;
  let usersCreated = 0;

  for (const account of WORKSPACE_SEED_ACCOUNTS[mode]) {
    const normalizedUsername = account.username.toLowerCase();
    let user = await users.findOneBy({ normalizedUsername });
    if (!user) {
      user = users.create({
        username: account.username,
        normalizedUsername,
        passwordHash: await hashPassword(account.password),
        role: account.role,
        isActive: true,
      });
      user = await users.save(user);
      usersCreated += 1;
    }
    if (account.role === UserRole.ADMIN) admin = user;
  }

  if (!admin) throw new Error('Seed administrator could not be resolved.');
  return { admin, usersCreated };
}

async function seedKnowledge(manager: EntityManager, owner: User, storage: LocalDocumentStorage): Promise<boolean> {
  const content = await readFile(resolve(__dirname, '../../../test/fixtures/seed/account-security.md'));
  const checksumSha256 = createHash('sha256').update(content).digest('hex');
  const documents = manager.getRepository(Document);
  if (await documents.findOneBy({ checksumSha256 })) return false;

  const storageKey = await storage.put(content, '.md');
  try {
    const document = await documents.save(documents.create({
      ownerUserId: owner.id,
      displayName: 'account-security.md',
      storageKey,
      mimeType: 'text/markdown',
      byteSize: String(content.length),
      checksumSha256,
      status: DocumentStatus.INDEXED,
      errorCode: null,
      deletedAt: null,
    }));
    const chunks = chunkDocumentText(content.toString('utf8'));
    await manager.getRepository(DocumentChunk).save(
      chunks.map((chunk) => manager.getRepository(DocumentChunk).create({ documentId: document.id, ...chunk })),
    );
    return true;
  } catch (error) {
    await storage.delete(storageKey);
    throw error;
  }
}

export async function seedWorkspace(
  dataSource: DataSource,
  mode: DatabaseMode,
  env: NodeJS.ProcessEnv = process.env,
): Promise<SeedResult> {
  assertSourceTarget(dataSource, mode, env);
  const storage = new LocalDocumentStorage(env.DOCUMENT_STORAGE_ROOT ?? 'var/documents');
  let result: SeedResult = { usersCreated: 0, documentsCreated: 0 };
  await dataSource.transaction(async (manager) => {
    const { admin, usersCreated } = await seedAccounts(manager, mode);
    const documentsCreated = await seedKnowledge(manager, admin, storage) ? 1 : 0;
    result = { usersCreated, documentsCreated };
  });
  return result;
}
