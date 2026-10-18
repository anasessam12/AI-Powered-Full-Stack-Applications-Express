import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Raw, Repository } from 'typeorm';
import { Citation, Conversation, Message, MessageRole, MessageStatus, User } from '../../database/entities';
import { LLM_PROVIDER, LlmProvider, LlmProviderError } from '../../llm/llm-provider';
import { AnswerPolicy } from '../retrieval/answer-policy';
import { RetrievalService } from '../retrieval/retrieval.service';
import { SendChatMessageDto } from './chat.dto';

export type ChatEvent =
  | { type: 'message.started'; conversationId: string; userMessageId: string; messageId: string }
  | { type: 'message.delta'; conversationId: string; messageId: string; delta: string }
  | { type: 'citations'; conversationId: string; messageId: string; citations: Array<Record<string, unknown>> }
  | { type: 'message.completed'; conversationId: string; messageId: string }
  | { type: 'message.failed'; conversationId: string; messageId: string; code: string };

@Injectable()
export class ChatService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Conversation) private readonly conversations: Repository<Conversation>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    @InjectRepository(Citation) private readonly citations: Repository<Citation>,
    private readonly retrieval: RetrievalService,
    private readonly answerPolicy: AnswerPolicy,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
  ) {}

  async run(user: User, input: SendChatMessageDto, signal: AbortSignal, emit: (event: ChatEvent) => void): Promise<void> {
    const text = input.message.trim();
    if (!text) throw new BadRequestException('A message is required.');
    if (text.includes('\0')) throw new BadRequestException('The message contains an invalid character.');
    const existing = await this.messages.findOneBy({ userId: user.id, requestId: input.requestId });
    if (existing) {
      await this.replay(existing, text, input.conversationId, emit);
      return;
    }

    const created = await this.createTurn(user, input, text);
    if (created.replayed) {
      await this.replay(created.userMessage, text, input.conversationId, emit);
      return;
    }
    emit({ type: 'message.started', conversationId: created.conversation.id, userMessageId: created.userMessage.id, messageId: created.assistantMessage.id });
    let answer = '';
    try {
      const chunks = await this.retrieval.search([...text].slice(0, 500).join(''));
      const prepared = this.answerPolicy.prepare(text, chunks);
      if (prepared.decision === 'ABSTAIN') {
        const abstention = prepared.abstention;
        if (!abstention) throw new Error('The abstention policy returned no response.');
        answer = abstention;
        emit({ type: 'message.delta', conversationId: created.conversation.id, messageId: created.assistantMessage.id, delta: answer });
      } else {
        if (!prepared.systemInstruction || !prepared.context) throw new Error('The answer policy returned no evidence context.');
        for await (const event of this.llm.stream({
          system: prepared.systemInstruction, question: text, context: prepared.context, signal,
        })) {
          if (signal.aborted) throw new LlmProviderError('CANCELLED', 'The request was cancelled.');
          answer += event.text;
          emit({ type: 'message.delta', conversationId: created.conversation.id, messageId: created.assistantMessage.id, delta: event.text });
        }
        if (!answer.trim()) throw new LlmProviderError('INVALID_STREAM', 'The provider returned no answer.');
      }

      await this.finishTurn(created, user, answer, prepared.citations);
      if (prepared.citations.length) {
        emit({
          type: 'citations', conversationId: created.conversation.id, messageId: created.assistantMessage.id,
          citations: prepared.citations.map((citation, index) => ({
            chunkId: citation.chunkId, documentId: citation.documentId, sourceName: citation.sourceName,
            pageNumber: citation.pageNumber, section: citation.section, rank: index + 1,
          })),
        });
      }
      emit({ type: 'message.completed', conversationId: created.conversation.id, messageId: created.assistantMessage.id });
    } catch (error) {
      const interrupted = signal.aborted || (error instanceof LlmProviderError && error.code === 'CANCELLED');
      created.assistantMessage.content = answer;
      created.assistantMessage.status = interrupted ? MessageStatus.INTERRUPTED : MessageStatus.FAILED;
      created.assistantMessage.completedAt = null;
      await this.messages.save(created.assistantMessage);
      emit({
        type: 'message.failed', conversationId: created.conversation.id, messageId: created.assistantMessage.id,
        code: interrupted ? 'CANCELLED' : error instanceof LlmProviderError ? error.code : 'UPSTREAM',
      });
    }
  }

  private async createTurn(user: User, input: SendChatMessageDto, text: string): Promise<{ conversation: Conversation; userMessage: Message; assistantMessage: Message; replayed?: boolean }> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const conversationRepository = manager.getRepository(Conversation);
        const messageRepository = manager.getRepository(Message);
        const conversation = input.conversationId
          ? await conversationRepository.findOneBy({ id: input.conversationId, userId: user.id })
          : await conversationRepository.save(conversationRepository.create({ userId: user.id, title: [...text].slice(0, 160).join(''), archivedAt: null }));
        if (!conversation) throw new NotFoundException('Conversation not found.');
        if (conversation.archivedAt) throw new ConflictException('Archived conversations cannot receive new messages.');
        const userMessage = await messageRepository.save(messageRepository.create({
          conversationId: conversation.id, userId: user.id, role: MessageRole.USER, content: text,
          status: MessageStatus.COMPLETED, requestId: input.requestId, providerMetadata: null, completedAt: new Date(),
        }));
        const assistantMessage = await messageRepository.save(messageRepository.create({
          conversationId: conversation.id, userId: user.id, role: MessageRole.ASSISTANT, content: '',
          status: MessageStatus.PENDING, requestId: null, providerMetadata: { requestId: input.requestId }, completedAt: null,
        }));
        conversation.updatedAt = new Date();
        await conversationRepository.save(conversation);
        return { conversation, userMessage, assistantMessage };
      });
    } catch (error) {
      if ((error as QueryFailedError & { driverError?: { code?: string } }).driverError?.code === '23505') {
        const existing = await this.messages.findOneBy({ userId: user.id, requestId: input.requestId });
        if (existing) return this.createTurnReplay(existing, text, input.conversationId);
      }
      throw error;
    }
  }

  private async createTurnReplay(existing: Message, text: string, requestedConversationId?: string): Promise<{ conversation: Conversation; userMessage: Message; assistantMessage: Message; replayed: true }> {
    if (existing.content !== text || (requestedConversationId && existing.conversationId !== requestedConversationId)) {
      throw new ConflictException('The request id has already been used for another message.');
    }
    const conversation = await this.conversations.findOneBy({ id: existing.conversationId, userId: existing.userId });
    if (!conversation) throw new NotFoundException('Conversation not found.');
    const assistantMessage = await this.messages.findOne({
      where: {
        conversationId: conversation.id,
        userId: existing.userId,
        role: MessageRole.ASSISTANT,
        providerMetadata: Raw((alias) => `${alias} ->> 'requestId' = :requestId`, { requestId: existing.requestId }),
      },
    });
    if (!assistantMessage || assistantMessage.status === MessageStatus.PENDING) throw new ConflictException('The original request is still in progress.');
    return { conversation, userMessage: existing, assistantMessage, replayed: true };
  }

  private async replay(existing: Message, text: string, requestedConversationId: string | undefined, emit: (event: ChatEvent) => void): Promise<void> {
    if (existing.content !== text || (requestedConversationId && existing.conversationId !== requestedConversationId)) {
      throw new ConflictException('The request id has already been used for another message.');
    }
    if (existing.status === MessageStatus.PENDING) throw new ConflictException('The original request is still in progress.');
    const conversation = await this.conversations.findOneBy({ id: existing.conversationId, userId: existing.userId });
    if (!conversation) throw new NotFoundException('Conversation not found.');
    const assistant = await this.messages.findOne({
      where: {
        conversationId: conversation.id,
        userId: existing.userId,
        role: MessageRole.ASSISTANT,
        providerMetadata: Raw((alias) => `${alias} ->> 'requestId' = :requestId`, { requestId: existing.requestId }),
      },
    });
    if (!assistant) throw new ConflictException('The original response is unavailable.');
    if (assistant.status === MessageStatus.PENDING) throw new ConflictException('The original request is still in progress.');
    emit({ type: 'message.started', conversationId: conversation.id, userMessageId: existing.id, messageId: assistant.id });
    if (assistant.status !== MessageStatus.COMPLETED) {
      emit({ type: 'message.failed', conversationId: conversation.id, messageId: assistant.id, code: assistant.status });
      return;
    }
    if (assistant.content) emit({ type: 'message.delta', conversationId: conversation.id, messageId: assistant.id, delta: assistant.content });
    const citations = await this.citations.find({ where: { messageId: assistant.id }, order: { rank: 'ASC' } });
    if (citations.length) emit({
      type: 'citations', conversationId: conversation.id, messageId: assistant.id,
      citations: citations.map((citation) => ({ chunkId: citation.chunkId, documentId: citation.documentId, sourceName: citation.displaySource, pageNumber: citation.pageNumber, section: citation.section, rank: citation.rank })),
    });
    emit({ type: 'message.completed', conversationId: conversation.id, messageId: assistant.id });
  }

  private async finishTurn(
    created: { conversation: Conversation; userMessage: Message; assistantMessage: Message },
    user: User,
    answer: string,
    citations: Array<{ chunkId: string; documentId: string; sourceName: string; pageNumber: number | null; section: string | null; score: number }>,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const messageRepository = manager.getRepository(Message);
      created.assistantMessage.content = answer;
      created.assistantMessage.status = MessageStatus.COMPLETED;
      created.assistantMessage.completedAt = new Date();
      await messageRepository.save(created.assistantMessage);
      if (citations.length) {
        const citationRepository = manager.getRepository(Citation);
        await citationRepository.save(citations.map((citation, index) => citationRepository.create({
          messageId: created.assistantMessage.id, documentId: citation.documentId, chunkId: citation.chunkId,
          displaySource: citation.sourceName, pageNumber: citation.pageNumber, section: citation.section,
          rank: index + 1, score: citation.score,
        })));
      }
      const conversation = manager.getRepository(Conversation).create({ ...created.conversation, userId: user.id, updatedAt: new Date() });
      await manager.getRepository(Conversation).save(conversation);
    });
  }
}
