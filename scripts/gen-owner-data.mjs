#!/usr/bin/env node
/**
 * Generate everything we borrow *as data* from the owner's demo.
 *
 *   node scripts/gen-owner-data.mjs           # write the two generated files
 *   node scripts/gen-owner-data.mjs --check   # verify only, exit 1 on drift (the gate uses this)
 *
 * Two outputs, both read-only mirrors of the demo file:
 *
 *   apps/web/src/lib/icons.data.ts     the 31 pixel icons (`PIXEL_ICONS`)
 *   apps/web/src/world/layout.data.ts  the studio plan — rooms, desks, props (`DEF` + `SPR`)
 *
 * The demo is never written to. The readers below count braces and brackets *outside strings*,
 * because a brace inside a template literal is what silently truncated an earlier analysis of
 * this very file (see THINGS_DONE, "brace-counting").
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DEMO = join(REPO, 'design/owner-demo/acme-studio-os.html');

const read = () => readFileSync(DEMO, 'utf8');

/** The literal after `needle`, by matched delimiters, ignoring delimiters inside strings. */
export function literalAfter(source, needle, open, close) {
  const at = source.indexOf(needle);
  if (at === -1) throw new Error(`owner demo: ${needle} not found — the borrow source changed`);
  const start = source.indexOf(open, at);
  let depth = 0;
  let quote = null;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === '\\') { i++; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === open) depth++;
    else if (ch === close && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`owner demo: ${needle} is unterminated`);
}

/** A JS object/array literal written with unquoted keys or single quotes, as JSON. */
export function asJson(literal) {
  return JSON.parse(
    literal
      .replace(/([{,[]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
      .replace(/'([^']*)'/g, '"$1"'),
  );
}

export function demoIcons(source = read()) {
  return asJson(literalAfter(source, 'const PIXEL_ICONS=', '{', '}'));
}

export function demoLayout(source = read()) {
  return {
    ...asJson(literalAfter(source, 'DEF=', '{', '}')),
    sprites: asJson(literalAfter(source, 'const SPR=', '[', ']')),
    nav: asJson(literalAfter(source, 'const NAV=', '[', ']')),
  };
}

const HEADER = (what) => `/**
 * ${what}
 *
 * GENERATED from design/owner-demo/acme-studio-os.html — do not edit by hand.
 * Rebuild: node scripts/gen-owner-data.mjs        Verify in sync: node scripts/gen-owner-data.mjs --check
 */`;

function iconsFile(icons) {
  const names = Object.keys(icons);
  return `${HEADER(`The pixel icons — ${names.length} of them, borrowed from the owner's demo.`)}
export const ICON_VIEWBOX = 18;

export const ICONS: Record<string, string> = {
${names.map((name) => `  ${JSON.stringify(name)}: ${JSON.stringify(icons[name])},`).join('\n')}
} as const;

export type IconName = keyof typeof ICONS;
`;
}

function layoutFile({ rooms, desks, props, sprites, nav }) {
  const j = (value) => JSON.stringify(value, null, 2).replace(/"/g, "'");
  return `${HEADER('The studio plan, the desk positions and the sprite catalogue.')}

/** The plan is drawn at this size, and layout snaps to SNAP while building. */
export const WORLD = { w: 1920, h: 1200, snap: 16, grain: 2 } as const;

/** The nine room themes the owner's demo can paint a room with. */
export const ROOM_THEMES = [
  'executive-suite', 'engineering-lab', 'boardroom-hub', 'design-studio',
  'operations-hub', 'lounge-area',
] as const;
export type RoomTheme = (typeof ROOM_THEMES)[number];

export interface Room {
  id: string; key: string; name: string; sub: string;
  theme: RoomTheme; x: number; y: number; w: number; h: number;
}
export interface Desk {
  id: string; dept: string; deskType: string;
  x: number; y: number; w: number; h: number;
  /** Added by build mode: absent means "as the owner drew it". */
  agentId?: string | null;
}
export interface Prop {
  id: string; type: string; x: number; y: number; w: number; h: number; label: string;
}
export interface Sprite { id: string; l: string; c: 'Decor' | 'Electronics' | 'Furniture' | 'Props'; w: number; h: number }

/** The plan as the owner drew it. */
export const ROOMS: readonly Room[] = ${j(rooms)} as const;

/** Where people sit. The owner's own positions and sizes. */
export const DESKS: readonly Desk[] = ${j(desks)} as const;

/** The twenty-one pieces of furniture the owner placed. */
export const PROPS: readonly Prop[] = ${j(props)} as const;

/** The sprite catalogue: what each piece of art is called, and how big it draws. */
export const SPRITES: readonly Sprite[] = ${j(sprites)} as const;

/** The owner's nav, kept for the record: \`world\` is first there and last here (see contracts/views). */
export const OWNER_NAV: ReadonlyArray<readonly [string, string, string]> = ${j(nav)} as const;

const SPRITE_BY_ID = new Map(SPRITES.map((sprite) => [sprite.id, sprite]));
export const sprite = (id: string): Sprite | undefined => SPRITE_BY_ID.get(id);

/** The plan the app starts from — a copy, so build mode can move things without touching the data. */
export function defaultPlan() {
  return {
    rooms: ROOMS.map((room) => ({ ...room })),
    desks: DESKS.map((desk) => ({ ...desk })),
    props: PROPS.map((prop) => ({ ...prop })),
  };
}
export type Plan = ReturnType<typeof defaultPlan>;
`;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const check = process.argv.includes('--check');
  const source = read();
  const files = {
    'apps/web/src/lib/icons.data.ts': iconsFile(demoIcons(source)),
    'apps/web/src/world/layout.data.ts': layoutFile(demoLayout(source)),
  };
  let drifted = 0;
  for (const [path, content] of Object.entries(files)) {
    const full = join(REPO, path);
    let current = null;
    try { current = readFileSync(full, 'utf8'); } catch { /* not written yet */ }
    if (current === content) {
      if (!check) console.log(`  ok    ${path} (unchanged)`);
      continue;
    }
    if (check) {
      console.error(`  DRIFT ${path} differs from the owner's demo — run: node scripts/gen-owner-data.mjs`);
      drifted++;
    } else {
      writeFileSync(full, content);
      console.log(`  write ${path} (${content.length.toLocaleString()} chars)`);
    }
  }
  if (check) {
    if (drifted) process.exit(1);
    console.log('owner data: icons and layout are in sync with the demo');
  }
}
