/**
 * The gateway's vocabulary.
 *
 * We own a thin gateway (doc `22`) in front of LiteLLM. Why not call LiteLLM directly from
 * the product: the budget cap must be enforced **in the request path** — the donor
 * `agentkitai/agentgate` documents that its own guard is soft and fails open precisely
 * because it is not in the path. Here, a call that would exceed the cap never leaves.
 *
 * The adapter interface is deliberately small so a provider lane is ~40 lines:
 * OpenAI-compatible HTTP (which is what LiteLLM speaks), the cheap open lane, or a mock.
 */
import type { ProviderId } from '@company/contracts';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelCallRequest {
  /** Provider-side model name, e.g. `gpt-5.2` — resolved from the registry, never typed by hand. */
  providerModel: string;
  provider: ProviderId;
  messages: ChatMessage[];
  temperature: number;
  maxOutputTokens: number | null;
  /** Passed through to the provider as a trace hint (Langfuse / provider dashboard). */
  traceId?: string;
}

export interface ModelCallResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  /** Provider request id when the provider returns one. */
  providerRequestId?: string;
}

export interface ProviderAdapter {
  readonly id: string;
  readonly provider: ProviderId;
  /** Throwing here is expected and handled: the gateway falls back to the next model. */
  call(request: ModelCallRequest, signal?: AbortSignal): Promise<ModelCallResult>;
}

export interface GatewayDeps {
  db: import('@company/company').Db;
  /** modelId → registry row. Injected so tests can use the real table. */
  registry: {
    get(modelId: string): Promise<{
      id: string;
      providerModel: string;
      provider: ProviderId;
      lane: 'strong' | 'balanced' | 'cheap';
      inputCentsPerMTok: number;
      outputCentsPerMTok: number;
    } | null>;
    fallbacksOf(agentId: string): Promise<string[]>;
    modelForAgent(agentId: string): Promise<string | null>;
  };
  adapters: Map<ProviderId, ProviderAdapter>;
  /** Called after a run is written, so the caller can trace (Langfuse) without coupling. */
  onRun?: (run: { id: string; traceId: string | null; costCents: number }) => void;
  now?: () => Date;
}

export type CallOutcome =
  | {
      status: 'succeeded';
      text: string;
      runId: string;
      modelId: string;
      requestedModelId: string;
      promptTokens: number;
      completionTokens: number;
      costCents: number;
    }
  | { status: 'blocked'; runId: string; decisionId: string; reason: string }
  | { status: 'failed'; runId: string; reason: string };
