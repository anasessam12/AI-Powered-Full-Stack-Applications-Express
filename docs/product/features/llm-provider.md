# LLM provider boundary

## Responsibility

The API calls a provider only after retrieval and answer policy select enough evidence. `LlmProvider` is the application boundary; the initial live adapter streams through OpenRouter and tests use a deterministic fake.

## Configuration and security

`OPENROUTER_API_KEY` and model selection are server-side environment settings. Never put provider credentials in Angular, source control, test fixtures, logs, or response contracts. Retrieved document content is serialized as untrusted evidence rather than trusted instructions.

## Streaming and failures

The adapter bounds request duration and output size, observes cancellation, parses SSE deltas, and maps upstream errors to safe application errors. No-evidence requests do not call the provider. Tests cover deltas, error mapping, cancellation, timeout, malformed and oversized streams without a live account.

See [provider interface](../../../apps/api/src/llm/llm-provider.ts), [OpenRouter adapter](../../../apps/api/src/llm/openrouter.provider.ts), and [provider tests](../../../apps/api/test/llm/openrouter-provider.spec.ts).
