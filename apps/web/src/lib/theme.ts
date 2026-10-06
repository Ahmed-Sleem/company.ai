/**
 * Theme + palette, the same two preferences the demos expose, stored the same way.
 *
 * The palette is applied as one attribute — `data-palette` on the root element — and the colours
 * themselves come from `packages/tokens/generated/tokens.css`, which declares a block per preset
 * per theme. Nothing here knows a colour, which is the point: law 1 says values live in tokens.
 */
import { defaultPalette, palettes, type PaletteId } from '@company/tokens';
import { safeGet, safeSet } from './prefs';

export type Theme = 'dark' | 'light' | 'system';

/** A palette choice is one of the design's presets, or the person's own accent. */
export type PaletteChoice = PaletteId | 'custom';

const KEY = 'company-os.theme';
const PALETTE_KEY = 'company-os.palette';
const ACCENT_KEY = 'company-os.accent';
/**
 * The colour the picker starts from: the default palette's own chip.
 *
 * Taken from the tokens rather than written out, so the two can never disagree — the raw-value check
 * has no exception for a second copy of a brand colour.
 */
export const DEFAULT_CUSTOM_ACCENT =
  palettes.find((palette) => palette.id === defaultPalette)?.chip ?? palettes[0].chip;

export { palettes, type PaletteId };

export function readTheme(): Theme {
  const stored = safeGet(KEY);
  return stored === 'light' || stored === 'system' ? stored : 'dark';
}

export function applyTheme(theme: Theme) {
  const resolved =
    theme === 'system'
      ? (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  safeSet(KEY, theme);
  return resolved;
}

export function nextTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
}

/** The palette someone chose, or the design source's own colours. */
export function readPalette(): PaletteChoice {
  const stored = safeGet(PALETTE_KEY);
  if (stored === 'custom') return 'custom';
  return palettes.some((preset) => preset.id === stored) ? (stored as PaletteId) : defaultPalette;
}

/** The colour someone typed into the custom accent, if any. */
export function readCustomAccent(): string {
  const stored = safeGet(ACCENT_KEY);
  return stored && /^#[0-9a-f]{6}$/i.test(stored) ? stored.toLowerCase() : DEFAULT_CUSTOM_ACCENT;
}

export function saveCustomAccent(hex: string) {
  safeSet(ACCENT_KEY, hex);
  return hex;
}

/** The theme currently painted, as a concrete value (never 'system'). */
export function resolvedTheme(): 'dark' | 'light' {
  const attribute = document.documentElement.dataset.theme;
  return attribute === 'light' ? 'light' : 'dark';
}

/**
 * Apply a palette. The default one clears the attribute rather than setting it to itself, so a
 * screen that has never been themed carries no attribute at all — the design source's colours
 * are what you get by saying nothing, and that is the state the parity screenshots are taken in.
 *
 * `custom` is not a preset in the token source: it has no block of its own, so the theme's own
 * colours keep everything else while the three accent tokens are derived and written inline by
 * `lib/accent.ts`.
 */
export function applyPalette(palette: PaletteChoice) {
  const root = document.documentElement;
  if (palette === defaultPalette) delete root.dataset.palette;
  else root.dataset.palette = palette;
  safeSet(PALETTE_KEY, palette);
  return palette;
}

/**
 * The name a person reads, from the string table. Spelled out rather than assembled from the id,
 * so adding a preset to the token source without naming it in both languages is a compile error.
 */
const PALETTE_NAME_KEYS = {
  sage: 'paletteSage',
  ocean: 'paletteOcean',
  violet: 'paletteViolet',
  amber: 'paletteAmber',
  rose: 'paletteRose',
} as const;

export function paletteNameKey(id: PaletteId) {
  return PALETTE_NAME_KEYS[id];
}
