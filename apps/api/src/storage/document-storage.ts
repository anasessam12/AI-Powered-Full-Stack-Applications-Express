import { Readable } from 'node:stream';

export const DOCUMENT_STORAGE = Symbol('DOCUMENT_STORAGE');

export interface DocumentStorage {
  put(content: Buffer, extension: string): Promise<string>;
  open(key: string): Readable;
  delete(key: string): Promise<void>;
}
