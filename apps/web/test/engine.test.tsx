/**
 * REQ-42: the structured progress report. The contract lives in lib/prompt.ts, the parser and
 * the cycle live in lib/engine.ts — these tests hold both ends: what the parser accepts, what
 * a real cycle writes into the store (through a fake provider, never the network), and that a
 * failing provider falls back to the local heartbeat instead of stalling the studio.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseReport, runTick } from '../src/lib/engine';
import { useStore } from '../src/data/store';
import { chatCompletion } from '../src/lib/providers';

vi.mock('../src/lib/providers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/providers')>();
  return { ...actual, chatCompletion: vi.fn() };
});

const reply = vi.mocked(chatCompletion);

describe('parseReport — the contract, strictly', () => {
  it('reads the plain JSON object the contract asks for', () => {
    expect(parseReport('{"progress": 42, "stage": "progress", "note": "halfway"}'))
      .toEqual({ progress: 42, stage: 'progress', note: 'halfway' });
  });

  it('tolerates the markdown fences models love', () => {
    expect(parseReport('```json\n{"progress": 7, "stage": "review", "note": "checking"}\n```'))
      .toEqual({ progress: 7, stage: 'review', note: 'checking' });
  });

  it('clamps the number into 0..100', () => {
    expect(parseReport('{"progress": 150, "stage": "done", "note": ""}')?.progress).toBe(100);
    expect(parseReport('{"progress": -5, "stage": "progress", "note": ""}')?.progress).toBe(0);
  });

  it('rejects malformed answers — they earn the retry, not the store', () => {
    expect(parseReport('I am doing great!')).toBeNull();
    expect(parseReport('{"progress": "lots", "stage": "progress", "note": ""}')).toBeNull();
    expect(parseReport('{"progress": 40, "stage": "finished", "note": ""}')).toBeNull();
    expect(parseReport('{"progress": 40, "note": "no stage"}')).toBeNull();
  });
});

describe('runTick — a real model does the reporting', () => {
  beforeEach(() => {
    useStore.getState().chooseDemo();
    // Wire one agent to a (fake) provider and make sure the tick can only pick their task.
    const aria = useStore.getState().agents.find((a) => a.id === 'aria');
    const ariaTask = useStore.getState().tasks.find((task) => task.ownerAgentId === 'aria' && task.stage === 'progress');
    expect(aria && ariaTask).toBeTruthy();
    useStore.setState((s) => ({
      agents: s.agents.map((a) => (a.id === 'aria'
        ? { ...a, model: { provider: 'custom' as const, model: 'test-model', key: 'k', baseUrl: null } }
        : a)),
      tasks: s.tasks.filter((task) => task.id === ariaTask!.id).map((task) => ({ ...task, progress: 10 })),
    }));
    reply.mockReset();
  });

  it('asks the model, parses the contract, writes progress and posts the note', async () => {
    reply.mockResolvedValue('{"progress": 42, "stage": "progress", "note": "halfway there"}');
    const result = runTick('en', true);
    expect(result).toMatch(/^asked:/);
    expect(reply).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => {
      const task = useStore.getState().tasks[0]!;
      expect(task.progress).toBe(42);
    });
    const note = useStore.getState().threads
      .flatMap((th) => th.messages)
      .some((m) => m.text.includes('halfway there'));
    expect(note).toBe(true);
  });

  it('keeps the stage legal — the shared transition table outranks the model', async () => {
    reply.mockResolvedValue('{"progress": 90, "stage": "done", "note": "nearly"}');
    runTick('en', true);
    await vi.waitFor(() => {
      const task = useStore.getState().tasks[0]!;
      expect(task.progress).toBe(90);
      // progress → done is not a legal jump; the task stays where the table allows
      expect(task.stage).toBe('progress');
    });
  });

  it('retries one malformed answer, then accepts the good one', async () => {
    reply
      .mockResolvedValueOnce('Sorry, I cannot report right now.')
      .mockResolvedValueOnce('{"progress": 55, "stage": "progress", "note": "back on track"}');
    runTick('en', true);
    await vi.waitFor(() => expect(reply).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(useStore.getState().tasks[0]!.progress).toBe(55));
  });

  it('falls back to the local heartbeat when the provider keeps failing', async () => {
    reply.mockRejectedValue(new Error('provider down'));
    runTick('en', true);
    await vi.waitFor(() => expect(reply).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => {
      expect(useStore.getState().tasks[0]!.progress).toBeGreaterThan(10);
    });
  });
});

describe('runTick — no provider, no problem', () => {
  it('moves work with the local heartbeat', () => {
    useStore.getState().chooseDemo();
    // chooseDemo is idempotent — the provider-wired agent from the tests above may persist,
    // so this test unplugs everybody itself: the heartbeat must be what moves the work.
    useStore.setState((s) => ({ agents: s.agents.map((a) => ({ ...a, model: null })) }));
    const before = useStore.getState().tasks.map((task) => task.progress).join(',');
    const result = runTick('en', true);
    expect(result).not.toBeNull();
    const after = useStore.getState().tasks.map((task) => task.progress).join(',');
    expect(after).not.toBe(before);
  });
});
