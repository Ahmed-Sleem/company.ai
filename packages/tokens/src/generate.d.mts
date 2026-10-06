/** Types for the token generator (plain ESM JavaScript, so the build has no toolchain deps). */
export interface PalettePreset {
  chip: string;
  byline?: string;
  dark?: Record<string, string>;
  light?: Record<string, string>;
}

export interface PaletteDoc {
  keys: string[];
  presets: Record<string, PalettePreset>;
  notBorrowed?: Record<string, string>;
  source?: Record<string, string>;
}

export interface Palettes {
  doc: PaletteDoc;
  ids: string[];
}

export interface BuildContext {
  css: string;
  json: Record<string, any>;
  dark: Map<string, string>;
  light: Map<string, string>;
  darkBody: string;
  lightBody: string;
  mismatches: string[];
  palettes: Palettes;
}

export const PKG: string;
export const REPO: string;
export const SRC_CSS: string;
export const SRC_JSON: string;
export const SRC_PALETTES: string;
export const GENERATED: string;
export const FONT_FILE: string;

export function buildContext(paths?: { cssPath?: string; jsonPath?: string; palettesPath?: string }): BuildContext;
export function loadPalettes(path?: string): Palettes;
export function generateCss(ctx: BuildContext): string;
export function generateTheme(): string;
export function generateTs(ctx: BuildContext): string;
export function buildAll(paths?: { cssPath?: string; jsonPath?: string; palettesPath?: string }): {
  ctx: BuildContext;
  files: Record<string, string>;
};
