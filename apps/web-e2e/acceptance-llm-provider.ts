import { LlmProvider, LlmProviderError, LlmRequest, ProviderEvent } from '../api/src/llm/llm-provider';

export class AcceptanceLlmProvider implements LlmProvider {
  async *stream(request: LlmRequest): AsyncIterable<ProviderEvent> {
    if (request.question.includes('__provider_failure__')) throw new LlmProviderError('UPSTREAM', 'Deterministic E2E provider failure.');
    const context = request.context.toLowerCase();
    const question = request.question.toLowerCase();
    const answer = question.includes('exchange') && context.includes('exchanges may be requested within 14 days')
      ? 'Exchanges may be requested within 14 days of delivery.'
      : question.includes('fee') && context.includes('2% processing fee applies to credit card refunds')
        ? 'Credit card refunds have a 2% processing fee.'
        : question.includes('credential') && context.includes('change a password immediately if a development credential is exposed')
          ? 'Change the password immediately if a development credential is exposed.'
          : question.includes('return') && context.includes('unused items may be returned within 30 days')
            ? 'Unused items may be returned within 30 days of delivery.'
            : 'The available source excerpts do not answer this question.';
    yield { type: 'delta', text: answer };
  }
}
