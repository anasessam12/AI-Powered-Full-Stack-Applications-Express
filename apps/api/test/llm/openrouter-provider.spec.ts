import { OpenRouterProvider } from '../../src/llm/openrouter.provider';
import { ProviderEvent } from '../../src/llm/llm-provider';
import { FakeLlmProvider } from '../fixtures/fake-llm-provider';

async function collect(stream: AsyncIterable<ProviderEvent>): Promise<ProviderEvent[]> {
  const events: ProviderEvent[] = [];
  for await (const event of stream) events.push(event);
  return events;
}

describe('OpenRouterProvider', () => {
  const originalKey = process.env.OPENROUTER_API_KEY;
  const originalModel = process.env.OPENROUTER_MODEL;
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    process.env.OPENROUTER_API_KEY = originalKey;
    process.env.OPENROUTER_MODEL = originalModel;
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('streams text deltas and uses only server-side configuration', async () => {
    process.env.OPENROUTER_API_KEY = 'server-only-test-key';
    process.env.OPENROUTER_MODEL = 'openai/gpt-test';
    const payload = [
      'data: {"choices":[{"delta":{"content":"Grounded "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"answer."}}]}\n\n',
      'data: [DONE]\n\n',
    ].join('');
    globalThis.fetch = jest.fn().mockResolvedValue(new Response(payload, { status: 200 })) as unknown as typeof fetch;

    expect(await collect(new OpenRouterProvider().stream({ system: 'System', question: 'Question', context: 'Evidence' }))).toEqual([
      { type: 'delta', text: 'Grounded ' },
      { type: 'delta', text: 'answer.' },
    ]);
    const [url, options] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(options.headers.authorization).toBe('Bearer server-only-test-key');
    expect(JSON.parse(options.body).max_tokens).toBe(1200);
    expect(JSON.stringify(options.body)).not.toContain('server-only-test-key');
  });

  it('provides deterministic answer chunks through the shared fake adapter', async () => {
    const fake = new FakeLlmProvider(['Refunds are available ', 'within thirty days.']);
    const events = await collect(fake.stream({ system: 'policy', question: 'When?', context: 'evidence' }));
    expect(events).toEqual([
      { type: 'delta', text: 'Refunds are available ' },
      { type: 'delta', text: 'within thirty days.' },
    ]);
    expect(fake.requests[0].context).toBe('evidence');
  });

  it('fails safely when credentials are absent or the provider rejects the request', async () => {
    delete process.env.OPENROUTER_API_KEY;
    await expect(collect(new OpenRouterProvider().stream({ system: 's', question: 'q', context: 'c' }))).rejects.toMatchObject({ code: 'CONFIGURATION' });
    process.env.OPENROUTER_API_KEY = 'test-key';
    globalThis.fetch = jest.fn().mockResolvedValue(new Response('private provider detail', { status: 429 })) as unknown as typeof fetch;
    await expect(collect(new OpenRouterProvider().stream({ system: 's', question: 'q', context: 'c' }))).rejects.toMatchObject({ code: 'UPSTREAM' });
  });

  it('rejects malformed and oversized provider events without exposing their content', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_MODEL = 'openai/gpt-test';
    globalThis.fetch = jest.fn()
      .mockResolvedValueOnce(new Response('data: not-json\n\n', { status: 200 }))
      .mockResolvedValueOnce(new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: 'x'.repeat(40_001) } }] })}\n\n`, { status: 200 })) as unknown as typeof fetch;
    await expect(collect(new OpenRouterProvider().stream({ system: 's', question: 'q', context: 'c' }))).rejects.toMatchObject({ code: 'INVALID_STREAM' });
    await expect(collect(new OpenRouterProvider().stream({ system: 's', question: 'q', context: 'c' }))).rejects.toMatchObject({ code: 'INVALID_STREAM' });
  });

  it('propagates cancellation and enforces the provider timeout', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    const controller = new AbortController();
    const fetchMock = jest.fn((_url: string, options: { signal: AbortSignal }) => new Promise<Response>((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const cancelled = collect(new OpenRouterProvider(1000).stream({ system: 's', question: 'q', context: 'c', signal: controller.signal }));
    controller.abort();
    await expect(cancelled).rejects.toMatchObject({ code: 'CANCELLED' });

    const timeoutProvider = new OpenRouterProvider(5);
    await expect(collect(timeoutProvider.stream({ system: 's', question: 'q', context: 'c' }))).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
});
