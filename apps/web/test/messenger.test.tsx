/**
 * Phase L (REQ-56): the messenger's stamps and the turn scheduler. A batch of owner messages
 * queues; each turn releases exactly one, stamping it sent → delivered → seen on the way, and
 * the teammate answers once per released message.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '../src/data/store';
import { t } from '../src/lib/i18n';
import { callsFor, setHistoryDemoMode } from '../src/lib/history';

// R18 (owner): the diary is a record of model calls that really happened — the tests read it
// back out of the store itself, because "no placeholder reply" also has to mean "no invented
// history row".


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

describe('the realness rule (round eighteen)', () => {
  it('never invents a reply when the person has no model and this is not the demo', async () => {
    useStore.getState().chooseDemo();
    // same fixture, but the demo label is off and the person has no key: the honest case.
    useStore.setState({ demoMode: false, notifyOn: false });
    setHistoryDemoMode(false); // a real company writes its diary
    const th = useStore.getState().threads[0]!;
    const person = th.agentId!;
    useStore.getState().patchAgent(person, { model: null });
    const diaryBefore = (await callsFor(person)).length;

    useStore.getState().sendOwnerMessage(th.id, 'are you really there?', 'en');

    await vi.waitFor(() => {
      expect(thread(th.id).messages.at(-1)?.from).toBe(person);
    }, { timeout: 10_000 });

    // the only answer is the honest one: no scripted voice, and nothing invented in the diary
    expect(thread(th.id).messages.at(-1)!.text).toBe(`— ${t('notConnected', 'en')}`);
    expect((await callsFor(person)).length).toBe(diaryBefore);
  }, 20_000);

  it('shows the typing dots while a real call is in flight and clears them after', async () => {
    useStore.getState().chooseDemo();
    useStore.setState({ demoMode: false, notifyOn: false });
    setHistoryDemoMode(false); // a real company writes its diary
    const th = useStore.getState().threads[0]!;
    const person = th.agentId!;
    useStore.getState().patchAgent(person, {
      model: { provider: 'custom', model: 'test-model', key: 'test-key', baseUrl: 'http://127.0.0.1:8999/v1' },
    });
    const diaryBefore = (await callsFor(person)).length;
    // the real provider path runs — only the wire is leashed, so the test decides when the
    // model's answer arrives and the typing state can be observed mid-call.
    let release: (response: Response) => void = () => {};
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(() => {
      calls += 1;
      return new Promise<Response>((resolve) => { release = resolve; });
    }));

    useStore.getState().sendOwnerMessage(th.id, 'a real question', 'en');

    // while the leashed call is in flight: the dots are up for this thread
    await vi.waitFor(() => expect(useStore.getState().typing).toContain(th.id), { timeout: 10_000 });
    expect(calls).toBe(1);

    release(new Response(JSON.stringify({ choices: [{ message: { content: 'a real answer' } }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    await vi.waitFor(() => expect(useStore.getState().typing).toEqual([]), { timeout: 10_000 });
    expect(thread(th.id).messages.at(-1)).toMatchObject({ from: person, text: 'a real answer' });
    // a call that really happened lands in the diary — exactly one new row
    let diary = await callsFor(person);
    for (let i = 0; i < 100 && diary.length < diaryBefore + 1; i += 1) {
      await new Promise((resolve) => { setTimeout(resolve, 20); });
      diary = await callsFor(person);
    }
    expect(diary.length).toBe(diaryBefore + 1);
    expect(diary[0]).toMatchObject({ agentId: person, purpose: 'chat', output: 'a real answer' });
    vi.unstubAllGlobals();
  }, 20_000);
});
