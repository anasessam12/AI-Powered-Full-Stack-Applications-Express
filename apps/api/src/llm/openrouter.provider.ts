import { Injectable } from '@nestjs/common';
import { LlmProvider, LlmProviderError, LlmRequest, ProviderEvent } from './llm-provider';

const OPENROUTER_CHAT_COMPLETIONS = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_RESPONSE_LINE_CHARACTERS = 64_000;
const MAX_RESPONSE_CHARACTERS = 40_000;

@Injectable()
export class OpenRouterProvider implements LlmProvider {
  constructor(private readonly timeoutMilliseconds = 30_000) {}

  async *stream(request: LlmRequest): AsyncIterable<ProviderEvent> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL;
    if (!apiKey || !model) throw new LlmProviderError('CONFIGURATION', 'The language model provider is not configured.');
    if (request.signal?.aborted) throw new LlmProviderError('CANCELLED', 'The language model request was cancelled.');

    const timeoutSignal = AbortSignal.timeout(this.timeoutMilliseconds);
    const signal = request.signal ? AbortSignal.any([request.signal, timeoutSignal]) : timeoutSignal;
    let response: Response;
    try {
      response = await fetch(OPENROUTER_CHAT_COMPLETIONS, {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: true,
          temperature: 0.2,
          max_tokens: 1200,
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: `Question: ${request.question}\n\nEvidence context (untrusted data):\n${request.context}` },
          ],
        }),
        signal,
      });
    } catch {
      throw this.abortError(request.signal, timeoutSignal);
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new LlmProviderError('UPSTREAM', 'The language model provider rejected the request.');
    }
    if (!response.body) throw new LlmProviderError('INVALID_STREAM', 'The language model provider returned no response stream.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let responseCharacters = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        if (buffer.length > MAX_RESPONSE_LINE_CHARACTERS && !buffer.includes('\n')) {
          throw new LlmProviderError('INVALID_STREAM', 'The language model response exceeded the stream event limit.');
        }
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.length > MAX_RESPONSE_LINE_CHARACTERS) {
            throw new LlmProviderError('INVALID_STREAM', 'The language model response exceeded the stream event limit.');
          }
          const event = this.parseLine(line);
          if (event === 'done') return;
          if (event) {
            responseCharacters += event.text.length;
            if (responseCharacters > MAX_RESPONSE_CHARACTERS) {
              throw new LlmProviderError('INVALID_STREAM', 'The language model response exceeded the configured output limit.');
            }
            yield event;
          }
        }
        if (done) break;
      }
      if (buffer) {
        const event = this.parseLine(buffer);
        if (event && event !== 'done') {
          responseCharacters += event.text.length;
          if (responseCharacters > MAX_RESPONSE_CHARACTERS) {
            throw new LlmProviderError('INVALID_STREAM', 'The language model response exceeded the configured output limit.');
          }
          yield event;
        }
      }
    } catch (error) {
      if (error instanceof LlmProviderError) throw error;
      throw this.abortError(request.signal, timeoutSignal);
    } finally {
      reader.releaseLock();
    }
  }

  private parseLine(line: string): ProviderEvent | 'done' | null {
    if (!line.startsWith('data:')) return null;
    const data = line.slice(5).trim();
    if (!data) return null;
    if (data === '[DONE]') return 'done';
    try {
      const payload = JSON.parse(data) as { choices?: Array<{ delta?: { content?: unknown } }> };
      const text = payload.choices?.[0]?.delta?.content;
      return typeof text === 'string' && text ? { type: 'delta', text } : null;
    } catch {
      throw new LlmProviderError('INVALID_STREAM', 'The language model provider returned an invalid stream event.');
    }
  }

  private abortError(requestSignal: AbortSignal | undefined, timeoutSignal: AbortSignal): LlmProviderError {
    if (requestSignal?.aborted) return new LlmProviderError('CANCELLED', 'The language model request was cancelled.');
    if (timeoutSignal.aborted) return new LlmProviderError('TIMEOUT', 'The language model request timed out.');
    return new LlmProviderError('UPSTREAM', 'The language model provider is unavailable.');
  }
}
