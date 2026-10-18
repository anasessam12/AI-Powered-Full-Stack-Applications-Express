import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Document } from '../../database/entities/document.entity';
import { DocumentChunk } from '../../database/entities/document-chunk.entity';
import { DOCUMENT_STORAGE } from '../../storage/document-storage';
import { LocalDocumentStorage } from '../../storage/local-document-storage';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Document, DocumentChunk])],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    { provide: DOCUMENT_STORAGE, useFactory: () => new LocalDocumentStorage() },
  ],
})
export class DocumentsModule {}
