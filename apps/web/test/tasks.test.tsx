/**
 * The board's behaviour, in a DOM.
 *
 * The point of these tests is the *rule boundary*: the interface must render the moves the server
 * offered, refuse the ones it refused (with the server's own words), and never invent a move of
 * its own. Filtering, the layout switch and the statistics are checked because the designer's demo
 * has them and "parity" has to mean something a machine can verify.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { TasksView } from '../src/views/TasksView';
import { PORTRAITS } from '../src/lib/avatars.data';

const ANA = '11111111-1111-4111-8111-111111111111';
const LEO = '22222222-2222-4222-8222-222222222222';
const ME = '33333333-3333-4333-8333-333333333333';

const task = (over: Record<string, unknown>) => ({
  id: `00000000-0000-4000-8000-00000000000${String(over.n ?? 1)}`,
  shortRef: 'TSK-142',
  title: 'A task',
  titleAr: 'مهمة',
  description: null, descriptionAr: null,
  stage: 'backlog', priority: 'medium', progress: 0,
  dueDate: '2026-10-05T00:00:00.000Z',
  ownerAgentId: ANA,
  owner: { id: ANA, name: 'Aria', role: 'Lead engineer', avatar: 3 },
  offers: [{ to: 'progress', ok: true, reason: null }],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...over,
});

// Two tasks: one that can move, one blocked at the review gate (as the server would report).
let tasks = [
  task({ n: 1, shortRef: 'TSK-142', title: 'Refine the streaming pipeline', stage: 'progress', priority: 'high', progress: 65,
    offers: [{ to: 'review', ok: true, reason: null }, { to: 'backlog', ok: true, reason: null }] }),
  task({ n: 2, shortRef: 'TSK-155', title: 'Rehearse the migration', stage: 'review', priority: 'medium', progress: 85,
    ownerAgentId: LEO, owner: { id: LEO, name: 'Leo', role: 'Software engineer' },
    offers: [
      { to: 'done', ok: false, reason: { en: 'A person has to approve this first.', ar: 'يجب أن يوافق شخص أولًا.' } },
      { to: 'progress', ok: true, reason: null },
    ] }),
];

const calls: Array<{ url: string; method: string; body: unknown }> = [];

beforeEach(() => {
  calls.length = 0;
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : null });
    if (url.includes('/api/session')) {
      return new Response(JSON.stringify({ member: { id: ME, name: 'Vanil', role: 'owner' } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.includes('/transition')) return new Response(JSON.stringify({ task: { id: 'x', stage: 'review' } }), { status: 200 });
    return new Response(JSON.stringify({ tasks }), { status: 200, headers: { 'content-type': 'application/json' } });
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the board shows what the demo shows', () => {
  it('counts the four statistics from the real rows', async () => {
    const { container } = render(<TasksView lang="en" />);
    await screen.findByText('Refine the streaming pipeline');
    const stats = within(container.querySelector('.stats') as HTMLElement);
    expect(stats.getByText('Open tasks').nextSibling?.textContent).toBe('2');
    // "In review" appears twice on purpose — once as the statistic, once as the column head.
    expect(stats.getByText('In review').nextSibling?.textContent).toBe('1');
    expect(stats.getByText('Completed').nextSibling?.textContent).toBe('0');
    expect(stats.getByText('In progress').nextSibling?.textContent).toBe('1');
  });

  it('shows each task’s reference, owner, portrait and progress', async () => {
    const { container } = render(<TasksView lang="en" />);
    await screen.findByText('Refine the streaming pipeline');
    expect(screen.getByText('TSK-142')).toBeTruthy();
    expect(screen.getAllByText('Leo').length).toBeGreaterThan(0);
    expect(screen.getByText('65%')).toBeTruthy();
    // the owner comes with a portrait index and the card draws that portrait (the designer's own art)
    const portrait = container.querySelector(`[data-task="${task({ n: 1 }).id}"] .avatar`);
    expect(portrait?.getAttribute('data-avatar')).toBe('3');
    expect(portrait?.querySelector('svg path')?.getAttribute('d')).toBe(PORTRAITS[3]!.path);
  });

  it('filters by priority, by owner and by search text', async () => {
    render(<TasksView lang="en" />);
    await screen.findByText('Refine the streaming pipeline');

    fireEvent.change(screen.getByLabelText('All priorities'), { target: { value: 'medium' } });
    await waitFor(() => expect(screen.queryByText('Refine the streaming pipeline')).toBeNull());
    expect(screen.getByText('Rehearse the migration')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('All priorities'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('All owners'), { target: { value: ANA } });
    await waitFor(() => expect(screen.queryByText('Rehearse the migration')).toBeNull());

    fireEvent.change(screen.getByLabelText('All owners'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Search tasks…'), { target: { value: 'TSK-155' } });
    await waitFor(() => expect(screen.queryByText('Refine the streaming pipeline')).toBeNull());
    expect(screen.getByText('Rehearse the migration')).toBeTruthy();
  });

  it('says nothing matches rather than pretending the board is empty', async () => {
    render(<TasksView lang="en" />);
    await screen.findByText('Refine the streaming pipeline');
    fireEvent.change(screen.getByLabelText('Search tasks…'), { target: { value: 'zzz' } });
    await screen.findByText('Nothing matches');
    expect(screen.queryByText('No tasks here')).toBeNull();
  });

  it('switches between the board and the list, keeping the same rows', async () => {
    render(<TasksView lang="en" />);
    await screen.findByText('Refine the streaming pipeline');
    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    await screen.findByRole('table');
    expect(within(screen.getByRole('table')).getByText('Rehearse the migration')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Board' }));
    await screen.findByRole('button', { name: /Refine the streaming pipeline/ });
  });
});

describe('moving a task is the server’s decision, shown honestly', () => {
  it('offers the moves the server allowed, and disables the one it refused with its reason', async () => {
    render(<TasksView lang="en" />);
    fireEvent.click(await screen.findByRole('button', { name: /Rehearse the migration/ }));

    const finish = await screen.findByRole('button', { name: 'Move to Completed' });
    expect(finish.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('A person has to approve this first.')).toBeTruthy();

    const back = screen.getByRole('button', { name: 'Move to In progress' });
    expect(back.hasAttribute('disabled')).toBe(false);
  });

  it('sends the chosen move to the server and reloads the board', async () => {
    render(<TasksView lang="en" />);
    fireEvent.click(await screen.findByRole('button', { name: /Refine the streaming pipeline/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Move to In review' }));

    await waitFor(() => expect(calls.some((call) => call.url.includes('/transition'))).toBe(true));
    const move = calls.find((call) => call.url.includes('/transition'))!;
    expect(move.method).toBe('POST');
    expect(move.body).toMatchObject({ to: 'review' });
    // The acting member is the one the server published. The board once sent the literal string
    // 'owner' here, and every move failed with a 422 while the interface blamed the rule.
    expect(move.body).toMatchObject({ actor: { kind: 'member', id: ME } });
    expect(calls.some((call) => call.url.endsWith('/api/session'))).toBe(true);
    // it re-reads the board afterwards, so what is shown is what the database holds
    await waitFor(() => expect(calls.filter((call) => call.url.endsWith('/api/tasks')).length).toBeGreaterThan(1));
  });

  it('shows the server’s own refusal instead of a generic failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/transition')) {
        return new Response(JSON.stringify({ error: { code: 'review_gate_needs_approval', message: 'Waiting for the approval that lets this finish.' } }), { status: 409 });
      }
      return new Response(JSON.stringify({ tasks }), { status: 200, headers: { 'content-type': 'application/json' } });
    }));
    render(<TasksView lang="en" />);
    fireEvent.click(await screen.findByRole('button', { name: /Refine the streaming pipeline/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Move to In review' }));
    await screen.findByText('Waiting for the approval that lets this finish.');
  });
});
