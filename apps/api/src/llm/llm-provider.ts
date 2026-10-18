export interface LlmRequest {
  system: string;
  question: string;
  context: string;
  signal?: AbortSignal;
}

export interface ProviderEvent {
  type: 'delta';
  text: string;
}

export interface LlmProvider {
  stream(request: LlmRequest): AsyncIterable<ProviderEvent>;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');

export type LlmProviderErrorCode = 'CONFIGURATION' | 'UPSTREAM' | 'TIMEOUT' | 'CANCELLED' | 'INVALID_STREAM';

export class LlmProviderError extends Error {
  constructor(readonly code: LlmProviderErrorCode, message: string) {
    super(message);
    this.name = 'LlmProviderError';
  }
}
