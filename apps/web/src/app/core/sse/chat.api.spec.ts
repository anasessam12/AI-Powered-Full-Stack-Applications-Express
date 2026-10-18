import { TestBed } from '@angular/core/testing';
import { HttpHeaders, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom, toArray } from 'rxjs';
import { AuthSessionService } from '../auth/session.service';
import { ChatApi } from './chat.api';
describe('ChatApi', () => {
  let http: HttpTestingController; let api: ChatApi;
  beforeEach(() => { TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AuthSessionService, useValue: { csrfHeaders: () => new HttpHeaders({ 'X-CSRF-Token': 'csrf-agent' }) } }] }); http = TestBed.inject(HttpTestingController); api = TestBed.inject(ChatApi); });
  afterEach(() => { http.verify(); vi.unstubAllGlobals(); });
  it('lists and reopens owner-scoped conversations with the session cookie', () => {
    api.listConversations().subscribe((items) => expect(items[0].id).toBe('c1')); const request = http.expectOne('/api/v1/conversations'); expect(request.request.withCredentials).toBe(true); request.flush([{ id: 'c1', title: 'Refund policy', archivedAt: null, createdAt: '', updatedAt: '' }]);
    api.getMessages('c1').subscribe((messages) => expect(messages).toHaveLength(1)); const history = http.expectOne('/api/v1/conversations/c1/messages'); expect(history.request.withCredentials).toBe(true); history.flush([{ id: 'm1', role: 'ASSISTANT', content: 'Return within 30 days.', status: 'COMPLETED', createdAt: '', citations: [] }]);
  });
  it('posts a conversation with CSRF and cookies', () => { api.createConversation({ title: 'Return window' }).subscribe(); const request = http.expectOne('/api/v1/conversations'); expect(request.request.method).toBe('POST'); expect(request.request.withCredentials).toBe(true); expect(request.request.headers.get('X-CSRF-Token')).toBe('csrf-agent'); request.flush({ id: 'c1', title: 'Return window', archivedAt: null, createdAt: '', updatedAt: '' }); });
  it('streams events from an abortable cookie-backed POST with a stable request id', async () => {
    const chunks = ['event: message.started\ndata: {"type":"message.started","conversationId":"c1","userMessageId":"u1","messageId":"m1"}\n\n', 'event: message.completed\ndata: {"type":"message.completed","conversationId":"c1","messageId":"m1"}\n\n'];
    const stream = new ReadableStream<Uint8Array>({ start(controller) { const encoder = new TextEncoder(); chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk))); controller.close(); } });
    const fetchMock = vi.fn().mockResolvedValue(new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } })); vi.stubGlobal('fetch', fetchMock); const controller = new AbortController();
    const events = await firstValueFrom(api.sendMessage({ message: 'Can this be returned?', requestId: 'request-1' }, controller.signal).pipe(toArray()));
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/chat', expect.objectContaining({ method: 'POST', credentials: 'include', signal: controller.signal, headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-agent' }) }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({ message: 'Can this be returned?', requestId: 'request-1' }); expect(events.map((event) => event.type)).toEqual(['message.started', 'message.completed']);
  });
});
