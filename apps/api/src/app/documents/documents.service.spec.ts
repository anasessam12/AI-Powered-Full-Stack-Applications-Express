import { Repository } from 'typeorm';
import { Document } from '../../database/entities/document.entity';
import { DocumentChunk } from '../../database/entities/document-chunk.entity';
import { DocumentStorage } from '../../storage/document-storage';
import { DocumentsService } from './documents.service';

describe('DocumentsService storage lifecycle', () => {
  const file = {
    originalname: 'policy.txt',
    mimetype: 'text/plain',
    size: Buffer.byteLength('Refunds are available.'),
    buffer: Buffer.from('Refunds are available.'),
  };
  const actor = { id: '1e3aa3b0-c7bf-436a-903a-e361eb3219bb' } as never;

  function createService(storage: Partial<DocumentStorage>, save: jest.Mock = jest.fn()) {
    const documents = {
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save,
    } as unknown as Repository<Document>;
    const chunks = {} as Repository<DocumentChunk>;
    return {
      service: new DocumentsService(documents, chunks, storage as DocumentStorage),
      documents,
    };
  }

  beforeEach(() => {
    delete process.env.DOCUMENT_MAX_BYTES;
  });

  it('does not create a database row when storage rejects the upload', async () => {
    const storage = { put: jest.fn().mockRejectedValue(new Error('storage unavailable')) };
    const { service, documents } = createService(storage);

    await expect(service.create(file, actor)).rejects.toThrow('storage unavailable');
    expect(documents.save).not.toHaveBeenCalled();
  });

  it('removes the stored bytes when the database rejects document creation', async () => {
    const storage = { put: jest.fn().mockResolvedValue('opaque.txt'), delete: jest.fn().mockResolvedValue(undefined) };
    const save = jest.fn().mockRejectedValue({ driverError: { code: '23505' } });
    const { service } = createService(storage, save);

    await expect(service.create(file, actor)).rejects.toMatchObject({ status: 409 });
    expect(storage.delete).toHaveBeenCalledWith('opaque.txt');
  });
});
