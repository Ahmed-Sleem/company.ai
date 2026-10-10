/**
 * Phase M (REQ-57): the per-employee diary. Dexie on fake-indexeddb — exact rows in, exact
 * rows out, newest first, per person; and the demo showroom writes nothing into it.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { recordCall, callsFor, historyDb } from '../src/lib/history';
import { useStore } from '../src/data/store';
import { HistoryView } from '../src/views/HistoryView';

const call = (over: Partial<Parameters<typeof recordCall>[0]>) => ({
  agentId: 'p-1', at: 't', purpose: 'chat' as const, provider: 'local', model: 'local-voice',
  system: 'S', input: 'in', toolCalls: '[]', output: 'out', ...over,
});

beforeEach(async () => {
  localStorage.clear();
  await historyDb().calls.clear();
});

describe('the diary store (Phase M)', () => {
  it('keeps each person’s calls exact, and newest first', async () => {
    await recordCall(call({ output: 'O1' }));
    await recordCall(call({ purpose: 'cycle', provider: 'anthropic', model: 'm', output: 'O2', toolCalls: '[{"name":"update_progress"}]' }));
    await recordCall(call({ agentId: 'p-2', output: 'O3' }));
    const rows = await callsFor('p-1');
    expect(rows.map((r) => r.output)).toEqual(['O2', 'O1']);
    expect(rows[0]?.toolCalls).toContain('update_progress');
    expect(rows[0]?.system).toBe('S');
    expect((await callsFor('p-2')).map((r) => r.output)).toEqual(['O3']);
  });

  it('the demo showroom writes no history at all', async () => {
    useStore.getState().chooseDemo();
    await recordCall(call({}));
    expect(await callsFor('p-1')).toEqual([]);
    useStore.getState().load({});
    await recordCall(call({}));
    expect((await callsFor('p-1')).length).toBe(1);
  });
});

describe('the diary viewer (Phase M)', () => {
  it('opens on a person and says so plainly when the diary is empty', async () => {
    render(<HistoryView agentId="p-1" lang="en" />);
    expect((await screen.findAllByText(/No calls recorded/)).length).toBeGreaterThan(0);
    expect(document.querySelector('[data-history-view]')).toBeTruthy();
  });

  it('lists recorded calls and opens the exact transcript', async () => {
    await recordCall(call({ output: 'the exact words', system: 'the exact system', input: 'the exact input' }));
    render(<HistoryView agentId="p-1" lang="en" />);
    expect((await screen.findAllByText(/the exact words/)).length).toBeGreaterThan(0);
    expect(await screen.findByText('the exact system')).toBeTruthy();
    expect(await screen.findByText('the exact input')).toBeTruthy();
  });
});
