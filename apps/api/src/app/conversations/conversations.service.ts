import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Citation, Conversation, Message, User } from '../../database/entities';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation) private readonly conversations: Repository<Conversation>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    @InjectRepository(Citation) private readonly citations: Repository<Citation>,
  ) {}

  async create(user: User, title?: string): Promise<Omit<Conversation, 'userId'>> {
    const normalizedTitle = title ? [...title.trim()].slice(0, 160).join('') : 'New conversation';
    return this.toSafeConversation(await this.conversations.save(this.conversations.create({ userId: user.id, title: normalizedTitle, archivedAt: null })));
  }

  async list(user: User): Promise<Array<Omit<Conversation, 'userId'>>> {
    const conversations = await this.conversations.find({ where: { userId: user.id }, order: { updatedAt: 'DESC' }, take: 100 });
    return conversations.map((conversation) => this.toSafeConversation(conversation));
  }

  async get(user: User, id: string): Promise<Omit<Conversation, 'userId'>> {
    return this.toSafeConversation(await this.findOwned(user, id));
  }

  async setArchived(user: User, id: string, archived: boolean): Promise<Omit<Conversation, 'userId'>> {
    const conversation = await this.findOwned(user, id);
    conversation.archivedAt = archived ? (conversation.archivedAt ?? new Date()) : null;
    return this.toSafeConversation(await this.conversations.save(conversation));
  }

  async remove(user: User, id: string): Promise<void> {
    await this.conversations.remove(await this.findOwned(user, id));
  }

  async listMessages(user: User, conversationId: string): Promise<Record<string, unknown>[]> {
    await this.findOwned(user, conversationId);
    const messages = await this.messages.createQueryBuilder('message')
      .where('message.conversation_id = :conversationId AND message.user_id = :userId', { conversationId, userId: user.id })
      .orderBy('message.created_at', 'ASC')
      .addOrderBy("CASE WHEN message.role = 'USER' THEN 0 ELSE 1 END", 'ASC')
      .addOrderBy('message.id', 'ASC')
      .getMany();
    if (!messages.length) return [];
    const citations = await this.citations.find({ where: { messageId: In(messages.map((message) => message.id)) }, order: { rank: 'ASC' } });
    const byMessage = new Map<string, Citation[]>();
    for (const citation of citations) {
      const items = byMessage.get(citation.messageId) ?? [];
      items.push(citation);
      byMessage.set(citation.messageId, items);
    }
    return messages.map((message) => ({
      id: message.id, role: message.role, content: message.content, status: message.status, createdAt: message.createdAt,
      citations: (byMessage.get(message.id) ?? []).map((citation) => ({
        id: citation.id, documentId: citation.documentId, sourceName: citation.displaySource, pageNumber: citation.pageNumber, section: citation.section, rank: citation.rank,
      })),
    }));
  }

  private async findOwned(user: User, id: string): Promise<Conversation> {
    const conversation = await this.conversations.findOneBy({ id, userId: user.id });
    if (!conversation) throw new NotFoundException('Conversation not found.');
    return conversation;
  }

  private toSafeConversation(conversation: Conversation): Omit<Conversation, 'userId'> {
    return {
      id: conversation.id,
      title: conversation.title,
      archivedAt: conversation.archivedAt,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }
}
