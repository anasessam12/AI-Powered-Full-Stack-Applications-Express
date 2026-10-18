import { ChatEventContract } from '@customer-support/api-contract';
export class SseParser {
  private buffer = '';
  private eventName = '';
  private dataLines: string[] = [];
  push(chunk: string): ChatEventContract[] {
    this.buffer += chunk; const output: ChatEventContract[] = []; let cursor = 0;
    while (cursor < this.buffer.length) {
      let lineEnd = -1; for (let index = cursor; index < this.buffer.length; index++) if (this.buffer[index] === '\r' || this.buffer[index] === '\n') { lineEnd = index; break; }
      if (lineEnd < 0 || (this.buffer[lineEnd] === '\r' && lineEnd === this.buffer.length - 1)) break;
      const delimiter = this.buffer[lineEnd] === '\r' && this.buffer[lineEnd + 1] === '\n' ? 2 : 1;
      output.push(...this.consumeLine(this.buffer.slice(cursor, lineEnd))); cursor = lineEnd + delimiter;
    }
    this.buffer = this.buffer.slice(cursor); return output;
  }
  finish(): ChatEventContract[] {
    const output: ChatEventContract[] = []; if (this.buffer) output.push(...this.consumeLine(this.buffer)); this.buffer = ''; output.push(...this.dispatch()); return output;
  }
  private consumeLine(line: string): ChatEventContract[] {
    if (!line) return this.dispatch(); if (line.startsWith(':')) return [];
    const colon = line.indexOf(':'); const field = colon < 0 ? line : line.slice(0, colon); let value = colon < 0 ? '' : line.slice(colon + 1); if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') this.eventName = value; else if (field === 'data') this.dataLines.push(value); return [];
  }
  private dispatch(): ChatEventContract[] {
    if (!this.dataLines.length) { this.eventName = ''; return []; }
    const data = this.dataLines.join('\n'); const eventName = this.eventName; this.eventName = ''; this.dataLines = [];
    let parsed: unknown; try { parsed = JSON.parse(data); } catch { throw new Error('The workspace returned an invalid event.'); }
    if (!this.isEvent(parsed) || parsed.type !== eventName) throw new Error('The workspace returned an unsupported event.'); return [parsed];
  }
  private isEvent(value: unknown): value is ChatEventContract {
    if (!value || typeof value !== 'object' || !('type' in value)) return false; const event = value as Record<string, unknown>;
    return ['message.started', 'message.delta', 'citations', 'message.completed', 'message.failed'].includes(String(event['type'])) && typeof event['conversationId'] === 'string'
      && (event['type'] !== 'message.delta' || typeof event['delta'] === 'string') && (event['type'] !== 'citations' || Array.isArray(event['citations'])) && (event['type'] !== 'message.failed' || typeof event['code'] === 'string');
  }
}
