#!/usr/bin/env node
/**
 * Token pipeline — `design/tokens/company-os-pixel.*` → `packages/tokens/generated/*`
 *
 * The designer's files are the only place a value is defined (Governance Contract law 1:
 * "No raw values"). This script translates them into the forms the real product needs:
 *
 *   generated/tokens.css    the CSS custom properties, the pixel-skin rules and the
 *                           @font-face for the vendored Pixelify Sans
 *   generated/tokens.ts     a typed mirror for TypeScript (canvas colours, contrast tests,
 *                           anything that cannot read CSS)
 *   generated/theme.css     Tailwind v4 `@theme` mapping, so utilities exist that resolve
 *                           to our variables instead of Tailwind's default palette
 *
 * Fidelity rules:
 *   - the `:root` (dark) and `:root[data-theme=light]` blocks are copied **verbatim** from
 *     `design/tokens/company-os-pixel.css`, so the app cannot drift from the designer;
 *   - every value in `company-os-pixel.json` is checked against the CSS, and the script
 *     fails loudly if the two committed sources disagree;
 *   - the two media queries the designer left as intent (`pointer:coarse`,
 *     `prefers-reduced-motion`) are implemented — that is the stated behaviour, and the
 *     prototype's T1 fix is what they mean in practice.
 *
 * Usage:  node packages/tokens/src/generate.mjs            # write
 *         node packages/tokens/src/generate.mjs --check    # verify only, exit 1 on drift
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const PKG = join(here, '..');
export const REPO = join(PKG, '..', '..');
export const SRC_CSS = join(REPO, 'design/tokens/company-os-pixel.css');
export const SRC_JSON = join(REPO, 'design/tokens/company-os-pixel.json');
export const GENERATED = join(PKG, 'generated');
export const FONT_FILE = join(PKG, 'assets/PixelifySans.woff2');

const read = (p) => readFileSync(p, 'utf8');

/* ── source parsing ─────────────────────────────────────────────────────────── */

/** Extract the declarations of a `selector{...}` block, keeping the author's text. */
function blockBody(css, selector) {
  const at = css.indexOf(`${selector}{`);
  if (at === -1) throw new Error(`token source: block ${selector} not found`);
  let depth = 0;
  const open = css.indexOf('{', at);
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error(`token source: block ${selector} is unterminated`);
}

/** name → value map of a declaration block (last declaration wins, as CSS does). */
function vars(body) {
  const out = new Map();
  for (const m of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) out.set(m[1], m[2].trim());
  return out;
}

const normColor = (v) => {
  const t = v.trim().toLowerCase().replace(/\s+/g, '');
  // expand #abc → #aabbcc so notation differences are not treated as disagreements
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(t);
  return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : t;
};

export function buildContext(paths = {}) {
  const cssPath = paths.cssPath ?? SRC_CSS;
  const jsonPath = paths.jsonPath ?? SRC_JSON;
  const css = read(cssPath);
  const json = JSON.parse(read(jsonPath));

  const darkBody = blockBody(css, ':root');
  const lightBody = blockBody(css, ':root[data-theme=light]');
  const dark = vars(darkBody);
  const light = vars(lightBody);

  // JSON ↔ CSS agreement: the two committed sources must state the same values.
  const mismatches = [];
  const jsonToCssName = (k) =>
    k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/^accent-bg$/, 'accent-bg');
  for (const [theme, map] of Object.entries(json.tokens ?? {})) {
    for (const [key, value] of Object.entries(map)) {
      if (key === 'colorScheme') continue;
      const name = `--${jsonToCssName(key)}`;
      const fromCss = (theme === 'dark' ? dark : light).get(name);
      if (!fromCss) {
        mismatches.push(`${theme}.${key}: missing from company-os-pixel.css (${name})`);
      } else if (theme !== 'dark' || key !== 'shadow' ? normColor(fromCss) !== normColor(String(value)) : false) {
        mismatches.push(`${theme}.${key}: CSS says ${fromCss}, JSON says ${value}`);
      }
    }
  }
  // shadow strings differ between themes on purpose; compare them too, but whitespace-insensitively
  for (const theme of ['dark', 'light']) {
    const map = json.tokens[theme];
    const fromCss = (theme === 'dark' ? dark : light).get('--shadow');
    if (fromCss && map.shadow && normColor(fromCss) !== normColor(map.shadow)) {
      mismatches.push(`${theme}.shadow: CSS says "${fromCss}", JSON says "${map.shadow}"`);
    }
  }

  return { css, json, dark, light, darkBody, lightBody, mismatches };
}

/* ── generated outputs ──────────────────────────────────────────────────────── */

const HEADER = (what) => `/* ${what}
 * GENERATED FILE — do not edit. Source: design/tokens/company-os-pixel.css|json
 * Rebuild: npm run tokens:build      Verify in sync: npm run tokens:check
 */`;

/** The pixel-skin block: from the designer's "THE PIXEL SKIN" marker to the end of the file,
 *  minus the trailing palette/layout commentary (those are notes, not rules). */
function skinSection(css) {
  const marker = css.indexOf('THE PIXEL SKIN');
  if (marker === -1) throw new Error('token source: THE PIXEL SKIN section not found');
  const start = css.lastIndexOf('/* ====', marker);
  const cut = css.indexOf('/* ---- 4. Palette system');
  const end = cut === -1 ? css.length : cut;
  return css.slice(start, end).trim();
}

export function generateCss({ darkBody, lightBody, css }) {
  const darkVars = darkBody.trim();
  const lightVars = lightBody.trim();
  return `${HEADER('Company OS tokens — CSS.')}
@import './theme.css';

@font-face{
  font-family:'Pixelify Sans';
  font-style:normal;
  font-weight:400 700;
  font-display:swap;
  src:url('../assets/PixelifySans.woff2') format('woff2');
}

/* ---- 1. Base tokens: DARK (default) — verbatim from the design source --------------- */
:root{
${darkVars}
}

/* ---- 2. Theme override: LIGHT (themes only change values) --------------------------- */
:root[data-theme=light]{
${lightVars}
}

/* ---- 3. The pixel skin — verbatim from the design source ---------------------------- */
${skinSection(css)}

/* ---- 4. The two media queries the design source left as intent, implemented -------- */
@media(pointer:coarse){
  /* "48px touch targets on coarse pointers" — both axes, exactly as the prototype's T1 item. */
  :is(.btn,.navitem,.tabs button,.icon-btn,.searchbox input,.field input,.field select,
      .segmented button,.tree-person,.employee-name,.message-tools button,.textbtn,
      .theme-option,.palette-option,.workspace,.linklike){
    min-height:var(--touch);
  }
  :is(.btn,.navitem,.icon-btn,.segmented button,.textbtn,.tree-person,.employee-name,
      .message-tools button,.theme-option,.palette-option){min-width:var(--touch)}
}
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{
    transition-duration:0.001ms !important;
    animation-duration:0.001ms !important;
    animation-iteration-count:1 !important;
    scroll-behavior:auto !important;
  }
}
`;
}

export function generateTheme() {
  const color = (name) => `  --color-${name}: var(--${name});`;
  return `${HEADER('Tailwind v4 theme — utilities resolve to the design tokens.')}
@theme inline {
${['bg', 'side', 'surface', 'raised', 'hover', 'line', 'soft', 'text', 'muted', 'dim',
    'accent', 'accent-bg', 'on-accent', 'danger', 'warning', 'blue'].map(color).join('\n')}
  --font-pixel: var(--pixel);
  --font-ui: var(--font);
  --font-sans: var(--sans);
  --radius-none: 0px;
  --text-xs: var(--xs);
  --text-sm: var(--sm);
  --text-base: var(--base);
  --text-body: var(--body);
  --text-lg: var(--lg);
  --text-title: var(--title);
}
`;
}

export function generateTs({ dark, light, json }) {
  const obj = (map) =>
    '{\n' + [...map.entries()].map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n') + '\n  }';
  const colours = JSON.stringify(Object.keys(json.tokens.dark), null, 2);
  return `${HEADER('Typed mirror of the design tokens for TypeScript consumers.')}
export const cssVariableNames = ${colours.replace(/"colorScheme"/g, '"colorScheme"')} as const;

export const themeTokens = {
  dark: ${obj(dark)},
  light: ${obj(light)},
} as const;

export type ThemeName = 'dark' | 'light';

/** Tokens that are not colours (space, type, layout), read once and frozen. */
export const pixel = {
  typography: ${JSON.stringify(json.typography.sizes_px, null, 2)},
  fonts: {
    pixel: ${JSON.stringify(json.typography.pixel_family)},
    mono: ${JSON.stringify(json.typography.ui_mono)},
    sans: ${JSON.stringify(json.typography.body_sans)},
  },
  breakpointsPx: ${JSON.stringify(json.breakpoints ?? {}, null, 2)},
} as const;

export const pixelFontFile = 'assets/PixelifySans.woff2';
`;
}

export function buildAll(paths) {
  const ctx = buildContext(paths);
  return {
    ctx,
    files: {
      'tokens.css': generateCss(ctx),
      'theme.css': generateTheme(ctx),
      'tokens.ts': generateTs(ctx),
    },
  };
}

/* ── CLI ────────────────────────────────────────────────────────────────────── */

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const check = process.argv.includes('--check');
  const { ctx, files } = buildAll();

  if (ctx.mismatches.length) {
    console.error('token source mismatch — company-os-pixel.json and .css disagree:');
    for (const m of ctx.mismatches) console.error(`  · ${m}`);
    process.exit(2);
  }
  if (!existsSync(FONT_FILE)) {
    console.error(`missing vendored font: ${FONT_FILE}`);
    process.exit(2);
  }

  let drifted = 0;
  for (const [name, content] of Object.entries(files)) {
    const path = join(GENERATED, name);
    const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
    if (current === content) {
      if (!check) console.log(`  ok    generated/${name} (unchanged)`);
      continue;
    }
    if (check) {
      console.error(`  DRIFT generated/${name} differs from a fresh build`);
      drifted++;
    } else {
      mkdirSync(GENERATED, { recursive: true });
      writeFileSync(path, content);
      console.log(`  write generated/${name} (${content.length.toLocaleString()} chars)`);
    }
  }
  if (check) {
    if (drifted) {
      console.error(`token pipeline: ${drifted} file(s) out of date — run: npm run tokens:build`);
      process.exit(1);
    }
    console.log('token pipeline: generated files are in sync with design/tokens/');
  }
}
