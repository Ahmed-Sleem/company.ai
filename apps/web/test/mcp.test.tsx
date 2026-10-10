/**
 * Phase K (REQ-55): the MCP wire, the GitHub-only rule, and the registry bridge — proven
 * against a fake server in the page, no network, no browser.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { McpClient, McpError } from '../src/lib/mcp';
import { isGitHubRepo, connectIntegration, callIntegrationTool, type IntegrationRow } from '../src/lib/integrations';
import { integrationToolDefs } from '../src/lib/tools';
import { runToolAsync } from '../src/lib/toolrun';
import { useStore } from '../src/data/store';

type Rpc = { id?: number; method: string; params?: Record<string, unknown> };

/** Swap the page's fetch for a fake — the whole phase is provable with no network. */
function setFetch(fn: (url: string, init: RequestInit) => Promise<Response>): void {
  (globalThis as unknown as { fetch: unknown }).fetch = fn;
}

function fakeServer(handle: (msg: Rpc) => unknown, opts?: { sse?: boolean; status?: number; headers?: Record<string, string> }) {
  setFetch(vi.fn(async (_url: string, init: RequestInit) => {
    const msg = JSON.parse(String(init.body)) as Rpc;
    const result = handle(msg);
    const payload = JSON.stringify({ jsonrpc: '2.0', id: msg.id, result });
    const headers = { 'content-type': 'application/json', ...opts?.headers };
    if (opts?.sse) {
      return new Response(`event: message\ndata: ${payload}\n\n`, {
        status: opts.status ?? 200,
        headers: { 'content-type': 'text/event-stream' },
      });
    }
    return new Response(payload, { status: opts?.status ?? 200, headers });
  }) as (url: string, init: RequestInit) => Promise<Response>);
}

const SERVER_TOOLS = [
  { name: 'read_file', description: 'read a file', inputSchema: { type: 'object', properties: { path: { type: 'string' } } } },
];

beforeEach(() => {
  localStorage.clear();
});

describe('the MCP client (Phase K)', () => {
  it('handshakes, lists and calls over plain JSON', async () => {
    const seen: string[] = [];
    fakeServer((msg) => {
      seen.push(msg.method);
      if (msg.method === 'initialize') return { protocolVersion: '2025-06-18', serverInfo: { name: 'shelf-server' } };
      if (msg.method === 'tools/list') return { tools: SERVER_TOOLS };
      if (msg.method === 'tools/call') return { content: [{ type: 'text', text: `contents of ${String((msg.params as { arguments: { path: string } }).arguments.path)}` }] };
      return {};
    });
    const client = new McpClient('http://mcp.test/mcp');
    expect(await client.initialize()).toBe('shelf-server');
    const tools = await client.listTools();
    expect(tools[0]?.name).toBe('read_file');
    expect(await client.callTool('read_file', { path: 'plan.md' })).toBe('contents of plan.md');
    expect(seen).toContain('notifications/initialized');
  });

  it('reads a result out of an SSE stream, the way the transport allows', async () => {
    fakeServer((msg) => (msg.method === 'tools/list' ? { tools: SERVER_TOOLS } : {}), { sse: true });
    const client = new McpClient('http://mcp.test/mcp');
    expect((await client.listTools()).map((t) => t.name)).toEqual(['read_file']);
  });

  it('carries the server’s own error words back, never a silent failure', async () => {
    fakeServer(() => ({ content: [{ type: 'text', text: 'the file is not here' }], isError: true }));
    const client = new McpClient('http://mcp.test/mcp');
    await expect(client.callTool('read_file', {})).rejects.toThrow('the file is not here');
  });

  it('names an unreachable server in words', async () => {
    setFetch(async () => { throw new Error('boom'); });
    const client = new McpClient('http://mcp.test/mcp');
    await expect(client.initialize()).rejects.toThrow(McpError);
  });
});

describe('the GitHub-only rule and the registry bridge (Phase K)', () => {
  it('accepts GitHub homes and nothing else', () => {
    expect(isGitHubRepo('https://github.com/modelcontextprotocol/servers')).toBe(true);
    expect(isGitHubRepo('https://github.com/suekou/mcp-server-notion/')).toBe(true);
    expect(isGitHubRepo('https://evil.example/servers')).toBe(false);
    expect(isGitHubRepo('https://github.com/onlyonepart')).toBe(false);
  });

  it('refuses a non-GitHub server at the store, and numbers the rest ix-N', () => {
    expect(useStore.getState().addIntegration({ kind: 'mcp', label: 'x', repo: 'https://evil.example/x' })).toBeNull();
    const row = useStore.getState().addIntegration({ kind: 'mcp', label: 'shelf', repo: 'https://github.com/me/server', endpoint: 'http://mcp.test/mcp' });
    expect(row?.id).toBe('ix-1');
  });

  it('lends tools to the registry only while connected, namespaced per row', () => {
    const idle: IntegrationRow = { id: 'ix-1', kind: 'mcp', label: 'shelf', repo: 'r', status: 'idle', note: '', tools: [{ name: 'read_file', description: 'd' }] };
    expect(integrationToolDefs([idle])).toEqual([]);
    const on = { ...idle, status: 'on' as const };
    expect(integrationToolDefs([on]).map((d) => d.name)).toEqual(['ix__ix-1__read_file']);
  });

  it('runs an integration tool through the registry and returns the server’s words', async () => {
    fakeServer((msg) => (msg.method === 'tools/call' ? { content: [{ type: 'text', text: 'hello from the server' }] } : {}));
    const row: IntegrationRow = { id: 'ix-2', kind: 'mcp', label: 'shelf', repo: 'r', endpoint: 'http://mcp.test/mcp', status: 'on', note: '', tools: SERVER_TOOLS };
    const out = await runToolAsync(
      { id: 'c1', name: 'ix__ix-2__read_file', args: { path: 'x' } },
      { state: { ...useStore.getState(), integrations: [row] }, caller: useStore.getState().agents[0]!, task: useStore.getState().tasks[0]!, lang: 'en', report: () => {} },
    );
    expect(out).toBe('hello from the server');
  });

  it('connects a Notion door with the owner’s token and discovers its two tools', async () => {
    setFetch(async (url: string) =>
      new Response(JSON.stringify(url.includes('/search') ? { results: [] } : { name: 'studio-bot' }), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    const row: IntegrationRow = { id: 'ix-3', kind: 'notion', label: 'Notion', repo: 'https://github.com/me/fork', secret: 'secret_x', status: 'idle', note: '', tools: [] };
    const res = await connectIntegration(row);
    expect(res.note).toBe('connected as studio-bot');
    expect(res.tools.map((t) => t.name)).toEqual(['notion_search', 'notion_read_page']);
    const text = await callIntegrationTool({ ...row, status: 'on' }, 'notion_search', { query: 'roadmap' });
    expect(text).toContain('nothing found');
  });
});
