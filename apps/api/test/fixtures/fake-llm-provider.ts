import { LlmProvider, LlmRequest, ProviderEvent } from '../../src/llm/llm-provider';

export class FakeLlmProvider implements LlmProvider {
  readonly requests: LlmRequest[] = [];

  constructor(private readonly chunks: string[] = ['The evidence supports this answer.']) {}

  async *stream(request: LlmRequest): AsyncIterable<ProviderEvent> {
    this.requests.push(request);
    if (request.signal?.aborted) throw new Error('Fake provider request cancelled.');
    for (const text of this.chunks) yield { type: 'delta', text };
  }
}
