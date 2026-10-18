import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { ChatEventContract } from '@customer-support/api-contract';
import { AuthSessionService } from '../auth/session.service';
import { ChatPageComponent } from '../../chat/chat-page.component';
import { ChatApi } from './chat.api';
describe('ChatPageComponent', () => {
  let api: { listConversations: ReturnType<typeof vi.fn>; createConversation: ReturnType<typeof vi.fn>; getMessages: ReturnType<typeof vi.fn>; sendMessage: ReturnType<typeof vi.fn> }; let stream: Subject<ChatEventContract>;
  beforeEach(async () => { stream = new Subject(); api = { listConversations: vi.fn().mockReturnValue(of([])), createConversation: vi.fn().mockReturnValue(of({ id: 'c1', title: 'Question', archivedAt: null, createdAt: '', updatedAt: '' })), getMessages: vi.fn().mockReturnValue(of([])), sendMessage: vi.fn().mockReturnValue(stream) }; await TestBed.configureTestingModule({ imports: [ChatPageComponent], providers: [provideRouter([]), { provide: ChatApi, useValue: api }, { provide: AuthSessionService, useValue: { current: () => ({ user: { id: 'agent-1', username: 'agent', role: 'AGENT' } }), logout: () => of(undefined) } }] }).compileComponents(); });
  it('creates and persists a conversation then renders grounded citations', async () => {
    const fixture = TestBed.createComponent(ChatPageComponent); fixture.detectChanges(); const root = fixture.nativeElement as HTMLElement; fixture.componentInstance.draft = 'What is our return window?'; fixture.componentInstance.send(); await fixture.whenStable(); fixture.detectChanges();
    expect(api.createConversation).toHaveBeenCalled(); expect(api.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ conversationId: 'c1', requestId: expect.any(String) }), expect.any(AbortSignal)); expect(stream.observed).toBe(true);
    stream.next({ type: 'message.started', conversationId: 'c1', userMessageId: 'u1', messageId: 'm1' }); stream.next({ type: 'message.delta', conversationId: 'c1', messageId: 'm1', delta: 'Returns are accepted within 30 days.' }); stream.next({ type: 'citations', conversationId: 'c1', messageId: 'm1', citations: [{ chunkId: 'k1', documentId: 'd1', sourceName: 'Returns guide.pdf', pageNumber: 4, section: null, rank: 1 }] }); stream.next({ type: 'message.completed', conversationId: 'c1', messageId: 'm1' }); stream.complete(); fixture.detectChanges(); expect(fixture.componentInstance.messages.map((message) => message.content)).toContain('Returns are accepted within 30 days.');
    expect(fixture.componentInstance.messages.map((message) => message.content)).toContain('Returns are accepted within 30 days.'); expect(root.textContent).toContain('Returns are accepted within 30 days.'); expect(root.querySelector('a[href*="d1"]')?.textContent).toContain('Returns guide.pdf'); expect(root.textContent).toContain('Page 4');
  });
  it('shows the abstention response and blocks duplicate sends during generation', async () => {
    const fixture = TestBed.createComponent(ChatPageComponent); fixture.detectChanges(); const root = fixture.nativeElement as HTMLElement; fixture.componentInstance.draft = 'Question?'; fixture.componentInstance.send(); await fixture.whenStable(); fixture.componentInstance.send(); expect(api.sendMessage).toHaveBeenCalledTimes(1);
    stream.next({ type: 'message.started', conversationId: 'c1', userMessageId: 'u1', messageId: 'm1' }); stream.next({ type: 'message.delta', conversationId: 'c1', messageId: 'm1', delta: 'The available documents do not contain enough information to answer that question.' }); stream.next({ type: 'message.completed', conversationId: 'c1', messageId: 'm1' }); stream.complete(); fixture.detectChanges(); expect(root.textContent).toContain('do not contain enough information');
  });
  it('marks failed provider output as incomplete without an answer-complete signal', async () => {
    const fixture = TestBed.createComponent(ChatPageComponent); fixture.detectChanges(); const root = fixture.nativeElement as HTMLElement; fixture.componentInstance.draft = 'Question?'; fixture.componentInstance.send(); await fixture.whenStable(); fixture.detectChanges();
    stream.next({ type: 'message.started', conversationId: 'c1', userMessageId: 'u1', messageId: 'm1' }); stream.next({ type: 'message.delta', conversationId: 'c1', messageId: 'm1', delta: 'Partial answer' }); stream.next({ type: 'message.failed', conversationId: 'c1', messageId: 'm1', code: 'UPSTREAM' }); stream.complete(); fixture.detectChanges(); expect(root.textContent).toContain('Answer interrupted'); expect(root.querySelector('[data-answer-complete="true"]')).toBeNull();
  });

  it('reopens saved messages and keeps Admin navigation out of an Agent session', () => {
    api.listConversations.mockReturnValue(of([{ id: 'c1', title: 'Refund question', archivedAt: null, createdAt: '2026-01-01', updatedAt: '2026-01-02' }]));
    api.getMessages.mockReturnValue(of([{ id: 'm1', role: 'ASSISTANT', content: 'Returns are accepted within 30 days.', status: 'COMPLETED', createdAt: '2026-01-01', citations: [{ documentId: 'd1', sourceName: 'Returns guide.pdf', pageNumber: 4, section: null, rank: 1 }] }]));
    const fixture = TestBed.createComponent(ChatPageComponent); fixture.detectChanges(); const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('a[href="/admin/users"]')).toBeNull(); expect(root.querySelector('a[href="/admin/documents"]')).toBeNull();
    root.querySelector<HTMLButtonElement>('.history-item')?.click(); fixture.detectChanges();
    expect(api.getMessages).toHaveBeenCalledWith('c1'); expect(root.textContent).toContain('Returns are accepted within 30 days.'); expect(root.querySelector('a[href*="/api/v1/documents/d1/content#page=4"]')?.textContent).toContain('Returns guide.pdf');
  });
});






