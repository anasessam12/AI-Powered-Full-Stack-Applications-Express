import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Req, UnauthorizedException, UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/auth.types';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { SessionGuard } from '../auth/guards/session.guard';
import { ArchiveConversationDto, CreateConversationDto } from './conversation.dto';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
@UseGuards(SessionGuard)
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) { return this.conversations.list(this.currentUser(request)); }

  @Post()
  @UseGuards(CsrfGuard)
  create(@Req() request: AuthenticatedRequest, @Body() body: CreateConversationDto) {
    return this.conversations.create(this.currentUser(request), body.title);
  }

  @Get(':id/messages')
  messages(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.conversations.listMessages(this.currentUser(request), id);
  }

  @Get(':id')
  get(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.conversations.get(this.currentUser(request), id);
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  archive(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() body: ArchiveConversationDto) {
    return this.conversations.setArchived(this.currentUser(request), id, body.archived);
  }

  @Delete(':id')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.conversations.remove(this.currentUser(request), id);
  }

  private currentUser(request: AuthenticatedRequest) {
    const user = request.authSession?.user;
    if (!user) throw new UnauthorizedException('Authentication required.');
    return user;
  }
}
