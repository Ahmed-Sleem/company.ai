/**
 * Theme + palette, the same two preferences the demos expose, stored the same way.
 *
 * The palette is applied as one attribute — `data-palette` on the root element — and the colours
 * themselves come from `packages/tokens/generated/tokens.css`, which declares a block per preset
 * per theme. Nothing here knows a colour, which is the point: law 1 says values live in tokens.
 */
import { defaultPalette, palettes, type PaletteId } from '@company/tokens';

export type Theme = 'dark' | 'light' | 'system';

const KEY = 'company-os.theme';
const PALETTE_KEY = 'company-os.palette';

export { palettes, type PaletteId };

export function readTheme(): Theme {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
  return stored === 'light' || stored === 'system' ? stored : 'dark';
}

export function applyTheme(theme: Theme) {
  const resolved =
    theme === 'system'
      ? (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode: the preference simply does not persist */
  }
  return resolved;
}

export function nextTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
}

/** The palette someone chose, or the design source's own colours. */
export function readPalette(): PaletteId {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(PALETTE_KEY) : null;
  return palettes.some((preset) => preset.id === stored) ? (stored as PaletteId) : defaultPalette;
}

/**
 * Apply a palette. The default one clears the attribute rather than setting it to itself, so a
 * screen that has never been themed carries no attribute at all — the design source's colours
 * are what you get by saying nothing, and that is the state the parity screenshots are taken in.
 */
export function applyPalette(palette: PaletteId) {
  const root = document.documentElement;
  if (palette === defaultPalette) delete root.dataset.palette;
  else root.dataset.palette = palette;
  try {
    localStorage.setItem(PALETTE_KEY, palette);
  } catch {
    /* private mode: the preference simply does not persist */
  }
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
