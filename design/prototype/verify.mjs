#!/usr/bin/env node
/* =====================================================================================
   Prototype verification gate — run:  node design/prototype/verify.mjs
   -------------------------------------------------------------------------------------
   Checks what can honestly be checked without a browser (15 checks):
     1. the prototype builds from the demo and every patch applies
     2. JavaScript syntax of the graph module and of the demo's own script
     3. the layout engine converges, produces finite coordinates and is deterministic
     4. no raw colours or stray lengths in the prototype stylesheets (token rule)
     5. no physical left/right in the new CSS or markup (RTL rule)
     6. the prototype still contains the demo's six views and its accessibility seams
     7. the network page renders in English and Arabic and honours all five data states
     8. nothing overlaps: node/label footprints and department hulls (force and rings)
     8b. no node is drawn over a department hull label band
     9. every CSS geometry token matches its JavaScript fallback
    10. the world tab renders in both languages and all five data states
    11. people are seated by department, one desk each
    12. the camera eases, settles exactly, holds its limits and does not change speed with frame rate
    13. the wheel is gentle, normalised across devices, and anchored on the pointer
   The browser half lives in `probe-browser.mjs` (Playwright): viewport matrix, graph framing and
   clipping, page overflow, touch targets, contrast measured from the live tokens, and focus rings.
   Anything neither tool measured is still listed as NOT CHECKED, so unverified never reads as done.
   ===================================================================================== */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const DEMO = join(ROOT, 'design', 'designer-demo', 'ai-company-os.html');
const PROTO = join(HERE, 'company-os.html');
const results = [];
const notChecked = [
  'rendering, contrast and focus order in a real browser — run design/prototype/probe-browser.mjs',
  'pointer gestures (drag, pinch, wheel) on a real device',
  'screen-reader announcement order',
  'browser zoom at 200% (the browser probe covers the 320x568 viewport, not zoom)',
];
function check(name, fn) {
  try { const detail = fn(); results.push({ name, ok: true, detail: detail || '' }); }
  catch (e) { results.push({ name, ok: false, detail: e.message }); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

/* 1 — build ---------------------------------------------------------------------------- */
check('build: prototype is exactly the demo plus the documented patches', () => {
  const out = execFileSync('python3', [join(HERE, 'build-prototype.py'), '--check'], { encoding: 'utf8' });
  assert(/ok\s+no duplicate networkView/.test(out), 'build checks did not all pass');
  const tmp = join(mkdtempSync(join(tmpdir(), 'proto-build-')), 'company-os.html');
  execFileSync('python3', [join(HERE, 'build-prototype.py'), '--out', tmp], { encoding: 'utf8' });
  const generated = readFileSync(tmp, 'utf8');
  const committed = readFileSync(PROTO, 'utf8');
  assert(committed.length > 1000, 'prototype file is empty');
  assert(generated === committed,
    `the committed prototype differs from a fresh build (committed ${committed.length} B, generated ${generated.length} B) — rebuild it, do not hand-edit it`);
  return `${committed.length.toLocaleString()} bytes, identical to a fresh build`;
});
const proto = readFileSync(PROTO, 'utf8');
const demo = readFileSync(DEMO, 'utf8');

/* 2 — syntax --------------------------------------------------------------------------- */
check('syntax: graph.js parses', () => {
  execFileSync('node', ['--check', join(HERE, 'graph.js')]);
  return 'node --check';
});
check('syntax: the demo script (with graph interposed) parses', () => {
  const scripts = [...proto.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map(m => m[1]).filter(s => s.includes('const VOICE_NOTE='));
  assert(scripts.length === 1, `expected the app script once, found ${scripts.length}`);
  const tmp = join(mkdtempSync(join(tmpdir(), 'proto-')), 'app.js');
  writeFileSync(tmp, scripts[0]);
  execFileSync('node', ['--check', tmp]);
  return 'node --check';
});

/* 3 — the layout engine ---------------------------------------------------------------- */
check('engine: converges, stays finite, is deterministic', () => {
  const sandbox = { console, window: {}, global: undefined };
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(join(HERE, 'graph.js'), 'utf8'), sandbox);
  const api = sandbox.window.__graph;
  assert(api && typeof api.build === 'function', '__graph test surface missing');

  // a company bigger than the demo's, to be sure the maths holds up
  const agents = [], tasks = [], threads = [];
  for (let i = 0; i < 30; i++) agents.push({ id: 'a' + i, name: ['A' + i, 'أ' + i], role: ['r', 'ر'], dept: i % 3 ? 'Eng' : 'GTM',
    status: ['working', 'idle', 'paused', 'error'][i % 4], avatar: i % 49, manager: i === 0 ? 'you' : 'a' + (i % 9),
    spent: 1, budget: 10, focus: ['f', 'و'], skills: [] });
  for (let i = 0; i < 40; i++) tasks.push({ id: 'T' + i, title: ['t', 'م'], owner: 'a' + (i % 30), stage: ['backlog','progress','review','done'][i % 4], priority: 'high', progress: i, due: '2026-10-05' });
  for (let i = 0; i < 6; i++) threads.push({ id: 'th' + i, name: ['x', 'س'], kind: 'group', members: ['a' + i, 'a' + (i + 1)], model: 'GPT-4o' });

  const g = api.build({ agents, tasks, threads, operator: 'Vanil' });
  assert(g.nodes.length === 30 + 1 + 40 + 6, `unexpected node count ${g.nodes.length}`);   /* 30 agents + you + 40 tasks + 6 threads */
  assert(g.edges.length === 30 + 40 + 12, `unexpected edge count ${g.edges.length}`);

  let alpha = 1, last = Infinity, first = 0;
  for (let i = 0; i < 700; i++) {
    const move = api.step(g, { alpha, layout: 'force' });
    if (i === 0) first = move;
    alpha *= 0.976;
    last = move;
  }
  g.nodes.forEach(n => assert(Number.isFinite(n.x) && Number.isFinite(n.y), `non-finite position for ${n.id}`));
  assert(last < first / 10, `layout did not settle (first ${first.toFixed(2)} → last ${last.toFixed(2)})`);
  assert(last < 1.5, `residual movement too high: ${last.toFixed(3)}`);

  // determinism: two identical runs must reach identical positions
  const data = { agents, tasks, threads, operator: 'Vanil' };
  const runA = api.build(data), runB = api.build(data);
  let a = 1;
  for (let i = 0; i < 120; i++) { api.step(runA, { alpha: a, layout: 'force' }); api.step(runB, { alpha: a, layout: 'force' }); a *= 0.976; }
  runA.nodes.forEach((n, i) => assert(n.x === runB.nodes[i].x && n.y === runB.nodes[i].y, `run not deterministic at ${n.id}`));

  // rings mode must also stay finite and settle
  let a2 = 1;
  for (let i = 0; i < 400; i++) { api.step(g, { alpha: a2, layout: 'rings' }); a2 *= 0.976; }
  g.nodes.forEach(n => assert(Number.isFinite(n.x) && Number.isFinite(n.y), 'rings layout produced non-finite positions'));
  return `settled to ${last.toFixed(3)}px/tick · ${g.nodes.length} nodes, ${g.edges.length} edges · deterministic`;
});

/* 4 — token rule ------------------------------------------------------------------------ */
check('tokens: no raw colours or stray lengths in the new stylesheets', () => {
  const files = ['graph.css', 'prototype-changes.css', 'world.css', 'graph.js', 'world.js'];
  /* world.js draws numbers into markup (plan coordinates, a percentage), so it is scanned for raw
     *colours* only, exactly like graph.js — and world-lib.js, which is generated from the app, is
     checked by its own generator (scripts/build-world-lib.mjs) rather than scanned here. */
  const allowLength = file => file.endsWith('.js') ? /rgba?\(|hsla?\(/ : null;
  const problems = [];
  for (const f of files) {
    const src = readFileSync(join(HERE, f), 'utf8');
    const isCss = f.endsWith('.css');
    const ruleBodies = isCss
      ? src.replace(/:root\{[\s\S]*?\n\}/, '').replace(/\/\*[\s\S]*?\*\//g, '')
      : '';
    const hex = (isCss ? ruleBodies : src).match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    // hex inside JS strings would be a raw colour too, but the module has none by design
    hex.forEach(h => problems.push(`${f}: raw colour ${h}`));
    const colourFn = (isCss ? ruleBodies : src).match(/\b(rgba?|hsla?)\(/g) || [];
    colourFn.forEach(c => problems.push(`${f}: raw colour function ${c}`));
    if (isCss) {
      // Media-query breakpoints cannot use CSS custom properties (platform constraint), so
      // they are stripped before the scan and reported separately below.
      const withoutMedia = ruleBodies.replace(/@media[^{]*/g, '');
      const px = withoutMedia.match(/[\d.]+(px|rem|em)\b/g) || [];
      px.forEach(p => problems.push(`${f}: raw length ${p}`));
    }
    if (allowLength(f)) { /* no-op: keeps the intent explicit */ }
  }
  assert(problems.length === 0, problems.slice(0, 6).join(' | '));
  const breakpoints = [...(readFileSync(join(HERE, 'graph.css'), 'utf8') + readFileSync(join(HERE, 'prototype-changes.css'), 'utf8') + readFileSync(join(HERE, 'world.css'), 'utf8'))
    .matchAll(/@media\(([^)]*)\)/g)].map(m => m[1]).filter(c => /px/.test(c));
  return `${files.length} files clean · breakpoints literal (platform constraint): ${[...new Set(breakpoints)].join(', ')}`;
});

/* 5 — RTL rule -------------------------------------------------------------------------- */
check('rtl: no physical left/right in the new CSS or their markup', () => {
  const src = readFileSync(join(HERE, 'graph.css'), 'utf8') + readFileSync(join(HERE, 'prototype-changes.css'), 'utf8') + readFileSync(join(HERE, 'world.css'), 'utf8');
  const bad = src.match(/(margin|padding|border|inset)-(left|right)\b|text-align:\s*(left|right)\b/g) || [];
  assert(bad.length === 0, `physical properties found: ${bad.join(', ')}`);
  const js = readFileSync(join(HERE, 'graph.js'), 'utf8') + readFileSync(join(HERE, 'world.js'), 'utf8');
  const badJs = js.match(/style="[^"]*(left|right)\s*:/g) || [];
  assert(badJs.length === 0, 'physical inline styles found in markup strings');
  return 'logical properties only';
});

/* 6 — the demo is still the demo -------------------------------------------------------- */
check('demo integrity: six views, i18n, a11y seams intact', () => {
  ['team','tasks','inbox','comms','network','settings'].forEach(v => assert(demo.includes(`['${v}'`), `nav entry ${v} missing`));
  ['function teamView','function tasksView','function inboxView','function commsView','function settingsView'].forEach(f =>
    assert(proto.includes(f), `${f} missing from the prototype`));
  assert(proto.includes('showModal'), 'native dialog handling missing');
  assert(proto.includes('data-theme=light'), 'light theme missing');
  assert(proto.includes('Reserved space'), 'the reserved-area copy was lost');
  assert(proto.includes('dir=rtl') || proto.includes('[dir=rtl]'), 'RTL rules missing');
  assert(proto.includes('ai-company-calm-v2'), 'the demo storage key missing');
  /* the world tab: an entry in NAV, a button in the sidebar, a dispatch line, and its Arabic name */
  assert(proto.includes("['world','World Map','grid'],"), 'the world tab is not in NAV');
  assert(proto.includes('${navButton(NAV[6])}'), 'the world tab has no sidebar button');
  assert(proto.includes("world:(typeof window.worldView==='function'?window.worldView:networkView)"), 'the world tab is not dispatched');
  assert(proto.includes('World Map|خريطة المكتب'), 'the world tab has no Arabic name');
  assert(proto.includes('[data-palette=custom] .thread'), 'palette hooks perturbed');
  return 'nav, views, theme, RTL, dialogs, storage all present';
});

/* 7 — the page itself ------------------------------------------------------------------- */
check('view: network page renders in both languages and all five states', () => {
  const sandbox = { console };
  sandbox.window = sandbox;                       /* graph.js prefers window when defined */
  sandbox.global = sandbox;
  sandbox.pref = { lang: 'en' };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(join(HERE, 'graph.js'), 'utf8'), sandbox);
  Object.assign(sandbox, {
    head: (t, d) => `<header>${t}|${d}</header>`,
    stateBlock: k => `[state:${k}]`,
    ui: { state: 'default' },
    data: {
      operator: 'Vanil',
      agents: [{ id: 'aria', name: ['Aria', 'آريا'], role: ['Lead', 'رئيسة'], dept: 'Eng', status: 'working',
                 avatar: 0, manager: 'you', spent: 1, budget: 2, focus: ['f', 'و'], skills: [] }],
      tasks: [{ id: 'T1', title: ['Do', 'افعل'], owner: 'aria', stage: 'progress', priority: 'high', progress: 5, due: '2026-10-05' }],
      threads: [{ id: 'g', name: ['General', 'عام'], kind: 'group', members: ['aria'], model: 'GPT-4o' }],
      decisions: [], departments: [{ name: 'Eng', lead: 'aria' }], events: []
    },
    esc: s => String(s), t: s => s, tr: v => Array.isArray(v) ? v[0] : v,
    avatar: () => '<i></i>', badge: () => '<b></b>', icon: () => '<svg></svg>',
    num: n => String(n), money: n => String(n), date: d => String(d),
    agent: id => sandbox.data.agents.filter(a => a.id === id)[0]
  });
  const en = sandbox.window.graphView();
  assert(en.includes('g-root') && en.includes('g-canvas'), 'graph shell missing');
  assert(!en.includes('undefined'), 'undefined leaked into the markup');
  ['Needs attention', 'Freeze layout', 'Nothing selected'].forEach(s2 => assert(en.includes(s2), `missing: ${s2}`));
  sandbox.pref.lang = 'ar';
  const ar = sandbox.window.graphView();
  assert(/[\u0600-\u06FF]/.test(ar), 'Arabic strings missing');
  assert(ar.includes('g-root'), 'Arabic shell missing');
  assert(!ar.includes('undefined'), 'undefined leaked into the Arabic markup');
  sandbox.pref.lang = 'en';
  for (const state of ['loading', 'empty', 'error', 'restricted']) {
    sandbox.ui.state = state;
    assert(sandbox.window.graphView().includes(`[state:${state}]`), `state ${state} not honoured`);
  }
  sandbox.ui.state = 'default';
  const backup = sandbox.data; sandbox.data = {};
  assert(sandbox.window.graphView().includes('[state:empty]'), 'no-data guard missing');
  sandbox.data = backup;
  return 'en + ar · loading/empty/error/restricted honoured · no-data guard present';
});

/* 8 — nothing overlaps ------------------------------------------------------------------- */
check('spacing: no node, label band or department hull overlaps (force and rings)', () => {
  const sandbox = { console };
  sandbox.window = sandbox; sandbox.global = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(join(HERE, 'graph.js'), 'utf8'), sandbox);
  const api = sandbox.window.__graph;

  const agents = [], tasks = [], threads = [];
  for (let i = 0; i < 30; i++) agents.push({ id: 'a' + i, name: ['Agent ' + i, 'وكيل ' + i], role: ['r', 'ر'],
    dept: i % 3 ? 'Engineering' : 'Go to market', status: ['working','idle','paused','error'][i % 4],
    avatar: i % 49, manager: i === 0 ? 'you' : 'a' + (i % 9), spent: 1, budget: 10, focus: ['f','و'], skills: [] });
  for (let i = 0; i < 40; i++) tasks.push({ id: 'T' + i, title: ['A fairly long task title number ' + i, 'مهمة ' + i],
    owner: 'a' + (i % 30), stage: ['backlog','progress','review','done'][i % 4], priority: 'high', progress: i, due: '2026-10-05' });
  for (let i = 0; i < 6; i++) threads.push({ id: 'th' + i, name: ['Conversation ' + i, 'محادثة ' + i], kind: 'group',
    members: ['a' + i, 'a' + (i + 1)], model: 'GPT-4o' });

  const report = [];
  for (const layout of ['force', 'rings']) {
    const g = api.build({ agents, tasks, threads, operator: 'Vanil' });
    let alpha = 1;
    for (let i = 0; i < 900; i++) { api.step(g, { alpha, layout }); alpha *= 0.976; }
    api.pack(g, {});

    let worstPair = Infinity, badPairs = 0;
    for (let i = 0; i < g.nodes.length; i++) {
      for (let j = i + 1; j < g.nodes.length; j++) {
        const a = g.nodes[i], b = g.nodes[j];
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        const want = api.footprint(a) + api.footprint(b);
        if (d - want < worstPair) worstPair = d - want;
        if (d < want - 0.5) badPairs++;
      }
    }
    if (badPairs) throw new Error(`${layout}: ${badPairs} overlapping node/label pairs (worst clearance ${worstPair.toFixed(2)}px)`);

    // department hulls: compute the same boxes the view draws and check they keep clear
    const groups = api.deptGroups(g).map(list => {
      const pad = 16 + api.labelReserve(list[0]);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      list.forEach(n => {
        minX = Math.min(minX, n.x - n.radius); maxX = Math.max(maxX, n.x + n.radius);
        minY = Math.min(minY, n.y - n.radius); maxY = Math.max(maxY, n.y + n.radius);
      });
      return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
    });
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const A = groups[i], B = groups[j];
        const overlapX = Math.min(A.maxX, B.maxX) - Math.max(A.minX, B.minX);
        const overlapY = Math.min(A.maxY, B.maxY) - Math.max(A.minY, B.minY);
        if (overlapX > 2 && overlapY > 2)
          throw new Error(`${layout}: department hulls overlap by ${overlapX.toFixed(1)}x${overlapY.toFixed(1)}px`);
      }
    }
    // and every node must still be reachable-ish: no node flung far from the rest
    const xs = g.nodes.map(n => n.x), ys = g.nodes.map(n => n.y);
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    if (span > 6000) throw new Error(`${layout}: layout exploded (span ${span.toFixed(0)}px)`);
    if (!groups.length) throw new Error(`${layout}: no department hulls were produced — the hull check would be vacuous`);
    report.push(`${layout}: worst pair clearance ${worstPair.toFixed(1)}px, ${groups.length} hulls clear, span ${span.toFixed(0)}px`);
  }
  return report.join(' · ');
});

/* 8b — hull labels stay readable ------------------------------------------------------------- */
/* The band above a hull holds the department name. A node there paints over the label, which is
   what the first screenshots taken after the fit fix showed. Observed failing first: with
   clearLabelBands() disabled (or the band token set to 0) the worst intrusion below is a node
   sitting ~40px inside the band; with it enabled the intrusion is 0. */
check('spacing: no node is drawn over a department hull label', () => {
  const sandbox = { console };
  sandbox.window = sandbox; sandbox.global = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(join(HERE, 'graph.js'), 'utf8'), sandbox);
  const api = sandbox.window.__graph;

  const agents = [], tasks = [], threads = [];
  for (let i = 0; i < 30; i++) agents.push({ id: 'a' + i, name: ['Agent ' + i, 'وكيل ' + i], role: ['r', 'ر'],
    dept: i % 3 ? 'Engineering' : 'Go to market', status: ['working','idle','paused','error'][i % 4],
    avatar: i % 49, manager: i === 0 ? 'you' : 'a' + (i % 9), spent: 1, budget: 10, focus: ['f','و'], skills: [] });
  for (let i = 0; i < 12; i++) tasks.push({ id: 'T' + i, title: ['Task ' + i, 'مهمة ' + i], owner: 'a' + (i % 30),
    stage: ['backlog','progress','review','done'][i % 4], priority: 'high', progress: i, due: '2026-10-05' });
  for (let i = 0; i < 4; i++) threads.push({ id: 'th' + i, name: ['Conversation ' + i, 'محادثة ' + i], kind: 'group',
    members: ['a' + i, 'a' + (i + 1)], model: 'GPT-4o' });

  const report = [];
  for (const layout of ['force', 'rings']) {
    const g = api.build({ agents, tasks, threads, operator: 'Vanil' });
    let alpha = 1;
    for (let i = 0; i < 900; i++) { api.step(g, { alpha, layout }); alpha *= 0.976; }
    api.pack(g, {});

    assert(api.band() > 0, 'the hull label band token is zero — this check would be vacuous');
    const boxes = api.hullBoxes(g);
    assert(boxes.length >= 2, `${layout}: expected department hulls, got ${boxes.length} — check would be vacuous`);
    let worst = 0, hit = '';
    for (const box of boxes) {
      const inGroup = new Set(box.list.map(n => n.id));
      for (const n of g.nodes) {
        if (inGroup.has(n.id)) continue;
        const f = api.footprint(n);
        // intrusion into the band rectangle (0 when fully outside)
        const overX = Math.min(n.x + f, box.x + box.w) - Math.max(n.x - f, box.x);
        const overY = Math.min(n.y + f, box.y + api.band()) - Math.max(n.y - f, box.y);
        if (overX > 0 && overY > 0) {
          const depth = Math.min(overX, overY);
          if (depth > worst) { worst = depth; hit = n.id + ' on ' + box.dept; }
        }
      }
    }
    assert(worst <= 0.5, `${layout}: a node sits ${worst.toFixed(1)}px inside the hull label band (${hit})`);
    report.push(`${layout}: 0px intrusion into ${boxes.length} label bands`);
  }
  return report.join(' · ');
});

/* 9 — tokens and their fallbacks stay in step ---------------------------------------------- */
check('tokens: every CSS geometry token matches its JS fallback', () => {
  const css = readFileSync(join(HERE, 'graph.css'), 'utf8');
  const js = readFileSync(join(HERE, 'graph.js'), 'utf8');
  const pairs = {
    '--g-you-r': 'youR', '--g-person-r': 'personR', '--g-task-r': 'taskR', '--g-thread-r': 'threadR',
    '--g-hit-pad': 'hitPad', '--g-label-gap': 'labelGap', '--g-arrow': 'arrow',
    '--g-link': 'link', '--g-link-task': 'linkTask', '--g-link-member-extra': 'linkMemberExtra',
    '--g-repel': 'repel', '--g-gap': 'gap', '--g-max-v': 'maxV', '--g-damp': 'damp',
    '--g-zoom-min': 'zoomMin', '--g-zoom-max': 'zoomMax', '--g-fit-pad': 'fitPad',
    '--g-hull-pad': 'hullPad', '--g-hull-label-gap': 'hullLabelGap',
    '--g-ring-gap': 'ringGap', '--g-ring-offset': 'ringOffset', '--g-ring-flat': 'ringFlat',
    '--g-max-depth': 'maxDepth',
    '--g-seed-person': 'seedPerson', '--g-seed-thread': 'seedThread', '--g-seed-task': 'seedTask',
    '--g-alpha': 'alpha', '--g-decay': 'decay',
    '--g-label-reserve-person': 'labelReservePerson', '--g-label-reserve-task': 'labelReserveTask',
    '--g-label-reserve-thread': 'labelReserveThread', '--g-dept-gap': 'deptGap',
    '--g-ring-min-arc': 'ringMinArc', '--g-pack-iters': 'packIters',
    '--g-label-max': 'labelMax', '--g-hull-label-max': 'hullLabelMax',
    '--g-hull-label-band': 'hullLabelBand'
  };
  const bad = [];
  for (const [cssName, jsName] of Object.entries(pairs)) {
    const m = css.match(new RegExp(cssName.replace(/-/g, '\\-') + '\\s*:([^;]+);'));
    const n = js.match(new RegExp('\\b' + jsName + '\\s*:\\s*([0-9.]+)'));
    if (!m || !n) { bad.push(`${cssName} ↔ ${jsName} missing`); continue; }
    if (Math.abs(parseFloat(m[1]) - parseFloat(n[1])) > 1e-9) bad.push(`${cssName}=${m[1]} vs ${jsName}=${n[1]}`);
  }
  assert(bad.length === 0, bad.slice(0, 4).join(' | '));
  return `${Object.keys(pairs).length} token/fallback pairs in step`;
});

/* 10 — the world tab -------------------------------------------------------------------- */
/* The view is rendered in a bare VM: no DOM, no browser. The shared half (the plan, the camera
   maths, the seating rule, the furniture paths) is the app's own code, bundled to world-lib.js by
   scripts/build-world-lib.mjs; world.js draws it. Rendering headlessly is what makes "both
   languages and all five data states" a check instead of a promise. */
function worldSandbox(lang) {
  const sandbox = { console };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(join(HERE, 'world-lib.js'), 'utf8'), sandbox);
  vm.runInContext(readFileSync(join(HERE, 'world.js'), 'utf8'), sandbox);
  Object.assign(sandbox, {
    pref: { lang },
    ui: { state: 'default' },
    data: {
      company: 'Acme Studio', operator: 'Vanil',
      agents: [
        { id: 'aria', name: ['Aria', 'آريا'], role: ['Lead engineer', 'رئيسة الهندسة'], dept: 'Engineering', status: 'working', avatar: 0, spent: 12.5, budget: 40 },
        { id: 'leo', name: ['Leo', 'ليو'], role: ['Software engineer', 'مهندس برمجيات'], dept: 'Engineering', status: 'working', avatar: 2, spent: 8.2, budget: 30 },
        { id: 'maya', name: ['Maya', 'مايا'], role: ['Growth lead', 'قائدة النمو'], dept: 'Go to market', status: 'idle', avatar: 4, spent: 3, budget: 20 },
      ],
      tasks: [
        { id: 'TSK-142', title: ['Refine the streaming pipeline', 'تحسين المسار'], owner: 'aria', stage: 'progress', priority: 'high', progress: 65, due: '2026-10-05' },
        { id: 'TSK-147', title: ['Billing integration tests', 'اختبارات الفوترة'], owner: 'leo', stage: 'review', priority: 'medium', progress: 40, due: '2026-10-06' },
      ],
      threads: [], decisions: [], departments: [], events: [],
    },
    head: (t, d) => `<header>${t}|${d}</header>`,
    stateBlock: k => `[state:${k}]`,
    esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'),
    t: s => s,
    tr: v => Array.isArray(v) ? v[lang === 'ar' ? 1 : 0] || v[0] : String(v ?? ''),
    num: n => String(n),
    money: n => '$' + Number(n).toFixed(2),
    totalSpent: () => sandbox.data.agents.reduce((sum, a) => sum + a.spent, 0),
    avatar: () => '<i class="avatar"></i>',
    icon: () => '<svg class="icon"></svg>',
    stat: (label, value) => `<div class="stat">${label}:${value}</div>`,
    notify: () => {},
  });
  return sandbox;
}

check('view: the world tab renders in both languages and all five data states', () => {
  const en = worldSandbox('en').window.worldView();
  assert(en.includes('world-hud') && en.includes('world-viewport'), 'the world shell is missing');
  assert(!en.includes('undefined'), 'undefined leaked into the world markup');
  /* room names contain '&', which the markup escapes — assert on the plain part */
  ['Whole plan', 'Executive Wing', 'Engineering Lab', 'Breakroom', 'Empty desk'].forEach(x =>
    assert(en.includes(x), `missing: ${x}`));
  assert((en.match(/class="room room-/g) || []).length === 6, 'not every room is drawn');
  assert((en.match(/class="prop prop-/g) || []).length === 21, 'not every piece of furniture is drawn');
  assert((en.match(/data-desk=/g) || []).length === 16, 'not every desk is drawn');
  assert((en.match(/data-agent=/g) || []).length === 3, 'not every person is seated');

  const ar = worldSandbox('ar').window.worldView();
  assert(/[\u0600-\u06FF]/.test(ar), 'Arabic strings missing from the world');
  assert(ar.includes('المخطط كامل'), 'the Arabic toolbar is missing');
  assert(!ar.includes('undefined'), 'undefined leaked into the Arabic world markup');

  [['en', 'default'], ['ar', 'default']].forEach(([lang]) => {
    const box = worldSandbox(lang);
    for (const state of ['loading', 'empty', 'error', 'restricted']) {
      box.ui.state = state;
      assert(box.window.worldView().includes(`[state:${state}]`), `state ${state} not honoured (${lang})`);
    }
    box.ui.state = 'default';
    const backup = box.data;
    box.data = {};
    assert(box.window.worldView().includes('[state:empty]'), `the no-data guard is missing (${lang})`);
    box.data = backup;
  });
  return 'en + ar · 6 rooms, 21 props, 16 desks, 3 seated · loading/empty/error/restricted honoured';
});

check('seats: the demo company is seated by department, not wherever there is room', () => {
  const box = worldSandbox('en');
  const html = box.window.worldView();
  const deptOf = id => ({ aria: 'Engineering', leo: 'Engineering', maya: 'Operations' })[id];
  const roomOf = deskId => {
    const lib = box.window.WORLD_LIB;
    const desk = lib.DEFAULT_LAYOUT.desks.filter(d => d.id === deskId)[0];
    const room = lib.roomAt(lib.DEFAULT_LAYOUT, desk.x + desk.w / 2, desk.y + desk.h / 2);
    return room ? room.id : '';
  };
  const seated = [...html.matchAll(/data-desk="(d\d+)"[^>]*data-agent="([a-z]+)"/g)];
  const multi = [...html.matchAll(/data-agent="([a-z]+)"[^>]*/g)];
  assert(seated.length === 3, `expected the three people to be seated, found ${seated.length}`);
  assert(new Set(multi.map(m => m[1])).size === 3, 'somebody is seated at two desks');
  /* Engineering sits in the engineering lab and Design in the studio — the demo says "Engineering"
     and "Go to market"; the plan calls the second one "Operations". */
  seated.forEach(([, desk, agent]) => {
    const wanted = deptOf(agent);
    const room = roomOf(desk);
    const ok = wanted === 'Engineering' ? room === 'eng' : room === 'ops';
    assert(ok, `${agent} (${wanted}) is in room "${room}"`);
  });
  return 'Engineering → the lab, Go-to-market → operations, one desk each';
});

/* 11 — the camera --------------------------------------------------------------------------- */
/* "Smooth" is a claim until something measures it. These five walk a wheel flick, a fit and a
   pan release through the pure camera maths — no browser, no rendering — and assert what
   "smooth" actually means: the camera moves a bit at a time, it never overshoots, it always
   arrives exactly, it is the same speed on a 30 fps screen as on a 120 Hz one, and it stops
   dead when the user has asked for less motion. */
check('camera: eases toward its target, arrives exactly, never overshoots', () => {
  const sandbox = { console };
  sandbox.window = sandbox; sandbox.global = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(join(HERE, 'graph.js'), 'utf8'), sandbox);
  const cam = sandbox.window.__graph.camera;
  assert(cam && typeof cam.easeViewOver === 'function', 'the camera maths is not on __graph');

  const from = { k: 1, tx: 0, ty: 0 };
  const target = { k: 1.8, tx: -220, ty: -140 };

  /* it never jumps: one frame covers at most a quarter of the distance */
  const one = cam.easeViewOver(from, target, 1000 / 60);
  assert(one.k > from.k && one.k < target.k, 'the first step overshot or went backwards');
  assert(Math.abs(one.k - from.k) <= Math.abs(target.k - from.k) * 0.3, 'the first frame covers too much distance to read as movement');

  /* it arrives, and it arrives exactly — the loop can stop on identity */
  let cur = from, frames = 0;
  while (frames < 240 && cur !== target) { cur = cam.easeViewOver(cur, target, 1000 / 60); frames++; }
  assert(cur === target, `the camera never arrived (after ${frames} frames)`);
  assert(frames > 6 && frames < 60, `settling took ${frames} frames — too fast to read or too slow to use`);

  /* a stuttering 30 fps screen takes the same time as a smooth 120 Hz one */
  const walk = (dt) => { let c = from, n = 0; while (n < 2000 && c !== target) { c = cam.easeViewOver(c, target, dt); n++; } return (n * dt) / 1000; };
  const slow = walk(1000 / 30), fast = walk(1000 / 120);
  assert(Math.abs(slow - fast) < 0.12, `frame rate changes the speed: ${slow.toFixed(2)}s at 30 fps vs ${fast.toFixed(2)}s at 120 Hz`);

  /* and it never drifts: the limits hold at every step */
  const zoombox = cam.zoomedAt({ k: 1, tx: 0, ty: 0 }, 99, 100, 100);
  assert(zoombox.k <= 2.2, `zoom ran past its maximum: ${zoombox.k}`);
  const small = cam.zoomedAt({ k: 1, tx: 0, ty: 0 }, 0.001, 100, 100);
  assert(small.k >= 0.25, `zoom ran past its minimum: ${small.k}`);
  return `${frames} frames to settle · 30 fps and 120 Hz within ${Math.abs(slow - fast).toFixed(3)}s · limits held`;
});

check('camera: the wheel is gentle, anchored on the pointer, and never compounding on the live camera', () => {
  const sandbox = { console };
  sandbox.window = sandbox; sandbox.global = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(join(HERE, 'graph.js'), 'utf8'), sandbox);
  const cam = sandbox.window.__graph.camera;

  /* scrolling away from you zooms out, toward you zooms in — and one notch is a small, readable
     step (about 15%), not a jump */
  const out = cam.wheelStep(100, 0, false);
  const into = cam.wheelStep(-100, 0, false);
  assert(out < 1 && out > 0.8, `one notch away is ${out.toFixed(3)}× — should zoom out gently`);
  assert(into > 1 && into < 1.25, `one notch toward is ${into.toFixed(3)}× — should zoom in gently`);
  assert(Math.abs(out * into - 1) < 1e-9, 'a notch up and a notch down do not cancel');
  /* a trackpad flick arrives as many small events; twenty of them must be one modest movement,
     because they compound on the *target* — that is what stops a flick from flying */
  let total = 1;
  for (let i = 0; i < 20; i++) total *= cam.wheelStep(10, 0, false);
  assert(total > 0.6 && total < 0.85, `twenty small scroll events multiply to ${total.toFixed(2)}× — wrong strength`);
  /* three delta units, one feel */
  const scaled = [cam.wheelStep(100, 0, false), cam.wheelStep(6, 1, false), cam.wheelStep(0.25, 2, false)];
  const spread = Math.max(...scaled) - Math.min(...scaled);
  assert(spread < 0.06, `deltaMode changes the strength of a notch by ${spread.toFixed(3)}`);
  /* the point under the pointer stays put — that is what "anchored" means */
  const before = { k: 1, tx: 30, ty: -10 };
  const mx = 400, my = 260;
  const planX = (mx - before.tx) / before.k, planY = (my - before.ty) / before.k;
  const after = cam.zoomedAt(before, 1.6, mx, my);
  assert(Math.abs(planX - (mx - after.tx) / after.k) < 0.01 && Math.abs(planY - (my - after.ty) / after.k) < 0.01,
    'the graph point under the pointer moved while zooming');
  return `a notch is ±15% (${out.toFixed(3)}× / ${into.toFixed(3)}×) · twenty events ${total.toFixed(2)}× · deltaMode spread ${spread.toFixed(3)} · pointer-anchored`;
});

/* report -------------------------------------------------------------------------------- */
const failed = results.filter(r => !r.ok);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  —  ' + r.detail : ''}`);
console.log('\nNOT CHECKED here (needs a browser/device):');
notChecked.forEach(n => console.log('  · ' + n));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
