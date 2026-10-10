/**
 * Phase K (REQ-55): a hand-rolled MCP client for the browser — the Model Context Protocol's
 * streamable-HTTP transport, spoken over plain fetch so the whole product stays user-side.
 * One JSON-RPC 2.0 wire, the session id carried like the spec says, responses read as JSON or
 * as a server-sent-events stream. No SDK between us and the protocol; the reference for the
 * wire format is github.com/modelcontextprotocol/specification (credited in THIRD_PARTY.md).
 */

export interface McpToolInfo {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

interface RpcMessage {
  jsonrpc: '2.0';
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string };
}

/** Pull the JSON-RPC message out of a response that may be plain JSON or an SSE stream. */
async function readRpc(res: Response): Promise<RpcMessage | null> {
  const type = res.headers.get('content-type') ?? '';
  const text = await res.text();
  if (type.includes('text/event-stream')) {
    let last: RpcMessage | null = null;
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith('data:')) continue;
      try { last = JSON.parse(line.slice(5).trim()) as RpcMessage; } catch { /* a keep-alive line */ }
    }
    return last;
  }
  if (!text) return null; // a notification got the silence it deserved
  try { return JSON.parse(text) as RpcMessage; } catch { return null; }
}

export class McpError extends Error {
  constructor(readonly detail: string) { super(detail); }
}

/** One conversation with one MCP server over streamable HTTP. */
export class McpClient {
  private session: string | null = null;
  private seq = 0;

  constructor(readonly url: string, private readonly headers: Record<string, string> = {}) {}

  private async rpc(method: string, params?: unknown): Promise<RpcMessage | null> {
    const body: RpcMessage = { jsonrpc: '2.0', id: ++this.seq, method, ...(params !== undefined ? { params } : {}) }; // namespace-lock: allow — a JSON-RPC wire sequence number, not a product record id
    let res: Response;
    try {
      res = await fetch(this.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          ...(this.session ? { 'mcp-session-id': this.session } : {}),
          ...this.headers,
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new McpError('the server could not be reached');
    }
    const sid = res.headers.get('mcp-session-id');
    if (sid) this.session = sid;
    if (!res.ok) throw new McpError(`the server answered ${res.status} to ${method}`);
    const msg = await readRpc(res);
    if (msg?.error) throw new McpError(msg.error.message || `error ${msg.error.code}`);
    return msg;
  }

  /** The handshake: versions exchanged, session opened, then the initialised notification. */
  async initialize(): Promise<string> {
    const msg = await this.rpc('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'company.ai', version: '1' },
    });
    const result = (msg?.result ?? {}) as { serverInfo?: { name?: string }; protocolVersion?: string };
    await this.rpc('notifications/initialized');
    return result.serverInfo?.name ?? 'an MCP server';
  }

  async listTools(): Promise<McpToolInfo[]> {
    const msg = await this.rpc('tools/list');
    const tools = ((msg?.result ?? {}) as { tools?: McpToolInfo[] }).tools ?? [];
    return tools.filter((t) => typeof t?.name === 'string' && t.name.length > 0);
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    const msg = await this.rpc('tools/call', { name, arguments: args });
    const result = (msg?.result ?? {}) as { content?: { type?: string; text?: string }[]; isError?: boolean };
    const words = (result.content ?? [])
      .map((c) => (c.type === 'text' ? c.text ?? '' : `[${c.type ?? 'part'}]`))
      .join('\n')
      .trim();
    if (result.isError) throw new McpError(words || `the tool ${name} reported an error`);
    return words || '(no text came back)';
  }
}
