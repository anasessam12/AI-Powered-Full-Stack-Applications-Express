import { Body, Controller, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../auth/auth.types';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { SessionGuard } from '../auth/guards/session.guard';
import { ChatEvent, ChatService } from './chat.service';
import { SendChatMessageDto } from './chat.dto';

@Controller('chat')
@UseGuards(SessionGuard, CsrfGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post()
  async send(
    @Req() request: AuthenticatedRequest & Request,
    @Res() response: Response,
    @Body() body: SendChatMessageDto,
  ): Promise<void> {
    const user = request.authSession?.user;
    if (!user) throw new UnauthorizedException('Authentication required.');
    const abort = new AbortController();
    const stopOnDisconnect = () => {
      if (!response.writableEnded) abort.abort();
    };
    request.once('aborted', stopOnDisconnect);
    response.once('close', stopOnDisconnect);
    let headersSent = false;
    let conversationId: string | undefined;
    let messageId: string | undefined;
    const emit = (event: ChatEvent) => {
      if (abort.signal.aborted || response.destroyed) return;
      conversationId = event.conversationId;
      messageId = event.messageId;
      if (!headersSent) {
        response.status(200);
        response.set({
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });
        response.flushHeaders();
        headersSent = true;
      }
      response.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    };

    try {
      await this.chat.run(user, body, abort.signal, emit);
      if (!response.writableEnded && !response.destroyed) response.end();
    } catch (error) {
      if (!headersSent) throw error;
      if (!response.destroyed && !response.writableEnded) {
        response.write(`event: message.failed\ndata: ${JSON.stringify({ type: 'message.failed', conversationId, messageId, code: 'UPSTREAM' })}\n\n`);
        response.end();
      }
    } finally {
      request.off('aborted', stopOnDisconnect);
      response.off('close', stopOnDisconnect);
    }
  }
}
