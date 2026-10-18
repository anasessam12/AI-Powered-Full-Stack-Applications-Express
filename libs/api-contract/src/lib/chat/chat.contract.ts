export interface CreateConversationRequestContract {
  title?: string;
}

export interface ConversationContract {
  id: string;
  title: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatCitationContract {
  chunkId: string | null;
  documentId: string | null;
  sourceName: string;
  pageNumber: number | null;
  section: string | null;
  rank: number;
}

export interface ConversationMessageContract {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'INTERRUPTED';
  createdAt: string;
  citations: Array<Pick<ChatCitationContract, 'sourceName' | 'pageNumber' | 'section' | 'rank'>>;
}

export interface SendChatMessageContract {
  conversationId?: string;
  message: string;
  requestId: string;
}

export type ChatEventContract =
  | { type: 'message.started'; conversationId: string; userMessageId: string; messageId: string }
  | { type: 'message.delta'; conversationId: string; messageId: string; delta: string }
  | { type: 'citations'; conversationId: string; messageId: string; citations: ChatCitationContract[] }
  | { type: 'message.completed'; conversationId: string; messageId: string }
  | { type: 'message.failed'; conversationId: string; messageId?: string; code: string };
