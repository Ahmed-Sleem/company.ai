/** Types for the token generator (plain ESM JavaScript, so the build has no toolchain deps). */
import type { PGlite } from '@electric-sql/pglite';

export interface BuildContext {
  css: string;
  json: Record<string, unknown>;
  dark: Map<string, string>;
  light: Map<string, string>;
  darkBody: string;
  lightBody: string;
  mismatches: string[];
}

export const PKG: string;
export const REPO: string;
export const SRC_CSS: string;
export const SRC_JSON: string;
export const GENERATED: string;
export const FONT_FILE: string;

export function buildContext(paths?: { cssPath?: string; jsonPath?: string }): BuildContext;
export function generateCss(ctx: BuildContext): string;
export function generateTheme(): string;
export function generateTs(ctx: BuildContext): string;
export function buildAll(paths?: { cssPath?: string; jsonPath?: string }): {
  ctx: BuildContext;
  files: Record<string, string>;
};
