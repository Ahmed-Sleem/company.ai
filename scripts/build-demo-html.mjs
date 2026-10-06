#!/usr/bin/env node
/**
 * Build the standalone demo — one HTML file, the real GUI, no server.
 *
 *   node scripts/build-demo-html.mjs            # write demo/company-os-demo.html
 *   node scripts/build-demo-html.mjs --check    # build in memory and say whether the file matches
 *
 * What it does, in order:
 *
 *   1. starts the API against a throw-away database and reads every endpoint the GUI uses, so the
 *      demo shows the same rows the product does (the designer's company, its 8 agents, its tasks);
 *   2. takes the **built** web app (`apps/web/dist`) — the same bundle the browser smoke drives —
 *      and inlines its CSS, its JavaScript and the Pixelify Sans font as data URIs;
 *   3. puts a small `fetch` in front of the app that answers those endpoints from the embedded
 *      data and *mutates it in memory* for the writes, so creating a task, moving one, editing one
 *      and deciding a decision all really work in the file;
 *   4. writes one self-contained HTML file.
 *
 * It is deliberately built from `dist`, not from source: if the demo works, the product works.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

export const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(REPO, 'apps/web/dist');
export const OUT = join(REPO, 'demo/company-os-demo.html');
const API_PORT = 8799;

/** Every read the GUI performs on start-up, plus the ones a view asks for when it opens. */
const ENDPOINTS = [
  '/api/health',
  '/api/company',
  '/api/models',
  '/api/agents',
  '/api/tasks',
  '/api/decisions',
  '/api/decisions?status=pending',
  '/api/session',
  '/api/threads',
];

async function waitFor(url, timeoutMs = 60_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error(`${url} did not come up in ${timeoutMs}ms`);
}

/** Start the API, read the endpoints, stop it. */
async function collectData() {
  // an empty database every time: the demo must show the seeded company, not yesterday's edits
  rmSync(join(REPO, '.data/demo-build'), { recursive: true, force: true });
  const child = spawn('npx', ['tsx', 'services/api/src/server.ts'], {
    cwd: REPO,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    env: { ...process.env, PORT: String(API_PORT), PGLITE_DIR: '.data/demo-build' },
  });
  const log = [];
  child.stdout.on('data', (chunk) => log.push(String(chunk)));
  child.stderr.on('data', (chunk) => log.push(String(chunk)));
  try {
    await waitFor(`http://127.0.0.1:${API_PORT}/api/health`);
    const data = {};
    for (const endpoint of ENDPOINTS) {
      const response = await fetch(`http://127.0.0.1:${API_PORT}${endpoint}`);
      if (!response.ok) throw new Error(`${endpoint} answered ${response.status}`);
      data[endpoint] = await response.json();
    }
    // The allowed moves come from the API on every task (`offers`). Capture them per stage so the
    // stand-in API can hand a *new* task the same offers the real one would — the rule stays the
    // rule's own output, not a copy of it.
    data.offersByStage = {};
    for (const task of data['/api/tasks'].tasks) data.offersByStage[task.stage] = task.offers;
    return data;
  } finally {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
    await sleep(400);
  }
}

/** The app's `request()` unwraps `{…}` as-is and throws `error.message` on a non-2xx. */
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

function fetchStub(data) {
  return STORAGE_SHIM + `
window.__DEMO_DATA__ = ${JSON.stringify(data)};
(function () {
  var store = window.__DEMO_DATA__;
  var clone = function (value) { return JSON.parse(JSON.stringify(value)); };
  var uuid = function (n) { return '00000000-0000-4000-8000-' + String(n).padStart(12, '0'); };
  var failures = [];
  var respond = function (status, body) {
    return Promise.resolve(new Response(JSON.stringify(body), { status: status, headers: { 'content-type': 'application/json' } }));
  };
  window.fetch = function (input, init) {
    var url = String(input && input.url ? input.url : input);
    var path = url.replace(/^[a-z]+:\\/\\/[^/]+/i, '').split('?')[0];
    var query = url.indexOf('?') >= 0 ? url.slice(url.indexOf('?')) : '';
    var method = (init && init.method) || 'GET';
    var body = init && init.body ? JSON.parse(init.body) : null;
    var tasks = store['/api/tasks'].tasks;
    var decisions = store['/api/decisions'].decisions;

    // reads
    for (var key in store) {
      if (key.split('?')[0] === path && method === 'GET') {
        if (key === '/api/decisions' && query.indexOf('status=') >= 0) {
          var wanted = query.split('status=')[1];
          return respond(200, { decisions: decisions.filter(function (d) { return d.status === wanted; }) });
        }
        if (key === '/api/decisions') return respond(200, { decisions: decisions });
        return respond(200, store[key]);
      }
    }

    // writes — small, honest mutations so the demo behaves like the product
    if (path === '/api/tasks' && method === 'POST') {
      var next = 200 + tasks.length;
      var created = {
        id: uuid(tasks.length + 100), shortRef: 'TSK-' + next,
        title: body.title, titleAr: body.titleAr || null,
        description: body.description || null, descriptionAr: body.descriptionAr || null,
        stage: body.stage || 'backlog', priority: body.priority || 'medium', progress: body.progress || 0,
        dueDate: body.dueDate || null, ownerAgentId: body.ownerAgentId,
        owner: null, offers: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      created.offers = store.offersByStage[created.stage] || [];
      var agent = store['/api/agents'].agents.find(function (a) { return a.id === body.ownerAgentId; }) || null;
      created.owner = agent ? { id: agent.id, name: agent.name, nameAr: agent.nameAr, role: agent.role, avatar: agent.avatar } : null;
      tasks.push(created);
      return respond(200, { task: created });
    }
    if (path.indexOf('/api/tasks/') === 0 && method === 'PATCH') {
      var id = path.split('/')[3];
      var row = tasks.find(function (t) { return t.id === id; });
      if (!row) return respond(404, { error: { code: 'not_found', message: 'That task is not here.' } });
      for (var field in body) if (body[field] !== undefined) row[field] = body[field];
      if (body.ownerAgentId) {
        var owner = store['/api/agents'].agents.find(function (a) { return a.id === body.ownerAgentId; });
        row.owner = owner ? { id: owner.id, name: owner.name, nameAr: owner.nameAr, role: owner.role, avatar: owner.avatar } : row.owner;
      }
      row.updatedAt = new Date().toISOString();
      return respond(200, { task: row });
    }
    if (path.indexOf('/api/tasks/') === 0 && path.indexOf('/transition') > 0 && method === 'POST') {
      var moveId = path.split('/')[3];
      var moving = tasks.find(function (t) { return t.id === moveId; });
      if (!moving) return respond(404, { error: { code: 'not_found', message: 'That task is not here.' } });
      moving.stage = body.to;
      moving.offers = store.offersByStage[moving.stage] || [];
      moving.progress = body.to === 'done' ? 100 : moving.progress;
      moving.updatedAt = new Date().toISOString();
      return respond(200, { task: { id: moving.id, stage: moving.stage } });
    }
    if (path.indexOf('/api/decisions/') === 0 && path.indexOf('/decide') > 0 && method === 'POST') {
      var decisionId = path.split('/')[3];
      var decision = decisions.find(function (d) { return d.id === decisionId; });
      if (!decision) return respond(404, { error: { code: 'not_found', message: 'That request is not here.' } });
      decision.status = body.action === 'approve' ? 'approved' : body.action === 'reject' ? 'rejected' : decision.status;
      decision.outcome = body.action === 'approve' ? 'approved' : body.action === 'reject' ? 'rejected' : 'question';
      decision.audit = Object.assign({}, decision.audit, { decidedAt: new Date().toISOString(), decidedByLabel: 'Owner' });
      return respond(200, { decision: decision });
    }

    failures.push(method + ' ' + path);
    return respond(500, { error: { code: 'demo_unwired', message: 'This action is not wired in the demo file.' } });
  };
  window.__DEMO_UNWIRED__ = failures;
})();`.replace('</script>', '<\\/script>');
}

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
function inlineApp(stub) {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  const read = (href) => readFileSync(join(DIST, href.replace(/^\//, '')), 'utf8');

  const { cssTag, jsTag, cssHref, jsSrc } = builtAssets();

  let css = read(cssHref);
  // the font travels with the file: a demo that needs a server for its typeface is not a demo
  const fontMatch = /url\(([^)]+\.woff2)\)/.exec(css);
  if (fontMatch) {
    const fontPath = join(DIST, fontMatch[1].replace(/^\//, '').replace(/^\.\.\//, ''));
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
<title>Company OS — the demo file</title>
<meta name="generator" content="scripts/build-demo-html.mjs — the real GUI, its data and its API in one file">
<meta name="demo-assets" content="${jsSrc} ${cssHref}">
<!-- The demo's own data and the fetch in front of it. Inline and first, so the app finds them. -->
<script>${stub}</script>
<style>${css}</style>
</head>
<body>
${html.replace(cssTag, '').replace(jsTag, '').replace('</body>', () => `<script>${js}</script>\n</body>`)}
<!--
  This file is generated. It is the real application bundle, the real seeded data, and a small
  in-memory stand-in for the API — so every screen, the floor plan, the form, the palettes and the
  preferences can be tried without a server. Writes (creating, editing and moving a task) work and
  last until the page is reloaded. Rebuild with: node scripts/build-demo-html.mjs
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

export async function build() {
  assertBuildIsFresh();
  const data = await collectData();
  return { html: inlineApp(fetchStub(data)), data };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  if (process.argv.includes('--check')) {
    // No server, no data: the question is only whether the file is still this build. The seeded
    // rows inside it legitimately differ between builds — they come from a live API.
    const result = checkDemo();
    if (!result.ok) {
      console.error(`demo: out of date — ${result.why}. Rebuild: node scripts/build-demo-html.mjs`);
      process.exit(1);
    }
    console.log(`demo: in sync with the build — ${result.why}`);
  } else {
    const { html, data } = await build();
    const agents = data['/api/agents'].agents.length;
    const tasks = data['/api/tasks'].tasks.length;
    const decisions = data['/api/decisions'].decisions.length;
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, html);
    console.log(`demo: wrote demo/company-os-demo.html — ${agents} agents · ${tasks} tasks · ${decisions} decisions · ${(html.length / 1024 / 1024).toFixed(2)} MB`);
  }
}
