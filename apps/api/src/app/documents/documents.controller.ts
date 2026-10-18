import {
  Controller,
  Get,
  Delete,
  UseFilters,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthenticatedRequest } from '../auth/auth.types';
import { Response } from 'express';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SessionGuard } from '../auth/guards/session.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../database/entities/user.entity';
import { MulterExceptionFilter } from './multer-exception.filter';
import { DocumentsService, UploadedDocument } from './documents.service';

const MAX_MULTIPART_BYTES = 20 * 1024 * 1024;

@Controller('documents')
@UseGuards(SessionGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list() {
    return this.documents.list();
  }

  @Get(':id/content')
  async content(@Param('id', new ParseUUIDPipe()) id: string, @Res() response: Response): Promise<void> {
    const file = await this.documents.openContent(id);
    response.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.displayName).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    response.send(file.content);
  }

  @Post()
  @UseGuards(CsrfGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    preservePath: true,
    limits: { fileSize: MAX_MULTIPART_BYTES, files: 1, fields: 0 },
  }))
  @UseFilters(MulterExceptionFilter)
  create(@UploadedFile() file: UploadedDocument, @Req() request: AuthenticatedRequest) {
    if (!request.authSession) throw new UnauthorizedException();
    return this.documents.create(file, request.authSession.user);
  }

  @Post(':id/retry')
  @UseGuards(CsrfGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  retry(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.documents.retry(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(CsrfGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.documents.remove(id);
  }
}
