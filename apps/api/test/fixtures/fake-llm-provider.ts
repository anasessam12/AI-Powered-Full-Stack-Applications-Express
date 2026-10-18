import { LlmProvider, LlmProviderError, LlmRequest, ProviderEvent } from '../../src/llm/llm-provider';

export class FakeLlmProvider implements LlmProvider {
  readonly requests: LlmRequest[] = [];
  private nextError: LlmProviderError | null = null;
  private partialUntilAbort = false;

  constructor(private readonly chunks: string[] = ['The evidence supports this answer.']) {}

  async *stream(request: LlmRequest): AsyncIterable<ProviderEvent> {
    this.requests.push(request);
    if (request.signal?.aborted) throw new Error('Fake provider request cancelled.');
    if (this.nextError) {
      const error = this.nextError;
      this.nextError = null;
      throw error;
    }
    if (this.partialUntilAbort) {
      this.partialUntilAbort = false;
      yield { type: 'delta', text: 'Partial answer' };
      await new Promise<void>((_resolve, reject) => {
        if (!request.signal) return reject(new Error('An abort signal is required for this fake mode.'));
        request.signal.addEventListener('abort', () => reject(new LlmProviderError('CANCELLED', 'The request was cancelled.')), { once: true });
      });
      return;
    }
    for (const text of this.chunks) yield { type: 'delta', text };
  }

  failNext(code: LlmProviderError['code'] = 'UPSTREAM'): void {
    this.nextError = new LlmProviderError(code, 'Deterministic fake provider failure.');
  }

  waitForAbortOnNextRequest(): void {
    this.partialUntilAbort = true;
  }
}
