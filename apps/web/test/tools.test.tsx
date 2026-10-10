/**
 * REQ-53 (Phase I): the standard tool protocol, end to end minus the network.
 *
 *  · the registry compiles into each provider's wire format from ONE declaration;
 *  · each provider's answer parses back into the same ToolCall shape;
 *  · an executed call really moves the studio — progress written, message delivered, letter
 *    filed — and a bad call is answered in words, never swallowed;
 *  · and REQ-52's one-root tree is guarded where the data lives: no second root, no cycles.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runTick } from '../src/lib/engine';
import { chatTurn, chatCompletion } from '../src/lib/providers';

vi.mock('../src/lib/providers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/providers')>();
  return { ...actual, chatTurn: vi.fn(), chatCompletion: vi.fn() };
});

const turn = vi.mocked(chatTurn);
const completion = vi.mocked(chatCompletion);
import {
  APP_TOOLS, toolsForOpenAI, toolsForAnthropic, toolsForGemini, toolsPromptSection,
  parseOpenAIToolCalls, parseAnthropicToolUses, parseGeminiFunctionCalls,
} from '../src/lib/tools';
import { runTool, type ToolContext } from '../src/lib/toolrun';
import { useStore } from '../src/data/store';

describe('the registry — one declaration, three wire formats', () => {
  it('declares the three capabilities every model gets', () => {
    expect(APP_TOOLS.map((tool) => tool.name)).toEqual(['update_progress', 'message_employee', 'ask_owner']);
  });

  it('compiles the OpenAI shape: type function, JSON-schema parameters', () => {
    const tools = toolsForOpenAI() as { type: string; function: { name: string; parameters: unknown } }[];
    expect(tools).toHaveLength(3);
    expect(tools[0]!.type).toBe('function');
    expect(tools[0]!.function.parameters).toEqual(APP_TOOLS[0]!.parameters);
  });

  it('compiles the Anthropic shape: input_schema carries the same schema', () => {
    const tools = toolsForAnthropic() as { name: string; input_schema: unknown }[];
    expect(tools[2]!.name).toBe('ask_owner');
    expect(tools[2]!.input_schema).toEqual(APP_TOOLS[2]!.parameters);
  });

  it('compiles the Gemini shape: one functionDeclarations block', () => {
    const tools = toolsForGemini() as { functionDeclarations: { name: string }[] }[];
    expect(tools).toHaveLength(1);
    expect(tools[0]!.functionDeclarations.map((d) => d.name)).toEqual(['update_progress', 'message_employee', 'ask_owner']);
  });

  it('the prompt section teaches every tool and the JSON fallback', () => {
    const section = toolsPromptSection();
    for (const tool of APP_TOOLS) expect(section).toContain(tool.name);
    expect(section).toContain('"progress"');
    expect(section).toContain('message_employee');
  });
});

describe('the answers — three dialects, one ToolCall', () => {
  it('reads OpenAI tool_calls, arguments string and all', () => {
    const calls = parseOpenAIToolCalls({
      tool_calls: [{ id: 'c1', function: { name: 'update_progress', arguments: '{"progress":30,"stage":"progress","note":"on it"}' } }],
    });
    expect(calls).toEqual([{ id: 'c1', name: 'update_progress', args: { progress: 30, stage: 'progress', note: 'on it' } }]);
  });

  it('a model that cannot produce JSON args gets an empty hand, not a crash', () => {
    expect(parseOpenAIToolCalls({ tool_calls: [{ id: 'c1', function: { name: 'update_progress', arguments: '{"progress":3' } }] }))
      .toEqual([{ id: 'c1', name: 'update_progress', args: {} }]);
  });

  it('reads Anthropic tool_use blocks and ignores the text around them', () => {
    const calls = parseAnthropicToolUses([
      { type: 'text', text: 'Let me check in with Marcus.' },
      { type: 'tool_use', id: 't1', name: 'message_employee', input: { to: 'Marcus', text: 'status?' } },
    ]);
    expect(calls).toEqual([{ id: 't1', name: 'message_employee', args: { to: 'Marcus', text: 'status?' } }]);
  });

  it('reads Gemini functionCall parts', () => {
    const calls = parseGeminiFunctionCalls([
      { text: 'thinking aloud' },
      { functionCall: { name: 'ask_owner', args: { question: 'Which tone?', options: ['Formal', 'Friendly'] } } },
    ]);
    expect(calls).toEqual([{ id: 'call-1', name: 'ask_owner', args: { question: 'Which tone?', options: ['Formal', 'Friendly'] } }]);
  });
});

/* ── executing calls against a real (demo) studio ───────────────────────────────────────── */

function context(overrides: Partial<ToolContext> = {}): ToolContext {
  const state = useStore.getState();
  const caller = state.agents.find((a) => a.id === 'aria')!;
  const task = state.tasks.find((t) => t.ownerAgentId === 'aria')!;
  return { state, caller, task, lang: 'en', report: vi.fn(), ...overrides };
}

describe('runTool — the studio really moves', () => {
  beforeEach(() => {
    useStore.getState().chooseDemo();
  });

  it('update_progress writes through the engine\'s own writer, clamped', () => {
    const ctx = context();
    const result = runTool({ id: '1', name: 'update_progress', args: { progress: 150, stage: 'review', note: 'nearly' } }, ctx);
    expect(ctx.report).toHaveBeenCalledWith({ progress: 100, stage: 'review', note: 'nearly' });
    expect(result).toContain('100%');
  });

  it('update_progress refuses bad numbers and bad stages — in words', () => {
    const ctx = context();
    expect(runTool({ id: '1', name: 'update_progress', args: { progress: 'lots', stage: 'progress', note: '' } }, ctx)).toContain('number');
    expect(runTool({ id: '1', name: 'update_progress', args: { progress: 40, stage: 'finished', note: '' } }, ctx)).toContain('stage');
    expect(ctx.report).not.toHaveBeenCalled();
  });

  it('message_employee delivers into the colleague\'s thread, opening it when needed', () => {
    const ctx = context();
    const result = runTool({ id: '1', name: 'message_employee', args: { to: 'Marcus', text: 'where are we on the deck?' } }, ctx);
    expect(result).toContain('Delivered');
    const thread = useStore.getState().threads.find((th) => th.agentId === 'marcus');
    expect(thread?.messages.some((m) => m.from === 'aria' && m.text === 'where are we on the deck?')).toBe(true);
  });

  it('message_employee answers a wrong name with the colleague list', () => {
    const ctx = context();
    const result = runTool({ id: '1', name: 'message_employee', args: { to: 'Nobody', text: 'hello?' } }, ctx);
    expect(result).toContain('no colleague');
    expect(result).toContain('Marcus');
  });

  it('ask_owner files a letter in the mailbox, numbered like the rest of the save', () => {
    const ctx = context();
    const before = useStore.getState().decisions.length;
    const result = runTool({ id: '1', name: 'ask_owner', args: { question: 'Which tone?', options: ['Formal', 'Friendly'] } }, ctx);
    expect(result).toContain('mailbox');
    const decisions = useStore.getState().decisions;
    expect(decisions).toHaveLength(before + 1);
    expect(decisions.some((d) => d.title === 'Which tone?' && d.agentId === 'aria')).toBe(true);
  });

  it('ask_owner insists on a question and at least two options', () => {
    const ctx = context();
    expect(runTool({ id: '1', name: 'ask_owner', args: { question: 'Q?', options: ['only one'] } }, ctx)).toContain('two to five');
    expect(runTool({ id: '1', name: 'ask_owner', args: { question: '', options: ['a', 'b'] } }, ctx)).toContain('two to five');
  });

  it('an unknown tool is answered, not thrown', () => {
    expect(runTool({ id: '1', name: 'launch_missiles', args: {} }, context())).toContain('no tool called');
  });
});

/* ── REQ-52: one root, guarded where the data lives ─────────────────────────────────────── */

describe('the one-root tree (REQ-52)', () => {
  beforeEach(() => {
    useStore.getState().chooseDemo();
  });

  it('the demo company has exactly one root — and it is Aria', () => {
    const roots = useStore.getState().agents.filter((a) => a.managerId === null);
    expect(roots.map((a) => a.id)).toEqual(['aria']);
  });

  it('the store refuses a second root, both ways in', () => {
    expect(useStore.getState().addAgent({
      name: 'Second Boss', nameAr: null, role: 'CEO', roleAr: null, focus: null, focusAr: null,
      avatar: 1, managerId: null, model: null,
    })).toBeNull();
    expect(useStore.getState().patchAgent('marcus', { managerId: null })).toBeNull();
    // the tree did not move
    expect(useStore.getState().agents.filter((a) => a.managerId === null)).toHaveLength(1);
  });

  it('the store refuses a cycle before it can close', () => {
    // marcus reports to aria; making aria report to marcus would close the loop
    expect(useStore.getState().patchAgent('aria', { managerId: 'marcus' })).toBeNull();
    expect(useStore.getState().agents.find((a) => a.id === 'aria')!.managerId).toBeNull();
  });

  it('legal moves still go through', () => {
    const hired = useStore.getState().addAgent({
      name: 'New Hire', nameAr: null, role: 'Analyst', roleAr: null, focus: null, focusAr: null,
      avatar: 1, managerId: 'aria', model: null,
    });
    expect(hired?.managerId).toBe('aria');
    expect(useStore.getState().patchAgent(hired!.id, { managerId: 'marcus' })?.managerId).toBe('marcus');
  });
});

/* ── the engine cycle: a model that works through the tools ─────────────────────────────── */

describe('runTick — the standard tool path, no network', () => {
  beforeEach(() => {
    useStore.getState().chooseDemo();
    const ariaTask = useStore.getState().tasks.find((t) => t.ownerAgentId === 'aria' && t.stage === 'progress');
    expect(ariaTask).toBeTruthy();
    useStore.setState((s) => ({
      agents: s.agents.map((a) => (a.id === 'aria'
        ? { ...a, model: { provider: 'custom' as const, model: 'test-model', key: 'k', baseUrl: 'http://127.0.0.1:9/v1' } }
        : a)),
      tasks: s.tasks.filter((t) => t.id === ariaTask!.id).map((t) => ({ ...t, progress: 10 })),
    }));
    turn.mockReset();
    completion.mockReset();
  });

  it('a model that calls update_progress moves the task — the contract call never happens', async () => {
    turn.mockResolvedValueOnce({
      text: '', toolCalls: [{ id: 'c1', name: 'update_progress', args: { progress: 61, stage: 'progress', note: 'through the tools' } }],
    });
    runTick('en', true);
    await vi.waitFor(() => expect(useStore.getState().tasks[0]!.progress).toBe(61));
    expect(turn).toHaveBeenCalledTimes(1);
    expect(completion).not.toHaveBeenCalled();
    const said = useStore.getState().threads.flatMap((th) => th.messages).some((m) => m.text.includes('through the tools'));
    expect(said).toBe(true);
  });

  it('a model that messages a colleague gets the delivery answer, then keeps working', async () => {
    turn
      .mockResolvedValueOnce({ text: '', toolCalls: [{ id: 'c1', name: 'message_employee', args: { to: 'Marcus', text: 'deck status?' } }] })
      .mockResolvedValueOnce({ text: '', toolCalls: [{ id: 'c2', name: 'update_progress', args: { progress: 35, stage: 'progress', note: 'asked Marcus' } }] });
    runTick('en', true);
    await vi.waitFor(() => expect(useStore.getState().tasks[0]!.progress).toBe(35));
    expect(turn).toHaveBeenCalledTimes(2);
    // the tool result went back to the model, in words
    expect(turn.mock.calls[1]![2]).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: 'tool', name: 'message_employee' }),
    ]));
    const thread = useStore.getState().threads.find((th) => th.agentId === 'marcus');
    expect(thread?.messages.some((m) => m.text === 'deck status?')).toBe(true);
  });

  it('a model that answers in the JSON fallback contract is still understood', async () => {
    turn.mockResolvedValue({ text: '{"progress": 44, "stage": "progress", "note": "plain json"}', toolCalls: [] });
    runTick('en', true);
    await vi.waitFor(() => expect(useStore.getState().tasks[0]!.progress).toBe(44));
    expect(completion).not.toHaveBeenCalled();
  });

  it('a platform with no tools and no JSON falls through to the contract attempts, then the heartbeat', async () => {
    turn.mockRejectedValue(new Error('tools not supported'));
    completion.mockRejectedValue(new Error('provider down'));
    runTick('en', true);
    await vi.waitFor(() => expect(completion).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(useStore.getState().tasks[0]!.progress).toBeGreaterThan(10));
  });
});
