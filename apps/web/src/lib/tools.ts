/**
 * The tool registry (REQ-53, Phase I) — every capability the app gives a model, declared in
 * ONE place, in the standard tool protocol: a name, a sentence of when-to-use, and a JSON
 * Schema for the arguments. From this one list the app compiles each provider's own wire
 * format (OpenAI tools / Anthropic tools / Gemini functionDeclarations), so the model meets
 * the same tools whichever door it came in through, and the engine executes them identically.
 *
 * Growing the agent is now a one-file affair: a new tool is a new entry here plus its case in
 * the engine's executor — the prompts, the providers and the parsers never change.
 */

export interface ToolDef {
  name: string;
  description: string;
  /** JSON Schema (draft-07 subset every provider accepts). */
  parameters: Record<string, unknown>;
}

/** A tool invocation, normalised across providers. */
export interface ToolCall {
  /** The provider's own call id — echoed back with the result, as each protocol demands. */
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export const APP_TOOLS: ToolDef[] = [
  {
    name: 'update_progress',
    description:
      'Report your progress on the task you are working on. Call this every cycle: your honest ' +
      'percentage, the stage the task is now in, and one short note for the owner.',
    parameters: {
      type: 'object',
      properties: {
        progress: { type: 'number', description: 'Integer 0-100, your honest estimate of how much of the task is done.' },
        stage: { type: 'string', enum: ['progress', 'review', 'done'], description: 'The stage the task is in now.' },
        note: { type: 'string', description: 'One short line: what you did this cycle, or what you need.' },
      },
      required: ['progress', 'stage', 'note'],
    },
  },
  {
    name: 'message_employee',
    description:
      'Send a chat message to another employee of the company. This is the wire for talking: ' +
      'coordination, questions between teammates, handovers. It is NOT for the owner — for the ' +
      'owner use ask_owner.',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'The name of the employee to message.' },
        text: { type: 'string', description: 'The message, in character, brief as a teammate would.' },
      },
      required: ['to', 'text'],
    },
  },
  {
    name: 'send_mail',
    description:
      'Deliver finished work to the owner as a mail letter: a subject, a body in plain markdown, ' +
      'and up to three attachments of text or markdown. This is the deliverables channel — send ' +
      'it when work is ready for the owner to read or accept. Not for questions (ask_owner) and ' +
      'not for conversation (message_employee). One open letter at a time; wait for the reply.',
    parameters: {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'One clear subject line, like an email subject.' },
        body: { type: 'string', description: 'The letter, in plain markdown: # heading, - lists, **bold**.' },
        attachments: {
          type: 'array',
          description: 'Optional documents riding with the letter (at most three).',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              kind: { type: 'string', enum: ['text', 'md'] },
              content: { type: 'string' },
            },
            required: ['name', 'kind', 'content'],
          },
        },
      },
      required: ['subject', 'body'],
    },
  },
  {
    name: 'ask_owner',
    description:
      'Send the owner a letter in their mailbox: one clear question with two to five short ' +
      'options to choose from. Use it when you need the owner to DECIDE something before you ' +
      'can continue, or to deliver something that needs their approval. Mail is not chat — do ' +
      'not use it for conversation.',
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'One clear question for the owner.' },
        options: {
          type: 'array',
          items: { type: 'string' },
          description: 'Two to five short options the owner can answer with.',
        },
      },
      required: ['question', 'options'],
    },
  },
];

/* ── the three wire formats, compiled from the one registry ─────────────────────────────── */

/** Phase K (REQ-55): the tools a connected integration lends the models — one standard
    registry entry per tool, namespaced so two integrations can never collide. */
export function integrationToolDefs(rows: { id: string; label: string; status: string; tools: { name: string; description: string; inputSchema?: unknown }[] }[]): ToolDef[] {
  const defs: ToolDef[] = [];
  for (const row of rows) {
    if (row.status !== 'on') continue;
    for (const t of row.tools) {
      defs.push({
        name: `ix__${row.id}__${t.name}`,
        description: `[${row.label}] ${t.description}`,
        parameters: (t.inputSchema as Record<string, unknown>) ?? { type: 'object', properties: {} },
      });
    }
  }
  return defs;
}

export function toolsForOpenAI(tools: ToolDef[] = APP_TOOLS): unknown[] {
  return tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }));
}

export function toolsForAnthropic(tools: ToolDef[] = APP_TOOLS): unknown[] {
  return tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }));
}

export function toolsForGemini(tools: ToolDef[] = APP_TOOLS): unknown[] {
  return [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })) }];
}

/* ── the three answers, normalised back into ToolCall[] ─────────────────────────────────── */

function argsOf(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'object' && raw !== null) return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) return parsed as Record<string, unknown>;
    } catch {
      /* a model that cannot produce JSON args gets an empty hand — the executor will say so */
    }
  }
  return {};
}

/** OpenAI / OpenAI-compatible: `message.tool_calls[]`. */
export function parseOpenAIToolCalls(message: unknown): ToolCall[] {
  const calls = (message as { tool_calls?: { id?: string; function?: { name?: string; arguments?: string } }[] })?.tool_calls;
  if (!Array.isArray(calls)) return [];
  return calls
    .filter((c) => c?.function?.name)
    .map((c, i) => ({ id: c.id ?? `call-${i + 1}`, name: c.function!.name!, args: argsOf(c.function!.arguments) }));
}

/** Anthropic: content blocks of `type: "tool_use"`. */
export function parseAnthropicToolUses(content: unknown): ToolCall[] {
  if (!Array.isArray(content)) return [];
  return (content as { type?: string; id?: string; name?: string; input?: unknown }[])
    .filter((b) => b?.type === 'tool_use' && b.name)
    .map((b, i) => ({ id: b.id ?? `call-${i + 1}`, name: b.name!, args: argsOf(b.input) }));
}

/** Gemini: response `parts[]` entries carrying `functionCall`. */
export function parseGeminiFunctionCalls(parts: unknown): ToolCall[] {
  if (!Array.isArray(parts)) return [];
  return (parts as { functionCall?: { name?: string; args?: unknown } }[])
    .filter((p) => p?.functionCall?.name)
    .map((p, i) => ({ id: `call-${i + 1}`, name: p.functionCall!.name!, args: argsOf(p.functionCall!.args) }));
}

/** The one sentence every system prompt carries about the tools — written once, here. */
export function toolsPromptSection(tools: ToolDef[] = APP_TOOLS): string {
  const lines = [
    'Your tools: you work like any agent — you are given tools, and you use them instead of',
    'describing what you would do. The tools you have:',
  ];
  for (const tool of tools) lines.push(`- ${tool.name}: ${tool.description}`);
  lines.push(
    'Call the tools directly when the platform gives them to you. If — and only if — no tools',
    'are attached to the request, answer with ONE JSON object instead:',
    '{"progress": <0-100>, "stage": "progress"|"review"|"done", "note": "<one line>",',
    ' "ask": OPTIONAL {"question": "...", "options": ["...", "..."]}}',
    'Mail discipline: ask_owner and send_mail are MAIL — decisions and deliverables for the',
    'owner, never conversation. Talking to teammates is message_employee. Never mix the wires.',
    'And mail is turn-taking: while a letter of yours is open with the owner, write nothing',
    'new — wait for the reply.' ,
  );
  return lines.join('\n');
}
