import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { DocumentStorage } from './document-storage';

export class LocalDocumentStorage implements DocumentStorage {
  private readonly root: string;

  constructor(root = process.env.DOCUMENT_STORAGE_ROOT ?? 'var/documents') {
    this.root = resolve(root);
  }

  async put(content: Buffer, extension: string): Promise<string> {
    if (!['.pdf', '.txt', '.md'].includes(extension)) throw new Error('Unsupported document extension.');
    const key = `${randomUUID()}${extension}`;
    const target = this.resolveKey(key);
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, content, { flag: 'wx', mode: 0o600 });
    return key;
  }

  open(key: string): Readable {
    return createReadStream(this.resolveKey(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true });
  }

  private resolveKey(key: string): string {
    if (!/^[0-9a-f-]{36}\.(pdf|txt|md)$/.test(key)) throw new Error('Invalid storage key.');
    const target = resolve(this.root, key);
    const fromRoot = relative(this.root, target);
    if (isAbsolute(fromRoot) || fromRoot === '..' || fromRoot.startsWith(`..${sep}`)) {
      throw new Error('Storage key escaped the configured root.');
    }
    return target;
  }
}
