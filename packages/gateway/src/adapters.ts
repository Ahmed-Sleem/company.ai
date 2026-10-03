/**
 * Provider adapters — the only provider-specific code in the product.
 *
 * `openAiCompatAdapter` speaks the OpenAI HTTP shape, which is what LiteLLM serves, so the
 * same adapter works against the self-hosted gateway, a direct provider, or the local lane
 * (Ollama / vLLM expose the same shape). `mockAdapter` makes the whole product testable and
 * demoable with no keys and no network — the default in development.
 */
import type { ModelCallRequest, ModelCallResult, ProviderAdapter } from './types.js';

export interface HttpAdapterOptions {
  id: string;
  provider: ProviderAdapter['provider'];
  baseUrl: string;
  apiKey?: string;
  /** Extra headers, e.g. LiteLLM's virtual-key scoping. */
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

export function openAiCompatAdapter(options: HttpAdapterOptions): ProviderAdapter {
  const doFetch = options.fetchImpl ?? fetch;
  return {
    id: options.id,
    provider: options.provider,
    async call(request: ModelCallRequest, signal?: AbortSignal): Promise<ModelCallResult> {
      const response = await doFetch(`${options.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        signal: signal ?? null,
        headers: {
          'content-type': 'application/json',
          ...(options.apiKey ? { authorization: `Bearer ${options.apiKey}` } : {}),
          ...options.headers,
        },
        body: JSON.stringify({
          model: request.providerModel,
          messages: request.messages,
          temperature: request.temperature,
          ...(request.maxOutputTokens ? { max_tokens: request.maxOutputTokens } : {}),
          ...(request.traceId ? { metadata: { trace_id: request.traceId } } : {}),
        }),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`${options.id} responded ${response.status}: ${body.slice(0, 200)}`);
      }
      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
        id?: string;
      };
      return {
        text: json.choices?.[0]?.message?.content ?? '',
        promptTokens: json.usage?.prompt_tokens ?? 0,
        completionTokens: json.usage?.completion_tokens ?? 0,
        ...(json.id ? { providerRequestId: json.id } : {}),
      };
    },
  };
}

export interface MockAdapterOptions {
  id?: string;
  provider?: ProviderAdapter['provider'];
  /** Deterministic reply builder — the default echoes a short acknowledgement. */
  reply?: (request: ModelCallRequest) => string;
  /** Throw for these provider model names, to exercise the fallback chain. */
  failFor?: string[];
  /** Rough token accounting so cost maths is visible in the ledger. */
  estimateTokens?: (text: string) => number;
}

/** Deterministic, offline, no keys. The honest default outside production. */
export function mockAdapter(options: MockAdapterOptions = {}): ProviderAdapter & {
  calls: ModelCallRequest[];
} {
  const calls: ModelCallRequest[] = [];
  const estimate = options.estimateTokens ?? ((text: string) => Math.max(1, Math.ceil(text.length / 4)));
  return {
    id: options.id ?? 'mock',
    provider: options.provider ?? 'open',
    calls,
    async call(request: ModelCallRequest): Promise<ModelCallResult> {
      calls.push(request);
      if (options.failFor?.includes(request.providerModel)) {
        throw new Error(`mock: ${request.providerModel} is unavailable`);
      }
      const text = options.reply?.(request) ?? `(mock ${request.providerModel}) ${request.messages.at(-1)?.content ?? ''}`.slice(0, 2000);
      return {
        text,
        promptTokens: request.messages.reduce((n, m) => n + estimate(m.content), 0),
        completionTokens: estimate(text),
        providerRequestId: `mock-${calls.length}`,
      };
    },
  };
}
