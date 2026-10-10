/**
 * One employee's model connection (REQ-18) and the tiny real request that proves it (REQ-19).
 *
 * Four doors: OpenAI, Anthropic, Gemini, and a custom OpenAI-compatible endpoint for anything
 * else. The browser talks to the providers directly with raw fetch — the same shape the reuse
 * research settled on (Anthropic needs its `dangerous-direct-browser-access` header; there is
 * no SDK in the loop at all). The test button asks each provider for its model list: the
 * smallest request that still exercises the key and reports the provider's own error verbatim.
 *
 * The key lives only in the visitor's own save (REQ-10) — there is no server to hold it.
 */
export interface ModelConnection {
  provider: 'openai' | 'anthropic' | 'gemini' | 'custom';
  /** The provider's own model identifier, e.g. `gpt-4o-mini`, `claude-sonnet-4-5`. */
  model: string;
  /** The visitor's key for that provider. Stored in their save, sent only to that provider. */
  key: string;
  /** Only for `custom`: the OpenAI-compatible base URL. */
  baseUrl: string | null;
}

export const PROVIDERS = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'custom', label: 'Custom (OpenAI-compatible)' },
] as const;

/* ── the standard tool protocol (REQ-53) ─────────────────────────────────────────────────
   One conversation shape in, one normalised answer out — whichever provider answers. The
   engine talks to people through chatTurn; the three providers' dialects stay behind this
   file. */

import type { ToolCall, ToolDef } from './tools';
import { toolsForOpenAI, toolsForAnthropic, toolsForGemini, parseOpenAIToolCalls, parseAnthropicToolUses, parseGeminiFunctionCalls } from './tools';

/** One line of the conversation, in the app's own words. */
export type Turn =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; toolCalls: ToolCall[] }
  | { role: 'tool'; id: string; name: string; result: string };

export interface TurnReply {
  /** The assistant's words this turn (may be empty when it only called tools). */
  text: string;
  /** The tool calls it asked for — the engine executes them and feeds the results back. */
  toolCalls: ToolCall[];
}

/** One model turn carrying the conversation so far and the tool list. Throws on provider
    errors, verbatim, exactly like chatCompletion. */
export async function chatTurn(
  conn: ModelConnection,
  system: string,
  turns: Turn[],
  tools?: ToolDef[],
): Promise<TurnReply> {
  if (conn.provider === 'anthropic') {
    // Anthropic wants every tool_result inside the user message right after the tool_use turn.
    const messages: unknown[] = [];
    for (const turn of turns) {
      if (turn.role === 'user') messages.push({ role: 'user', content: turn.text });
      else if (turn.role === 'assistant') {
        const content: unknown[] = [];
        if (turn.text) content.push({ type: 'text', text: turn.text });
        for (const call of turn.toolCalls) content.push({ type: 'tool_use', id: call.id, name: call.name, input: call.args });
        messages.push({ role: 'assistant', content });
      } else {
        const last = messages[messages.length - 1] as { role?: string; content?: unknown[] } | undefined;
        const block = { type: 'tool_result', tool_use_id: turn.id, content: turn.result };
        if (last?.role === 'user' && Array.isArray(last.content)) last.content.push(block);
        else messages.push({ role: 'user', content: [block] });
      }
    }
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': conn.key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: conn.model,
        max_tokens: 1024,
        system,
        messages,
        ...(tools ? { tools: toolsForAnthropic(tools) } : {}),
      }),
    });
    if (!response.ok) throw new Error(await errorOf(response));
    const data = (await response.json()) as { content?: { type?: string; text?: string }[] };
    const text = (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n');
    return { text, toolCalls: parseAnthropicToolUses(data.content) };
  }

  if (conn.provider === 'gemini') {
    const contents: unknown[] = [];
    for (const turn of turns) {
      if (turn.role === 'user') contents.push({ role: 'user', parts: [{ text: turn.text }] });
      else if (turn.role === 'assistant') {
        const parts: unknown[] = [];
        if (turn.text) parts.push({ text: turn.text });
        for (const call of turn.toolCalls) parts.push({ functionCall: { name: call.name, args: call.args } });
        contents.push({ role: 'model', parts });
      } else {
        contents.push({ role: 'user', parts: [{ functionResponse: { name: turn.name, response: { result: turn.result } } }] });
      }
    }
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(conn.model)}:generateContent?key=${encodeURIComponent(conn.key)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          ...(tools ? { tools: toolsForGemini(tools) } : {}),
        }),
      },
    );
    if (!response.ok) throw new Error(await errorOf(response));
    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string; functionCall?: { name?: string; args?: unknown } }[] } }[];
    };
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const text = parts.filter((part) => part.text).map((part) => part.text ?? '').join('\n');
    return { text, toolCalls: parseGeminiFunctionCalls(parts) };
  }

  const base = conn.provider === 'custom' ? (conn.baseUrl ?? '').replace(/\/+$/, '') : 'https://api.openai.com/v1';
  const messages: unknown[] = [{ role: 'system', content: system }];
  for (const turn of turns) {
    if (turn.role === 'user') messages.push({ role: 'user', content: turn.text });
    else if (turn.role === 'assistant') {
      messages.push({
        role: 'assistant',
        content: turn.text || null,
        ...(turn.toolCalls.length > 0
          ? {
              tool_calls: turn.toolCalls.map((call) => ({
                id: call.id,
                type: 'function',
                function: { name: call.name, arguments: JSON.stringify(call.args) },
              })),
            }
          : {}),
      });
    } else messages.push({ role: 'tool', tool_call_id: turn.id, content: turn.result });
  }
  const send = async (withTools: boolean): Promise<Response> =>
    fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${conn.key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: conn.model, messages, ...(withTools && tools ? { tools: toolsForOpenAI(tools) } : {}) }),
    });
  let response = await send(Boolean(tools));
  // A custom endpoint may be OpenAI-shaped without knowing `tools` — say so once, plainly.
  if (!response.ok && conn.provider === 'custom' && tools) {
    const first = await errorOf(response);
    response = await send(false);
    if (!response.ok) throw new Error(first);
  }
  if (!response.ok) throw new Error(await errorOf(response));
  const data = (await response.json()) as {
    choices?: { message?: { content?: string; tool_calls?: unknown[] } }[];
  };
  const message = data.choices?.[0]?.message;
  return { text: message?.content ?? '', toolCalls: parseOpenAIToolCalls(message) };
}

export interface TestResult {
  ok: boolean;
  /** Success, or the provider's own words about what went wrong. */
  message: string;
}

const errorOf = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: { message?: string }; message?: string };
    return body.error?.message ?? body.message ?? `${response.status} ${response.statusText}`;
  } catch {
    return `${response.status} ${response.statusText}`;
  }
};

/** One chat turn against the person's own provider, carrying the company's system prompt
    (REQ-16). Returns the assistant's words, or throws — the caller falls back to the local
    teammate voice when the provider cannot be reached. */
export async function chatCompletion(conn: ModelConnection, system: string, user: string): Promise<string> {
  if (conn.provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': conn.key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model: conn.model, max_tokens: 300, system, messages: [{ role: 'user', content: user }] }),
    });
    if (!response.ok) throw new Error(await errorOf(response));
    const body = (await response.json()) as { content?: { type: string; text?: string }[] };
    const text = (body.content ?? []).map((part) => part.text ?? '').join('');
    if (text === '') throw new Error('empty response');
    return text;
  }
  if (conn.provider === 'gemini') {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(conn.model)}:generateContent?key=${encodeURIComponent(conn.key)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ parts: [{ text: user }] }],
        }),
      },
    );
    if (!response.ok) throw new Error(await errorOf(response));
    const body = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = (body.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? '').join('');
    if (text === '') throw new Error('empty response');
    return text;
  }
  const base = conn.provider === 'custom' ? (conn.baseUrl ?? '').replace(/\/+$/, '') : 'https://api.openai.com/v1';
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${conn.key}` },
    body: JSON.stringify({
      model: conn.model,
      max_tokens: 300,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  });
  if (!response.ok) throw new Error(await errorOf(response));
  const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content ?? '';
  if (text === '') throw new Error('empty response');
  return text;
}

export async function testConnection(conn: ModelConnection): Promise<TestResult> {
  try {
    let response: Response;
    if (conn.provider === 'openai') {
      response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${conn.key}` },
      });
    } else if (conn.provider === 'anthropic') {
      response = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': conn.key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
      });
    } else if (conn.provider === 'gemini') {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(conn.key)}`,
      );
    } else {
      const base = (conn.baseUrl ?? '').replace(/\/+$/, '');
      if (base === '') return { ok: false, message: 'A base URL is required for a custom endpoint.' };
      response = await fetch(`${base}/models`, {
        headers: { Authorization: `Bearer ${conn.key}` },
      });
    }
    if (response.ok) return { ok: true, message: 'The provider answered — the connection works.' };
    return { ok: false, message: await errorOf(response) };
  } catch {
    return { ok: false, message: 'The request never reached the provider (network or CORS).' };
  }
}
