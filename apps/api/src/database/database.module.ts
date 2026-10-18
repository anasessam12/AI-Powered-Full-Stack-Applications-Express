import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Citation } from './entities/citation.entity';
import { Conversation } from './entities/conversation.entity';
import { DocumentChunk } from './entities/document-chunk.entity';
import { Document } from './entities/document.entity';
import { Message } from './entities/message.entity';
import { Session } from './entities/session.entity';
import { User } from './entities/user.entity';
import { InitialProductSchema1700000000000 } from './migrations/1700000000000-InitialProductSchema';
import { UniqueDocumentChecksum1700000001000 } from './migrations/1700000001000-UniqueDocumentChecksum';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [User, Session, Document, DocumentChunk, Conversation, Message, Citation],
        migrations: [InitialProductSchema1700000000000, UniqueDocumentChecksum1700000001000],
        migrationsTableName: 'typeorm_migrations',
        synchronize: false,
        migrationsRun: false,
        installExtensions: false,
        retryAttempts: 3,
        retryDelay: 1000,
        connectTimeoutMS: 5000,
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
