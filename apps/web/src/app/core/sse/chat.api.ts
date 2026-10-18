import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ChatEventContract, ConversationContract, ConversationMessageContract, CreateConversationRequestContract, SendChatMessageContract } from '@customer-support/api-contract';
import { Observable } from 'rxjs';
import { AuthSessionService } from '../auth/session.service';
import { SseParser } from './sse-parser';
@Injectable({ providedIn: 'root' })
export class ChatApi {
  private readonly http = inject(HttpClient); private readonly auth = inject(AuthSessionService);
  listConversations(): Observable<ConversationContract[]> { return this.http.get<ConversationContract[]>('/api/v1/conversations', { withCredentials: true }); }
  createConversation(input: CreateConversationRequestContract = {}): Observable<ConversationContract> { return this.http.post<ConversationContract>('/api/v1/conversations', input, { withCredentials: true, headers: this.auth.csrfHeaders() }); }
  getMessages(id: string): Observable<ConversationMessageContract[]> { return this.http.get<ConversationMessageContract[]>(`/api/v1/conversations/${encodeURIComponent(id)}/messages`, { withCredentials: true }); }
  sendMessage(input: SendChatMessageContract, signal: AbortSignal): Observable<ChatEventContract> {
    return new Observable((observer) => {
      const parser = new SseParser(); let reader: ReadableStreamDefaultReader<Uint8Array> | undefined; let terminal = false; const stop = () => { void reader?.cancel(); }; signal.addEventListener('abort', stop, { once: true });
      void (async () => {
        try {
          const csrf = this.auth.csrfHeaders(); const headers = new HttpHeaders({ 'Content-Type': 'application/json', Accept: 'text/event-stream', ...Object.fromEntries(csrf.keys().map((key) => [key, csrf.get(key) ?? ''])) });
          const response = await fetch('/api/v1/chat', { method: 'POST', credentials: 'include', headers: Object.fromEntries(headers.keys().map((key) => [key, headers.get(key) ?? ''])), body: JSON.stringify(input), signal });
          if (!response.ok) throw new Error(response.status === 401 ? 'Your session has expired. Sign in again.' : 'The message could not be sent.'); if (!response.body) throw new Error('The workspace did not start a response stream.');
          reader = response.body.getReader(); const decoder = new TextDecoder();
          while (true) { const result = await reader.read(); if (result.done) break; for (const event of parser.push(decoder.decode(result.value, { stream: true }))) { observer.next(event); if (event.type === 'message.failed' || event.type === 'message.completed') terminal = true; } }
          for (const event of parser.push(decoder.decode()).concat(parser.finish())) { observer.next(event); if (event.type === 'message.failed' || event.type === 'message.completed') terminal = true; }
          if (!terminal) throw new Error('The response ended before the answer was complete.'); observer.complete();
        } catch (error) { observer.error(error); }
      })();
      return () => { signal.removeEventListener('abort', stop); void reader?.cancel(); };
    });
  }
}
