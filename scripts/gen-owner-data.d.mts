/**
 * Types for the generator, hand-written.
 *
 * The generator is plain `.mjs` (it has to run under bare `node` in the gate), so tests that import
 * it — the drift lock in `apps/web/test/owner-data.test.tsx` — need this file to exist.
 */
export const REPO: string;
export const DEMO: string;

/** The literal after `needle`, by matched delimiters, ignoring delimiters inside strings. */
export function literalAfter(source: string, needle: string, open: string, close: string): string;
/** A JS object/array literal written with unquoted keys or single quotes, as JSON. */
export function asJson(literal: string): unknown;

/** The 31 pixel icons from the owner's demo, as `{ name: path }`. */
export function demoIcons(source?: string): Record<string, string>;
/** The owner's plan: rooms, desks, props, the sprite catalogue and their nav. */
export function demoLayout(source?: string): {
  rooms: Array<Record<string, unknown>>;
  desks: Array<Record<string, unknown>>;
  props: Array<Record<string, unknown>>;
  sprites: Array<Record<string, unknown>>;
  nav: Array<[string, string, string]>;
};
