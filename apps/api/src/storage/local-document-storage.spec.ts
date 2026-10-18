import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalDocumentStorage } from './local-document-storage';

describe('LocalDocumentStorage', () => {
  let root: string;
  let storage: LocalDocumentStorage;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'support-docs-'));
    storage = new LocalDocumentStorage(root);
  });

  afterEach(async () => rm(root, { recursive: true, force: true }));

  it('generates opaque keys, stores private files under its root, and deletes them', async () => {
    const content = Buffer.from('private support knowledge');
    const key = await storage.put(content, '.txt');
    expect(key).toMatch(/^[0-9a-f-]{36}\.txt$/);
    expect(await readFile(join(root, key))).toEqual(content);
    await storage.delete(key);
    await expect(readFile(join(root, key))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects traversal keys and unsupported extensions', async () => {
    expect(() => storage.open('../outside.txt')).toThrow('Invalid storage key.');
    await expect(storage.put(Buffer.from('x'), '.html')).rejects.toThrow('Unsupported document extension.');
  });
});
