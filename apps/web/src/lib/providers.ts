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
