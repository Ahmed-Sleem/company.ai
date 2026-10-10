/**
 * Phase K (REQ-55): integrations. Three kinds of door into the outside world, all surfaced to
 * the models through the same standard tool registry (REQ-53):
 *
 *  - `mcp`    — any MCP server the owner points at, spoken to with our streamable-HTTP client.
 *               The owner's rule (round eight): an integration's SERVER comes from GitHub, so
 *               the repo field must be a github.com address — the endpoint is where the owner
 *               runs that code.
 *  - `notion` — the Notion REST API directly (@notionhq/client is Node-shaped; the HTTP API is
 *               the same wire, credited in THIRD_PARTY.md).
 *  - `drive`  — Google Drive REST v3 with the owner's own access token.
 */
import { McpClient } from './mcp';

export type IntegrationKind = 'mcp' | 'notion' | 'drive';

export interface IntegrationTool {
  name: string;
  description: string;
  inputSchema?: unknown;
}

export interface IntegrationRow {
  id: string; // ix-1, ix-2 — the save numbers them like everything else it did not ship with
  kind: IntegrationKind;
  label: string;
  /** The GitHub home of the server behind this integration (owner rule: GitHub only). */
  repo: string;
  /** Where the MCP server actually listens (the owner runs the GitHub code themselves). */
  endpoint?: string;
  /** A token the owner pasted — notion / drive. Lives only in their save. */
  secret?: string;
  status: 'idle' | 'on' | 'error';
  /** The last thing that happened, in words the owner reads. */
  note: string;
  tools: IntegrationTool[];
}

export const isGitHubRepo = (repo: string): boolean =>
  /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(repo.trim());

/** The reference shelf — servers and specs whose homes are on GitHub, linked not bundled. */
export const MCP_SHELF = [
  { repo: 'https://github.com/modelcontextprotocol/servers', note: 'the reference server collection' },
  { repo: 'https://github.com/modelcontextprotocol/specification', note: 'the protocol itself' },
  { repo: 'https://github.com/suekou/mcp-server-notion', note: 'a community Notion server' },
] as const;

async function notionCheck(secret: string): Promise<string> {
  const res = await fetch('https://api.notion.com/v1/users/me', {
    headers: { authorization: `Bearer ${secret}`, 'notion-version': '2022-06-28' },
  });
  if (!res.ok) return `Notion answered ${res.status} — the token did not open the door`;
  const me = (await res.json()) as { name?: string; bot?: unknown };
  return me.name ? `connected as ${me.name}` : 'connected';
}

async function driveCheck(secret: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
    headers: { authorization: `Bearer ${secret}` },
  });
  if (!res.ok) return `Google answered ${res.status} — the token did not open the door`;
  const about = (await res.json()) as { user?: { displayName?: string } };
  return about.user?.displayName ? `connected as ${about.user.displayName}` : 'connected';
}

const NOTION_TOOLS: IntegrationTool[] = [
  { name: 'notion_search', description: 'Search the connected Notion workspace for pages and databases by title.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'notion_read_page', description: 'Read a Notion page as plain text blocks.', inputSchema: { type: 'object', properties: { page_id: { type: 'string' } }, required: ['page_id'] } },
];

const DRIVE_TOOLS: IntegrationTool[] = [
  { name: 'drive_search', description: 'Search the connected Google Drive by file name.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'drive_read_file', description: 'Read a Google Drive text file’s content.', inputSchema: { type: 'object', properties: { file_id: { type: 'string' } }, required: ['file_id'] } },
];

export interface ConnectResult { tools: IntegrationTool[]; note: string; }

/** Open the door: verify credentials, discover tools. Throws Error with owner-words on failure. */
export async function connectIntegration(row: IntegrationRow): Promise<ConnectResult> {
  if (row.kind === 'mcp') {
    if (!row.endpoint || !/^https?:\/\//.test(row.endpoint)) throw new Error('an MCP integration needs an http(s) endpoint to call');
    const client = new McpClient(row.endpoint);
    const name = await client.initialize();
    const tools = await client.listTools();
    return { tools: tools.map((t) => ({ name: t.name, description: t.description ?? '', inputSchema: t.inputSchema })), note: `connected to ${name} — ${tools.length} tools` };
  }
  if (row.kind === 'notion') {
    if (!row.secret) throw new Error('Notion needs an integration token');
    return { tools: NOTION_TOOLS, note: await notionCheck(row.secret) };
  }
  if (!row.secret) throw new Error('Google Drive needs an access token');
  return { tools: DRIVE_TOOLS, note: await driveCheck(row.secret) };
}

/** Execute one tool on a connected integration; the words come back for the model to read. */
export async function callIntegrationTool(row: IntegrationRow, tool: string, args: Record<string, unknown>): Promise<string> {
  if (row.kind === 'mcp') {
    if (!row.endpoint) throw new Error('this integration has no endpoint');
    return new McpClient(row.endpoint).callTool(tool, args);
  }
  if (row.kind === 'notion') {
    const secret = row.secret ?? '';
    if (tool === 'notion_search') {
      const res = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: { authorization: `Bearer ${secret}`, 'notion-version': '2022-06-28', 'content-type': 'application/json' },
        body: JSON.stringify({ query: String(args.query ?? '') }),
      });
      if (!res.ok) return `Notion answered ${res.status}`;
      const data = (await res.json()) as { results: { id: string; properties?: { title?: unknown[] } ; title?: unknown[] }[] };
      return (data.results ?? []).slice(0, 5).map((r) => `${r.id} — ${titleOf(r)}`).join('\n') || 'nothing found';
    }
    const res = await fetch(`https://api.notion.com/v1/blocks/${encodeURIComponent(String(args.page_id ?? ''))}/children`, {
      headers: { authorization: `Bearer ${secret}`, 'notion-version': '2022-06-28' },
    });
    if (!res.ok) return `Notion answered ${res.status}`;
    const data = (await res.json()) as { results: { paragraph?: { rich_text?: { plain_text: string }[] }; heading_1?: { rich_text?: { plain_text: string }[] }; heading_2?: { rich_text?: { plain_text: string }[] } }[] };
    return (data.results ?? []).map((b) => textOf(b)).filter(Boolean).join('\n') || '(an empty page)';
  }
  const secret = row.secret ?? '';
  if (tool === 'drive_search') {
    const q = `name contains '${String(args.query ?? '').replace(/'/g, '')}' and trashed = false`;
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=5`, {
      headers: { authorization: `Bearer ${secret}` },
    });
    if (!res.ok) return `Google answered ${res.status}`;
    const data = (await res.json()) as { files: { id: string; name: string }[] };
    return (data.files ?? []).map((f) => `${f.id} — ${f.name}`).join('\n') || 'nothing found';
  }
  const meta = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(String(args.file_id ?? ''))}?fields=mimeType`, { headers: { authorization: `Bearer ${secret}` } });
  if (!meta.ok) return `Google answered ${meta.status}`;
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(String(args.file_id ?? ''))}?alt=media`, { headers: { authorization: `Bearer ${secret}` } });
  if (!res.ok) return `Google answered ${res.status}`;
  const body = await res.text();
  return body.slice(0, 4000);
}

function titleOf(r: { properties?: { title?: unknown[] }; title?: unknown[] }): string {
  const raw = r.title ?? (r.properties as { title?: unknown[] } | undefined)?.title;
  return richText(raw);
}
function textOf(b: { paragraph?: { rich_text?: { plain_text: string }[] }; heading_1?: { rich_text?: { plain_text: string }[] }; heading_2?: { rich_text?: { plain_text: string }[] } }): string {
  return richText(b.paragraph?.rich_text ?? b.heading_1?.rich_text ?? b.heading_2?.rich_text);
}
function richText(rt: unknown): string {
  if (!Array.isArray(rt)) return '';
  return rt.map((t) => (t as { plain_text?: string }).plain_text ?? '').join('');
}
