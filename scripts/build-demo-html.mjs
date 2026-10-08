#!/usr/bin/env node
/**
 * Build the standalone demo — one HTML file, the real GUI, no server.
 *
 *   node scripts/build-demo-html.mjs            # write demo/company-os-demo.html
 *   node scripts/build-demo-html.mjs --check    # build in memory and say whether the file matches
 *
 * What it does, in order:
 *
 *   1. takes the **built** web app (`apps/web/dist`) — the same bundle the browser smoke drives;
 *   2. inlines its CSS, its JavaScript and the Pixelify Sans font as data URIs;
 *   3. writes one self-contained HTML file.
 *
 * There is no API to capture and no fetch to stub: the app is client-only now (REQ-13). Its data
 * travels *inside the bundle* (the labelled demo save, apps/web/src/data/demo.json) and its
 * writes go to localStorage — so the frozen file behaves exactly like the hosted app, offline.
 *
 * It is deliberately built from `dist`, not from source: if the demo works, the product works.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(REPO, 'apps/web/dist');
export const OUT = join(REPO, 'demo/company-os-demo.html');

/**
 * Storage that always works.
 *
 * The app remembers the theme, the palette, the screen effect and the collapsed rail. In a
 * sandboxed frame — which is exactly how this file is often opened — merely *reading*
 * `localStorage` throws a SecurityError, so the first paint would die before rendering. If the real
 * storage cannot be read, this puts a memory-backed one in its place; in a normal browser this does
 * nothing at all.
 */
const STORAGE_SHIM = `(function () {
  try {
    window.localStorage.getItem('company-os.probe');
    return;
  } catch (error) {
    var memory = new Map();
    var shim = {
      getItem: function (key) { return memory.has(key) ? memory.get(key) : null; },
      setItem: function (key, value) { memory.set(String(key), String(value)); },
      removeItem: function (key) { memory.delete(key); },
      clear: function () { memory.clear(); },
      key: function (index) { return Array.from(memory.keys())[index] ?? null; },
    };
    Object.defineProperty(shim, 'length', { get: function () { return memory.size; } });
    try {
      Object.defineProperty(window, 'localStorage', { configurable: true, value: shim });
    } catch (ignored) { /* nothing else to do — the app guards its own reads */ }
  }
})();`;

/**
 * What the current build is, without any data: the two asset names, their contents, and the bundle
 * as it will appear inside a script tag. `--check` needs exactly this and nothing else — the demo's
 * *data* can legitimately differ between builds (it is read from a live API), the app cannot.
 */
export function builtAssets() {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  const cssTag = /<link[^>]+href="([^"]+\.css)"[^>]*>/.exec(html)?.[0];
  const jsTag = /<script[^>]+src="([^"]+\.js)"[^>]*><\/script>/.exec(html)?.[0];
  if (!cssTag || !jsTag) throw new Error('apps/web/dist does not look like a built page — run the build first');
  const cssHref = /href="([^"]+)"/.exec(cssTag)[1];
  const jsSrc = /src="([^"]+)"/.exec(jsTag)[1];
  return { cssTag, jsTag, cssHref, jsSrc, css: readFileSync(join(DIST, cssHref.replace(/^\//, '')), 'utf8') };
}

/**
 * Is the file on disk the current build?
 *
 * Two questions, both answerable without a server: does the demo name the assets this build made,
 * and does it still contain them, byte for byte? A hand edit, or a rebuild of the app without the
 * demo, fails here — which is the point.
 */
export function checkDemo() {
  if (!existsSync(OUT)) return { ok: false, why: 'demo/company-os-demo.html does not exist — build it' };
  const file = readFileSync(OUT, 'utf8');
  const { cssHref, jsSrc, jsTag } = builtAssets();
  const stamp = /<meta name="demo-assets" content="([^"]+)">/.exec(file)?.[1];
  if (stamp !== `${jsSrc} ${cssHref}`) {
    return { ok: false, why: `built from ${stamp ?? 'nothing'} but the build is ${jsSrc} ${cssHref}` };
  }
  const { escapedJs } = bundleFor(jsTag, jsSrc);
  if (!file.includes(escapedJs)) return { ok: false, why: 'the app bundle inside it is not the built bundle' };
  return { ok: true, why: `${Math.round(file.length / 1024)} KB · ${jsSrc}` };
}

/** The bundle as it goes inside the file: read from the build, with what would end the tag escaped. */
function bundleFor(jsTag, jsSrc) {
  const escapedJs = readFileSync(join(DIST, jsSrc.replace(/^\//, '')), 'utf8')
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<!--/g, '<\\!--');
  return { escapedJs };
}

/** The built page, with everything it points at folded into it. */
function inlineApp() {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  const read = (href) => readFileSync(join(DIST, href.replace(/^\//, '')), 'utf8');

  const { cssTag, jsTag, cssHref, jsSrc } = builtAssets();

  let css = read(cssHref);
  // the font travels with the file: a demo that needs a server for its typeface is not a demo
  const fontMatch = /url\(([^)]+\.woff2)\)/.exec(css);
  if (fontMatch) {
    // the build emits relative urls (vite base: './'), so the font sits beside the CSS that names it
    const fontPath = join(DIST, dirname(cssHref), fontMatch[1]);
    // a function replacer: a replacement *string* is scanned for `$&`, `$'`, `` $` ``, and the
    // bundle is full of those — the first attempt spliced fragments of the document into the script
    const dataUri = `data:font/woff2;base64,${readFileSync(fontPath).toString('base64')}`;
    css = css.replace(fontMatch[1], () => dataUri);
  }

  /**
   * The bundle goes in exactly once, into the tag it came from.
   *
   * A `.replace()` chain here was wrong in a way worth remembering: the second pattern matched a
   * `.js` reference *inside the already-inserted bundle*, so the whole script was inlined twice and
   * its first copy — ending in `</script>` — closed the tag early. The page then rendered its own
   * source as text. Replace the tag, once, and escape what would end it early.
   */
  const { escapedJs: js } = bundleFor(jsTag, jsSrc);

  return `<!doctype html>
<html lang="en" dir="ltr" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>company.ai — the demo file</title>
<meta name="generator" content="scripts/build-demo-html.mjs — the real GUI and its save, in one file">
<meta name="demo-assets" content="${jsSrc} ${cssHref}">
<!-- Storage that always works: sandboxed frames throw on localStorage, and this app lives there. -->
<script>${STORAGE_SHIM}</script>
<style>${css}</style>
</head>
<body>
${html.replace(cssTag, '').replace(jsTag, '').replace('</body>', () => `<script>${js}</script>\n</body>`)}
<!--
  This file is generated. It is the real application bundle — every screen, the floor plan, the
  form, the palettes and the preferences — with the labelled demo save inside it. Writes (creating,
  editing and moving a task, deciding a decision) go to this browser's own storage, exactly like
  the hosted app. Rebuild with: node scripts/build-demo-html.mjs
-->
</body>
</html>
`;
}

/** The newest file under a directory, by modification time. */
function newestUnder(path) {
  let newest = 0;
  for (const entry of readdirSync(path, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const at = statSync(join(entry.parentPath ?? entry.path, entry.name)).mtimeMs;
    if (at > newest) newest = at;
  }
  return newest;
}

/**
 * Refuse to freeze a build that is older than the app that made it.
 *
 * Learned the hard way: the demo was rebuilt from a `dist` that predated two source edits, so it
 * carried an older bundle — and the gate's "the demo matches the built app" step failed, correctly,
 * after the next real build. Sixty seconds here saves a whole gate run.
 */
function assertBuildIsFresh() {
  if (!existsSync(join(DIST, 'index.html'))) {
    throw new Error('no apps/web/dist — run: npm run build -w @company/web');
  }
  const built = statSync(join(DIST, 'index.html')).mtimeMs;
  const sources = [join(REPO, 'apps/web/src'), join(REPO, 'packages/tokens/generated')]
    .filter((path) => existsSync(path))
    .map(newestUnder);
  const newest = Math.max(statSync(join(REPO, 'apps/web/index.html')).mtimeMs, ...sources);
  const minutes = Math.round((newest - built) / 60000);
  if (newest > built) {
    throw new Error(`apps/web/dist is ${minutes} minute(s) older than the app source — run: npm run build -w @company/web`);
  }
}

export function build() {
  assertBuildIsFresh();
  return { html: inlineApp() };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  if (process.argv.includes('--check')) {
    const result = checkDemo();
    if (!result.ok) {
      console.error(`demo: out of date — ${result.why}. Rebuild: node scripts/build-demo-html.mjs`);
      process.exit(1);
    }
    console.log(`demo: in sync with the build — ${result.why}`);
  } else {
    const { html } = build();
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, html);
    console.log(`demo: wrote demo/company-os-demo.html — ${(html.length / 1024 / 1024).toFixed(2)} MB`);
  }
}
