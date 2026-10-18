import { SseParser } from './sse-parser';
import { ChatEventContract } from '@customer-support/api-contract';
const events: ChatEventContract[] = [
  { type: 'message.started', conversationId: 'c1', userMessageId: 'u1', messageId: 'm1' },
  { type: 'message.delta', conversationId: 'c1', messageId: 'm1', delta: 'Grounded answer.' },
  { type: 'citations', conversationId: 'c1', messageId: 'm1', citations: [{ chunkId: 'k1', documentId: 'd1', sourceName: 'Returns guide.pdf', pageNumber: 4, section: null, rank: 1 }] },
  { type: 'message.completed', conversationId: 'c1', messageId: 'm1' },
];
describe('SseParser', () => {
  it('parses events when every network chunk ends at a different byte boundary', () => {
    const parser = new SseParser(); const raw = events.map((event) => `event: ${event.type}\r\ndata: ${JSON.stringify(event)}\r\n\r\n`).join(''); const parsed: ChatEventContract[] = [];
    for (let index = 0; index < raw.length; index += 7) parsed.push(...parser.push(raw.slice(index, index + 7)));
    parsed.push(...parser.finish()); expect(parsed).toEqual(events);
  });
  it('parses LF, joins valid multi-line JSON data, and ignores comments', () => {
    const event = events[0]; const json = '{\n"type":"message.started",\n"conversationId":"c1",\n"userMessageId":"u1",\n"messageId":"m1"\n}'; const parser = new SseParser();
    expect(parser.push(`: heartbeat\nevent: ${event.type}\ndata: ${json.split('\n').join('\ndata: ')}\n\n`)).toEqual([event]);
  });
  it('returns a provider failure as a terminal event without inventing completion', () => {
    const parser = new SseParser(); const failed: ChatEventContract = { type: 'message.failed', conversationId: 'c1', messageId: 'm1', code: 'UPSTREAM' }; const output = parser.push(`event: message.failed\ndata: ${JSON.stringify(failed)}\n\n`);
    expect(output).toEqual([failed]); expect(output.some((event) => event.type === 'message.completed')).toBe(false);
  });
});

