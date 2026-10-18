import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Citation } from './entities/citation.entity';
import { Conversation } from './entities/conversation.entity';
import { DocumentChunk } from './entities/document-chunk.entity';
import { Document } from './entities/document.entity';
import { Message } from './entities/message.entity';
import { Session } from './entities/session.entity';
import { User } from './entities/user.entity';
import { InitialProductSchema1700000000000 } from './migrations/1700000000000-InitialProductSchema';
import { UniqueDocumentChecksum1700000001000 } from './migrations/1700000001000-UniqueDocumentChecksum';
import { SearchVectorTrigger1700000002000 } from './migrations/1700000002000-SearchVectorTrigger';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be configured before running database commands.');
}

const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: [User, Session, Document, DocumentChunk, Conversation, Message, Citation],
  migrations: [InitialProductSchema1700000000000, UniqueDocumentChecksum1700000001000, SearchVectorTrigger1700000002000],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  migrationsRun: false,
  installExtensions: false,
});

export default AppDataSource;
