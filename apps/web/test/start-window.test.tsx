/**
 * Round fifteen (owner): ONE Start button opens ONE window — the created companies (open or
 * delete, asking twice), the demo showroom (open, never deletable), create-new and
 * load-from-file behind the same save gate Settings uses. And the diary tab, opened in its
 * own tab, must NEVER meet the landing door — the bug the owner reported.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LandingView } from '../src/views/LandingView';
import { deleteStudio, importStudio, listStudios } from '../src/lib/studios';
import { useStore } from '../src/data/store';
import { App } from '../src/App';

const SAVE_KEY = 'company.ai.save.v1';

beforeEach(() => {
  localStorage.clear();
  useStore.setState({ introDone: false, doorPassed: false, demoMode: false });
});

describe('the studios shelf (round fifteen)', () => {
  it('deletes a created company and says the active one needs a reboot', () => {
    localStorage.setItem(SAVE_KEY, '{"state":{}}');
    localStorage.setItem('company.ai.studio.studio-1', 'old-active');
    localStorage.setItem('company.ai.studios.v1', JSON.stringify({
      active: 'studio-1',
      list: [
        { id: 'studio-1', name: 'Active Co', at: '2026-10-01' },
        { id: 'studio-2', name: 'Old Co', at: '2026-09-01' },
      ],
    }));
    localStorage.setItem('company.ai.studio.studio-2', 'old-archive');

    expect(deleteStudio('studio-2').reload).toBe(false);
    expect(listStudios().map((s) => s.name)).toEqual(['Active Co']);
    expect(localStorage.getItem('company.ai.studio.studio-2')).toBeNull();

    expect(deleteStudio('studio-1').reload).toBe(true);
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
    expect(listStudios()).toEqual([]);
  });

  it('refuses a file that is not a company.ai save', () => {
    expect(importStudio('not json', () => {}).ok).toBe(false);
    expect(importStudio(JSON.stringify({ hello: 1 }), () => {}).ok).toBe(false);
    expect(importStudio(JSON.stringify({ company: { name: 'x' }, agents: 'nope' }), () => {}).ok).toBe(false);
  });

  it('loads a save file as a fresh company and archives what was live', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ state: { company: { name: 'Before' } }, version: 1 }));
    localStorage.setItem('company.ai.studios.v1', JSON.stringify({
      active: 'studio-1', list: [{ id: 'studio-1', name: 'Before', at: '2026-10-01' }],
    }));
    const payload = JSON.stringify({ product: 'company.ai', version: 1, company: { name: 'Imported Co' }, agents: [] });
    const result = importStudio(payload, (data) => {
      // the store's persist middleware would write the envelope; mimic it here
      localStorage.setItem(SAVE_KEY, JSON.stringify({ state: data, version: 1 }));
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.name).toBe('Imported Co');
    // the imported company took a fresh id, its slot holds the envelope, and the old one archived
    expect(localStorage.getItem('company.ai.studio.studio-2')).toContain('Imported Co');
    expect(localStorage.getItem('company.ai.studio.studio-1')).toContain('Before');
  });
});

describe('the one Start button and its window (round fifteen)', () => {
  const props = (over: Partial<Parameters<typeof LandingView>[0]> = {}) => ({
    lang: 'en' as const,
    resumable: false,
    studio: null,
    studios: [{ id: 'studio-1', name: 'Acme Test', at: '2026-10-01T00:00:00Z' }],
    onStart: () => {},
    onDemo: () => {},
    onDemoView: () => {},
    onOpenStudio: () => {},
    onNewStudio: () => {},
    onDeleteStudio: () => {},
    onImport: async () => ({ ok: false as const }),
    onLanguage: () => {},
    ...over,
  });

  it('shows one Start button, and the window holds companies, demo, new and load', () => {
    const { container } = render(<LandingView {...props()} />);
    const starts = container.querySelectorAll('.landing-actions [data-landing=start]');
    expect(starts.length).toBe(1);
    expect(container.querySelector('.landing-actions [data-landing=demo]')).toBeNull();

    fireEvent.click(container.querySelector('.landing-actions [data-landing=start]')!);
    expect(container.querySelector('[data-landing=companies-window]')).toBeTruthy();
    expect(container.textContent).toContain('Acme Test');
    expect(container.querySelector('[data-landing=new-company]')).toBeTruthy();
    expect(container.querySelector('[data-landing=load-file]')).toBeTruthy();
    // the demo row opens the demo and carries NO delete control
    const demoRow = container.querySelector('.demo-row')!;
    expect(demoRow.querySelector('[data-landing=demo]')).toBeTruthy();
    expect(demoRow.querySelector('[data-landing=delete]')).toBeNull();
  });

  it('deletes a created company only after asking twice', () => {
    let deleted: string | null = null;
    const { container } = render(<LandingView {...props({ onDeleteStudio: (id) => { deleted = id; } })} />);
    fireEvent.click(container.querySelector('.landing-actions [data-landing=start]')!);
    const del = () => container.querySelector('[data-landing=delete]')!;
    fireEvent.click(del()); // first click: it asks
    expect(deleted).toBeNull();
    expect(del().textContent).toContain('Delete for good?');
    fireEvent.click(del()); // second click: it deletes
    expect(deleted).toBe('studio-1');
  });

  it('says so in owner words when the loaded file is not a save', async () => {
    const { container } = render(<LandingView {...props()} />);
    fireEvent.click(container.querySelector('.landing-actions [data-landing=start]')!);
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    const file = new File(['{"nope":true}'], 'not-a-save.json', { type: 'application/json' });
    fireEvent.change(input, { target: { files: [file] } });
    await screen.findByText(/not a company\.ai save/);
    expect(container.querySelector('[data-landing=import-error]')).toBeTruthy();
  });
});

describe('the diary tab never meets the landing (round fifteen owner bug)', () => {
  it('renders the diary straight away with the door unpassed', () => {
    location.hash = '#history/p-1';
    useStore.setState({ introDone: false, doorPassed: false });
    const { container } = render(<App />);
    expect(container.querySelector('[data-history-tab]')).toBeTruthy();
    expect(container.querySelector('[data-history-view]')).toBeTruthy();
    expect(container.querySelector('.landing')).toBeNull();
    expect(container.querySelector('[data-landing=start]')).toBeNull();
    location.hash = '';
  });
});
