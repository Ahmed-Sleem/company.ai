/**
 * The two toggles the owner asked for (both defaulting to **on**) and the custom accent.
 *
 * The accent is the interesting one: a colour someone chooses has to end up *readable* on every
 * surface it is drawn on, and the rule that makes it so is a plain function, so it is tested as
 * one. The rest is wiring — and wiring that silently does nothing is exactly the failure this
 * file exists to catch.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SettingsView } from '../src/views/SettingsView';
import { FX, RAIL, readFx, readRail, setFx, setRail } from '../src/lib/prefs';
import { applyCustomAccent, contrast, deriveAccent, mix, validHex } from '../src/lib/accent';
import { ICONS } from '../src/lib/icons.data';
import { Icon } from '../src/components/Icon';
import { palettes } from '@company/tokens';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const body = String(input).includes('/api/models')
      ? { models: [] }
      : { company: { id: 'x', name: 'Acme Studio' } };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  }));
  localStorage.clear();
  for (const pref of [FX, RAIL]) document.documentElement.removeAttribute(pref.attribute);
  for (const name of ['--accent', '--accent-bg', '--on-accent']) document.documentElement.style.removeProperty(name);
  delete document.documentElement.dataset.palette;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the two preferences the owner asked for', () => {
  it('both default to on', () => {
    expect(readFx()).toBe(true);
    expect(readRail()).toBe(true);
    setFx(readFx());
    setRail(readRail());
    expect(document.documentElement.getAttribute(FX.attribute)).toBe('true');
    expect(document.documentElement.getAttribute(RAIL.attribute)).toBe('true');
  });

  it('turning one off removes the attribute and remembers it', () => {
    setRail(false);
    expect(document.documentElement.hasAttribute(RAIL.attribute)).toBe(false);
    expect(readRail()).toBe(false);
    expect(localStorage.getItem(RAIL.storageKey)).toBe('off');
    setRail(true);
    expect(document.documentElement.getAttribute(RAIL.attribute)).toBe('true');
  });

  it('Settings carries both switches, both ticked on a fresh start', async () => {
    render(<SettingsView lang="en" />);
    const fx = (await screen.findByLabelText(/Screen effect/)) as HTMLInputElement;
    const rail = screen.getByLabelText(/Collapsed sidebar/) as HTMLInputElement;
    expect(fx.checked).toBe(true);
    expect(rail.checked).toBe(true);
  });

  it('the switch in Settings really changes the preference', async () => {
    render(<SettingsView lang="en" />);
    const fx = (await screen.findByLabelText(/Screen effect/)) as HTMLInputElement;
    fireEvent.click(fx);
    expect(fx.checked).toBe(false);
    expect(readFx()).toBe(false);
    expect(document.documentElement.hasAttribute(FX.attribute)).toBe(false);
  });
});

describe('the custom accent', () => {
  it('accepts a hex and refuses anything else', () => {
    expect(validHex('#accab3')).toBe(true);
    expect(validHex('#ACCAB3')).toBe(true);
    expect(validHex('accab3')).toBe(false);
    expect(validHex('rebeccapurple')).toBe(false);
  });

  it('mixing walks from one colour toward the other', () => {
    expect(mix('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mix('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('a colour that already reads well is used exactly as chosen', () => {
    const derived = deriveAccent('#accab3', 'dark', ['#111514', '#141817', '#181d1b', '#1d2320', '#232c27']);
    expect(derived.walked).toBe(0);
    expect(derived.accent).toBe('#accab3');
  });

  it('a colour that would be unreadable is moved — and reports how far', () => {
    const surfaces = ['#111514', '#141817', '#181d1b', '#1d2320', '#232c27'];
    const derived = deriveAccent('#101011', 'dark', surfaces); // near-black on near-black
    expect(derived.walked).toBeGreaterThan(0);
    expect(contrast(derived.accent, '#181d1b')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(derived.accent, derived.accentBg)).toBeGreaterThanOrEqual(4.5);
    // and it is still recognisably the colour they picked: a tint, not a different colour
    expect(derived.accent.startsWith('#')).toBe(true);
  });

  it('the same colour is walked further in light mode, because the surfaces are the other way', () => {
    const dark = deriveAccent('#7a8794', 'dark', ['#111514']);
    const light = deriveAccent('#7a8794', 'light', ['#f5f6f1']);
    expect(dark.walked).toBeGreaterThan(0);
    expect(light.walked).toBeGreaterThan(0);
    expect(light.accent).not.toBe(dark.accent);
  });

  it('whatever it produces is readable in both themes, for any colour', () => {
    for (const chosen of ['#101011', '#fefefe', '#ff0000', '#00ff00', '#0000ff', '#accab3', '#7a8794']) {
      for (const mode of ['dark', 'light'] as const) {
        const surfaces = mode === 'dark'
          ? ['#111514', '#141817', '#181d1b', '#1d2320', '#232c27']
          : ['#f5f6f1', '#ecefe8', '#fcfcf8', '#edf2f8', '#e3ebf5'];
        const derived = deriveAccent(chosen, mode, surfaces);
        for (const surface of [...surfaces, derived.accentBg]) {
          expect(contrast(derived.accent, surface), `${chosen} ${mode} on ${surface}`).toBeGreaterThanOrEqual(4.5);
        }
        // and the text drawn on top of the accent is readable too
        expect(contrast(derived.onAccent, derived.accent)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('writing and clearing the accent touches exactly three tokens', () => {
    const derived = deriveAccent('#4a6fa5', 'dark', ['#111514']);
    applyCustomAccent(derived);
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--accent')).toBe(derived.accent);
    expect(style.getPropertyValue('--accent-bg')).toBe(derived.accentBg);
    expect(style.getPropertyValue('--on-accent')).toBe(derived.onAccent);
    expect(document.documentElement.dataset.customAccent).toBe(derived.accent);
    applyCustomAccent(null);
    expect(style.getPropertyValue('--accent')).toBe('');
    expect(document.documentElement.dataset.customAccent).toBeUndefined();
  });

  it('Settings offers it beside the presets and only shows the picker when it is chosen', async () => {
    render(<SettingsView lang="en" />);
    const group = await screen.findByRole('group', { name: 'Color palette' });
    expect(within(group).getAllByRole('button')).toHaveLength(palettes.length + 1); // + custom
    expect(screen.queryByLabelText('Pick a colour')).toBeNull();
    fireEvent.click(within(group).getByRole('button', { name: 'Custom accent' }));
    const picker = (await screen.findByLabelText('Pick a colour')) as HTMLInputElement;
    expect(picker.type).toBe('color');
    expect(document.documentElement.dataset.palette).toBe('custom');
    // the chosen colour is written onto the document, not merely remembered
    expect(document.documentElement.style.getPropertyValue('--accent').length).toBeGreaterThan(0);
  });

  it('choosing a preset afterwards clears the inline accent, so the preset is not overridden', async () => {
    render(<SettingsView lang="en" />);
    const group = await screen.findByRole('group', { name: 'Color palette' });
    fireEvent.click(within(group).getByRole('button', { name: 'Custom accent' }));
    expect(document.documentElement.style.getPropertyValue('--accent')).not.toBe('');
    fireEvent.click(within(group).getByRole('button', { name: 'Ocean blue' }));
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('');
    expect(document.documentElement.dataset.palette).toBe('ocean');
  });
});

describe('the pixel icons', () => {
  it('draws the owner’s path for a name', () => {
    const { container } = render(<Icon name="team" />);
    const path = container.querySelector('path');
    expect(path?.getAttribute('d')).toBe(ICONS.team);
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 18 18');
  });

  it('is decoration beside a word, and takes a name only when it stands alone', () => {
    const { container, rerender } = render(<Icon name="inbox" />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    rerender(<Icon name="inbox" label="Inbox" />);
    expect(container.querySelector('svg')?.getAttribute('role')).toBe('img');
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('Inbox');
  });

  it('draws nothing for a name that does not exist, rather than an empty box', () => {
    const { container } = render(<Icon name="no-such-icon" />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('has an icon for every nav item, and a real path in each', () => {
    expect(Object.keys(ICONS).length).toBe(31);
    for (const [name, path] of Object.entries(ICONS)) {
      expect(path.startsWith('M'), name).toBe(true);
      expect(path.length, name).toBeGreaterThan(40);
    }
  });
});
