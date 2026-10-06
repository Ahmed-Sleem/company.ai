/**
 * The palette control, borrowed from the owner's demo.
 *
 * Three things matter here and each is a different kind of bug: the five presets exist and are
 * named in the language being read; exactly one is pressed and a screen reader hears it; and
 * choosing one really changes the document — the attribute the token file keys off — and is
 * remembered. A control that renders beautifully and changes nothing is the failure this guards.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SettingsView } from '../src/views/SettingsView';
import { applyPalette, readPalette } from '../src/lib/theme';
import { palettes } from '@company/tokens';

const models = {
  models: [
    {
      id: '55555555-5555-4555-8555-555555555555', displayName: 'GPT-5.2', lane: 'strong',
      inputCentsPerMTok: 250, outputCentsPerMTok: 1000, lifecycle: 'ga',
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const body = url.includes('/api/models') ? models : { company: { id: 'x', name: 'Acme Studio' } };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  }));
  localStorage.clear();
  delete document.documentElement.dataset.palette;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Settings → Appearance', () => {
  it('offers every preset the token source declares, by name, in English', async () => {
    render(<SettingsView lang="en" />);
    const group = await screen.findByRole('group', { name: 'Color palette' });
    expect(within(group).getAllByRole('button')).toHaveLength(palettes.length);
    expect(palettes.length).toBe(5);
    expect(screen.getByRole('button', { name: 'Original sage' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ocean blue' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Soft violet' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Warm amber' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Dusty rose' })).toBeTruthy();
  });

  it('names them in Arabic when the product is being read in Arabic', async () => {
    render(<SettingsView lang="ar" />);
    const group = await screen.findByRole('group', { name: 'لوحة الألوان' });
    expect(within(group).getByRole('button', { name: 'الأزرق المحيطي' })).toBeTruthy();
  });

  it('starts on the design source’s own palette, and says so to a screen reader', async () => {
    render(<SettingsView lang="en" />);
    const sage = await screen.findByRole('button', { name: 'Original sage' });
    expect(sage.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Ocean blue' }).getAttribute('aria-pressed')).toBe('false');
    // The design source's colours are what "no attribute" means, so nothing is written on start.
    expect(document.documentElement.dataset.palette).toBeUndefined();
  });

  it('choosing a palette changes the document and remembers the choice', async () => {
    render(<SettingsView lang="en" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Soft violet' }));
    expect(document.documentElement.dataset.palette).toBe('violet');
    expect(localStorage.getItem('company-os.palette')).toBe('violet');
    expect(screen.getByRole('button', { name: 'Soft violet' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Original sage' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('going back to the first palette clears the attribute instead of pinning it', async () => {
    render(<SettingsView lang="en" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Warm amber' }));
    fireEvent.click(screen.getByRole('button', { name: 'Original sage' }));
    expect(document.documentElement.dataset.palette).toBeUndefined();
    expect(localStorage.getItem('company-os.palette')).toBe('sage');
  });

  it('every preset draws its own swatch, and the swatch is the token colour', async () => {
    render(<SettingsView lang="en" />);
    const option = await screen.findByRole('button', { name: 'Ocean blue' });
    const chip = option.querySelector('.palette-chip') as HTMLElement;
    const expected = palettes.find((preset) => preset.id === 'ocean')!.chip;
    expect(chip.style.getPropertyValue('--chip')).toBe(expected);
  });
});

describe('the palette control and the data states', () => {
  it('stays reachable while the company and model list are unreachable', async () => {
    // Appearance is a local preference: it must not disappear behind a failed fetch, which is
    // the one moment someone reaching for a different colour is most likely to be looking.
    render(<SettingsView lang="en" forcedState="error" />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    // scoped to the group: the error state carries its own Retry button, so counting buttons
    // across the whole panel would count that one too
    const group = await screen.findByRole('group', { name: 'Color palette' });
    expect(within(group).getAllByRole('button')).toHaveLength(palettes.length);
  });
});

describe('the palette preference itself', () => {
  it('falls back to the default palette when nothing is stored, or when the stored value is junk', () => {
    expect(readPalette()).toBe('sage');
    localStorage.setItem('company-os.palette', 'chartreuse');
    expect(readPalette()).toBe('sage');
    localStorage.setItem('company-os.palette', 'ocean');
    expect(readPalette()).toBe('ocean');
  });

  it('survives storage being unavailable (private mode)', () => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('quota'); };
    try {
      expect(applyPalette('rose')).toBe('rose');
      expect(document.documentElement.dataset.palette).toBe('rose');
    } finally {
      Storage.prototype.setItem = setItem;
    }
  });
});
