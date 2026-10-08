/**
 * Shell tests — the GUI contract, checked in a DOM.
 *
 * These are the assertions that would catch "the app quietly stopped matching the design":
 * the six views exist in the demo's order, Arabic really flips the document, the theme really
 * switches, and every view renders its four data states.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { VIEWS } from '@company/contracts';
import { App } from '../src/App';
import { DataState } from '../src/components/DataState';

const agents = {
  agents: [
    {
      id: '11111111-1111-4111-8111-111111111111', name: 'Aria', role: 'Lead engineer',
      status: 'working', modelId: null, capabilities: ['TypeScript'],
      budget: { limitCents: 4000, spentCents: 1250, remainingCents: 2750, exceeded: false },
    },
  ],
};

const tasks = {
  tasks: [
    { id: '33333333-3333-4333-8333-333333333333', title: 'Refine the streaming pipeline',
      stage: 'progress', priority: 'high', progress: 65,
      ownerAgentId: '11111111-1111-4111-8111-111111111111' },
  ],
};

const decisions = {
  decisions: [
    {
      id: '44444444-4444-4444-8444-444444444444', kind: 'access', status: 'pending',
      title: 'Analytics read access', agentId: null,
      rule: { id: 'access.analytics.read', observed: 0, threshold: 0, unit: 'count' },
      diff: { kind: 'permission', summary: 'Read-only analytics access', before: 'none', after: 'read' },
      audit: { raisedAt: '2026-10-03T00:00:00.000Z', decidedByLabel: null, decidedAt: null },
      outcome: null,
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const body = url.includes('/api/health')
      ? { ok: true, version: 'p0', company: 'Acme Studio' }
      : url.includes('/api/agents') ? agents
      : url.includes('/api/tasks') ? tasks
      : url.includes('/api/decisions') ? decisions
      : url.includes('/api/models') ? { models: [{ id: '55555555-5555-4555-8555-555555555555', displayName: 'GPT-5.2', lane: 'strong', inputCentsPerMTok: 250, outputCentsPerMTok: 1000, lifecycle: 'ga' }] }
      : url.includes('/api/company') ? { company: { id: '22222222-2222-4222-8222-222222222222', name: 'Acme Studio' } }
      : url.includes('/api/threads') ? { threads: [{ id: '77777777-7777-4777-8777-777777777777', title: 'Streaming pipeline review', internal: false, lastMessage: { text: 'Ready for review', authorKind: 'agent' } }] }
      : {};
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  }));
  localStorage.clear();
  location.hash = '';
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the shell matches the locked design', () => {
  it('renders the demo’s six views, in the demo’s order', async () => {
    render(<App />);
    const nav = await screen.findAllByRole('button');
    const ids = nav.map((b) => b.getAttribute('data-nav')).filter(Boolean);
    expect(ids).toEqual(VIEWS.map((v) => v.id));
  });

  it('switches to Arabic and flips the document to rtl', async () => {
    render(<App />);
    const language = await screen.findByRole('button', { name: /العربية|English/ });
    language.click();
    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'));
    expect(document.documentElement.lang).toBe('ar');
  });

  it('switches the theme, and remembers it like the demo does', async () => {
    render(<App />);
    const themeButton = await screen.findByRole('button', { name: /theme/i });
    themeButton.click();
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'));
    themeButton.click();
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
  });

  it('shows the team roster with no budget meter anywhere (REQ-32)', async () => {
    // The product has no budget: the roster keeps names, roles and status, and the meter —
    // the last thing on this screen that spoke money — is gone. This test failed while the
    // meter still rendered, which is the observation the rule requires.
    render(<App />);
    expect(await screen.findByText('Aria')).toBeTruthy();
    expect(screen.queryByRole('meter')).toBeNull();
    expect(document.body.textContent?.toLowerCase()).not.toContain('budget');
  });

  it('shows the board in the demo’s four stages', async () => {
    location.hash = '#tasks';
    render(<App />);
    expect(await screen.findByText('Refine the streaming pipeline')).toBeTruthy();
    // The demo's words, in the two places it uses them: the columns print the vocabulary key
    // (backlog/progress/review/done, beside the dot) and the statistics print the phrase.
    for (const key of ['backlog', 'progress', 'review', 'done']) {
      expect(screen.getAllByText(key).length).toBeGreaterThan(0);
    }
    for (const phrase of ['In progress', 'In review', 'Completed']) {
      expect(screen.getAllByText(phrase).length).toBeGreaterThan(0);
    }
  });

  it('moves focus to the new screen’s title, the way the demo does', async () => {
    // The demo's `head()` renders <h1 id="page-title" tabindex="-1"> and focuses it when the screen
    // changes, so a screen-reader user hears where they have arrived. Losing it is invisible until
    // someone navigates by keyboard, which is exactly when it matters.
    location.hash = '#team';
    render(<App />);
    await screen.findByText('Aria');
    location.hash = '#tasks';
    dispatchEvent(new HashChangeEvent('hashchange'));
    await screen.findByRole('heading', { name: 'Work, moving forward.' });
    await waitFor(() => expect(document.activeElement?.id).toBe('page-title'));
  });

  it('shows a decision with its rule, its change and an approve button', async () => {
    location.hash = '#inbox';
    render(<App />);
    expect(await screen.findByText('Analytics read access')).toBeTruthy();
    expect(screen.getByText(/access\.analytics\.read/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Approve/ })).toBeTruthy();
  });
});

describe('the four data states', () => {
  it('each state renders its own shape', () => {
    render(<DataState state="loading" lang="en" />);
    expect(screen.getByRole('status')).toBeTruthy();
    cleanup();
    render(<DataState state="empty" lang="en" />);
    expect(screen.getByText(/Nothing here yet/)).toBeTruthy();
    cleanup();
    render(<DataState state="error" lang="en" onRetry={() => {}} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Retry/ })).toBeTruthy();
    cleanup();
    render(<DataState state="restricted" lang="ar" />);
    expect(screen.getByText(/ليست لديك صلاحية/)).toBeTruthy();
  });

  it('the Arabic string table carries the same words as English (no hard-coded text)', () => {
    render(<DataState state="restricted" lang="ar" />);
    expect(screen.getByText(/ليست لديك صلاحية/)).toBeTruthy();
  });
});
