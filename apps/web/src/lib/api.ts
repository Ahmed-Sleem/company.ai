/** The API client. One place that knows the product's endpoints and its error shape. */
export interface ApiError {
  code: string;
  message: string;
  fields?: string[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  if (!response.ok) {
    let error: ApiError = { code: 'network', message: 'The request could not be completed.' };
    try {
      const body = (await response.json()) as { error?: ApiError };
      if (body.error) error = body.error;
    } catch {
      /* keep the generic message */
    }
    throw Object.assign(new Error(error.message), { apiError: error, status: response.status });
  }
  return (await response.json()) as T;
}

export const api = {
  health: () => request<{ ok: boolean; version: string; company: string | null }>('/api/health'),
  company: () => request<{ company: { id: string; name: string } }>('/api/company'),
  agents: () =>
    request<{
      agents: Array<{
        id: string; name: string; role: string; status: string; modelId: string | null;
        capabilities: string[];
        budget: { limitCents: number; spentCents: number; remainingCents: number; exceeded: boolean };
      }>;
    }>('/api/agents'),
  tasks: () =>
    request<{ tasks: Array<{ id: string; title: string; stage: string; priority: string; progress: number; ownerAgentId: string }> }>(
      '/api/tasks',
    ),
  decisions: (status?: string) =>
    request<{
      decisions: Array<{
        id: string; kind: string; status: string; title: string; agentId: string | null;
        rule: { id: string; observed: number; threshold: number; unit: string };
        diff: { kind: string; summary: string; before: string | null; after: string | null };
        audit: { raisedAt: string; decidedByLabel: string | null; decidedAt: string | null };
        outcome: string | null;
      }>;
    }>(`/api/decisions${status ? `?status=${status}` : ''}`),
  decide: (decisionId: string, verdict: 'approve' | 'reject') =>
    request<{ outcome: { kind: string; status?: string }; applied?: { outcome?: string } }>(
      `/api/decisions/${decisionId}/decide`,
      { method: 'POST', body: JSON.stringify({ verdict }) },
    ),
  models: () =>
    request<{ models: Array<{ id: string; displayName: string; lane: string; inputCentsPerMTok: number; outputCentsPerMTok: number; lifecycle: string }> }>(
      '/api/models',
    ),
  views: (view: string, state: string) => request<{ view: string; state: string }>(`/api/views/${view}?state=${state}`),
};
