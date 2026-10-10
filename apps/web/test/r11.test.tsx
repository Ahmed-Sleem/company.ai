/**
 * R11 (owner, eleventh round): the demo is a showroom, not a save. Every entry is fresh,
 * nothing is written to the visitor's storage while it runs, and the visitor's own companies
 * persist exactly as before.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../src/data/store';

beforeEach(() => {
  localStorage.clear();
});

describe('the demo is a showroom (R11)', () => {
  it('every entry is fresh — what the last visitor broke is gone', () => {
    useStore.getState().chooseDemo();
    const before = useStore.getState().tasks[0]!;
    useStore.getState().patchTask(before.id, { progress: 99 });
    expect(useStore.getState().tasks[0]!.progress).toBe(99);
    useStore.getState().chooseDemo();
    expect(useStore.getState().tasks[0]!.progress).toBe(before.progress);
  });

  it('nothing is written to the visitor\u2019s storage while the demo runs', () => {
    localStorage.setItem('company.ai.save.v1', '{"sentinel":true}');
    useStore.getState().chooseDemo();
    useStore.getState().patchTask(useStore.getState().tasks[0]!.id, { progress: 50 });
    useStore.getState().addMessage(
      useStore.getState().threads[0]!.id, 'you', 'does this stick?',
    );
    expect(JSON.parse(localStorage.getItem('company.ai.save.v1')!)).toEqual({ sentinel: true });
    // the demo's own changes go to the throwaway key, never the visitor's save…
    expect(localStorage.getItem('company.ai.demo.v1')).toBeTruthy();
    // …and choosing the demo again wipes it clean
    useStore.getState().chooseDemo();
    expect(JSON.parse(localStorage.getItem('company.ai.demo.v1')!).state.tasks[0].progress)
      .not.toBe(50);
  });

  it('the visitor\u2019s own company still persists, as it always did', () => {
    useStore.getState().chooseDemo();
    // load() is how a user save arrives — it ends the demo session
    useStore.getState().load({ demoMode: false });
    useStore.getState().patchTask(useStore.getState().tasks[0]!.id, { progress: 42 });
    const written = localStorage.getItem('company.ai.save.v1');
    expect(written).not.toBeNull();
    expect(written).toContain('42');
  });
});
