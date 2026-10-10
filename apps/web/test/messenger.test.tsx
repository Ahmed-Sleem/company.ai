/**
 * Phase L (REQ-56): the messenger's stamps and the turn scheduler. A batch of owner messages
 * queues; each turn releases exactly one, stamping it sent → delivered → seen on the way, and
 * the teammate answers once per released message.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '../src/data/store';

beforeEach(() => {
  localStorage.clear();
});

const thread = (id: string) => useStore.getState().threads.find((x) => x.id === id)!;

describe('the turn scheduler (Phase L)', () => {
  it('queues a batch and releases one message per turn', async () => {
    useStore.getState().chooseDemo();
    const th = useStore.getState().threads[0]!;
    const s = useStore.getState();
    s.sendOwnerMessage(th.id, 'one', 'en');
    s.sendOwnerMessage(th.id, 'two', 'en');
    s.sendOwnerMessage(th.id, 'three', 'en');
    // straight after the batch: all three delivered, all three waiting, no turn spent yet
    expect(thread(th.id).queue!.length).toBe(3);
    expect(thread(th.id).messages.filter((m) => m.from === 'you').slice(-3).map((m) => m.stamp))
      .toEqual(['delivered', 'delivered', 'delivered']);
    const repliesBefore = thread(th.id).messages.filter((m) => m.from !== 'you').length;

    await vi.waitFor(() => {
      expect(thread(th.id).queue!.length).toBe(0);
      expect(thread(th.id).messages.filter((m) => m.from !== 'you').length - repliesBefore).toBe(3);
    }, { timeout: 10_000 });

    // every queued message ended seen, in order
    expect(thread(th.id).messages.filter((m) => m.from === 'you').slice(-3).map((m) => m.stamp))
      .toEqual(['seen', 'seen', 'seen']);
  }, 20_000);

  it('a lone message walks sent → delivered → seen', async () => {
    useStore.getState().chooseDemo();
    const th = useStore.getState().threads[1] ?? useStore.getState().threads[0]!;
    useStore.getState().sendOwnerMessage(th.id, 'hello there', 'en');
    const mine = () => thread(th.id).messages.filter((m) => m.from === 'you').at(-1)!;
    expect(mine().stamp).toBe('delivered'); // queued the same instant it was acknowledged
    await vi.waitFor(() => {
      expect(mine().stamp).toBe('seen');
      expect(thread(th.id).messages.at(-1)?.from).toBe(thread(th.id).agentId);
    }, { timeout: 10_000 });
  }, 20_000);

  it('old saves without queues load without breaking the scheduler', () => {
    useStore.getState().load({ threads: [{ id: 'thr-9', title: 'old', internal: true, agentId: null, lastMessage: null, messages: [] }] });
    useStore.getState().pumpThread('thr-9', 'en'); // no queue — a quiet no-op, not a crash
    expect(thread('thr-9').queue).toEqual([]);
  });
});
