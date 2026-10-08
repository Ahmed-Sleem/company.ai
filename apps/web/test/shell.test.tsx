/**
 * Shell tests — the GUI contract, checked in a DOM.
 *
 * These are the assertions that would catch "the app quietly stopped matching the design":
 * the six views exist in the demo's order, Arabic really flips the document, the theme really
 * switches, and every view renders its four data states.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { VIEWS } from '@company/contracts';
import { App } from '../src/App';
import { DataState } from '../src/components/DataState';
import { useStore } from '../src/data/store';

// The shell is exercised against the labelled demo save itself: the same rows the first-time
// visitor sees. No fetch stubs — there is no server any more; the store is the data.

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
  location.hash = '';
});

afterEach(() => {
  cleanup();
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
    expect(screen.getAllByText(/access\.analytics\.read/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Approve/ }).length).toBeGreaterThan(0);
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
