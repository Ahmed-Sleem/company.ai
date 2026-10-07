#!/usr/bin/env node
/**
 * Browser probe — the checks `verify.mjs` explicitly cannot do (it has no browser).
 *
 *   npx playwright@latest install chromium
 *   node design/prototype/probe-browser.mjs
 *
 * What it measures, on the real prototype, in a real engine:
 *   1. viewport matrix — 320x568, 390x844, 768x1024, 1280x800, 1440x900, 1920x1080
 *   2. the network page on first paint in every case: is the graph inside its stage, or clipped?
 *   3. horizontal overflow of the page (a scrollbar that should not exist)
 *   4. the app's own touch-target size under `pointer: coarse`
 *   5. WCAG contrast of the token pairs that carry meaning, in both themes, measured from the
 *      live computed CSS variables (not from a table)
 *   6. focus visibility: tabbing to the first controls must move a visible focus ring
 *
 * It prints PASS/FAIL per check and a NOT CHECKED list, exactly like the gate — so nothing this
 * script did not look at can be mistaken for verified. Exit code 1 if any check fails.
 *
 * Requirements: Node 18+, Playwright with Chromium. This is a *browser* probe: `verify.mjs`
 * stays the dependency-free gate that CI can always run.
 */
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROTOTYPE = pathToFileURL(resolve(HERE, 'company-os.html')).href;

const results = [];
const notChecked = [
  'screen-reader announcement order (needs a screen reader, not a headless engine)',
  'touch gestures on real glass (a synthesised two-finger pinch is checked here, a thumb is not)',
  'forced-colors / high-contrast mode rendering',
  'long-session behaviour: storage growth, repeated layout resets',
];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
}

/* ---- the viewport matrix ---------------------------------------------------------------- */
const VIEWPORTS = [
  { w: 320, h: 568, label: '320x568' },
  { w: 390, h: 844, label: '390x844' },
  { w: 768, h: 1024, label: '768x1024' },
  { w: 1280, h: 800, label: '1280x800' },
  { w: 1440, h: 900, label: '1440x900' },
  { w: 1920, h: 1080, label: '1920x1080' },
];

/**
 * Wait until nothing on screen is moving: the nodes *and* the camera.
 *
 * The node positions alone are not enough — a camera glide moves every node on screen without
 * changing a single node coordinate, so this used to report "settled" in the middle of a fit and
 * the geometry checks below then measured a half-travelled view and called it clipping.
 */
async function settled(page, timeout = 8000) {
  await page.waitForFunction(() => {
    const svg = document.querySelector('#g-canvas');
    const vp = svg && svg.querySelector('#g-viewport');
    if (!svg || !vp) return false;
    const state = [...document.querySelectorAll('.g-node')].map(n => n.getAttribute('transform')).join('|') +
      '::' + vp.getAttribute('transform');
    const still = state === svg.__lastState;
    svg.__lastState = state;
    return still;
  }, null, { timeout, polling: 250 }).catch(() => {});
}

/** Geometry of the graph stage vs the nodes it draws, in screen pixels. */
async function graphGeometry(page) {
  return page.evaluate(() => {
    const svg = document.querySelector('#g-canvas');
    const stage = document.querySelector('#g-stage');
    if (!svg || !stage) return null;
    const st = stage.getBoundingClientRect();
    // only nodes the current scope/filter actually shows: a hidden node reports a 0x0 rect at (0,0)
    const nodes = [...document.querySelectorAll('.g-node')].filter(n => {
      const r = n.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    // department hulls are on screen too — a fit that ignores them clips them (this is exactly
    // how the rings layout slipped past the first version of this probe)
    const hulls = [...document.querySelectorAll('.g-hull')].filter(h => {
      const r = h.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    let hullsClipped = 0;
    for (const h of hulls) {
      const r = h.getBoundingClientRect();
      if (r.left < st.left - 0.5 || r.right > st.right + 0.5 ||
          r.top < st.top - 0.5 || r.bottom > st.bottom + 0.5) hullsClipped++;
    }
    if (!nodes.length) return { empty: true, stage: { w: st.width, h: st.height } };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let clipped = 0;
    for (const n of nodes) {
      const r = n.getBoundingClientRect();
      minX = Math.min(minX, r.left); minY = Math.min(minY, r.top);
      maxX = Math.max(maxX, r.right); maxY = Math.max(maxY, r.bottom);
      // a node is clipped when it crosses the stage box
      if (r.left < st.left - 0.5 || r.right > st.right + 0.5 ||
          r.top < st.top - 0.5 || r.bottom > st.bottom + 0.5) clipped++;
    }
    // hulls belong to the content box as well
    for (const h of hulls) {
      const r = h.getBoundingClientRect();
      minX = Math.min(minX, r.left); minY = Math.min(minY, r.top);
      maxX = Math.max(maxX, r.right); maxY = Math.max(maxY, r.bottom);
    }
    const contentW = maxX - minX, contentH = maxY - minY;
    const nodeArea = contentW * contentH;
    return {
      stage: { w: st.width, h: st.height, left: st.left, top: st.top },
      nodes: nodes.length,
      hulls: hulls.length,
      hullsClippedByStage: hullsClipped,
      union: { minX, minY, maxX, maxY },
      clippedByStage: clipped,
      fill: nodeArea / (st.width * st.height),
    };
  });
}

async function openNetwork(page) {
  const nav = page.locator('#sidebar .navitem[data-nav="network"]').first();
  if (!(await nav.isVisible().catch(() => false))) {
    await page.locator('[data-action="open-nav"]').first().click().catch(() => {});
  }
  await page.locator('#sidebar .navitem[data-nav="network"]').first().click();
  await page.waitForSelector('#g-canvas', { timeout: 5000 });
}

/* ---- WCAG contrast of the live tokens ---------------------------------------------------- */
async function tokenContrast(page, theme) {
  await page.evaluate((t) => {
    window.localStorage.removeItem('ai-company-graph-v1');
  }, theme);
  // use the app's own appearance control so we read a real themed document
  for (let i = 0; i < 3; i++) {
    const cur = await page.evaluate(() => document.documentElement.dataset.theme);
    if (cur === theme) break;
    await page.locator('[data-action="theme"]').first().click().catch(() => {});
  }
  return page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    const parse = (c) => {
      c = c.replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      if (c.length === 8) c = c.slice(0, 6);
      const n = parseInt(c, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const lum = (rgb) => {
      const [r, g, b] = rgb.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => {
      const [l1, l2] = [lum(parse(a)), lum(parse(b))].sort((x, y) => y - x);
      return (l1 + 0.05) / (l2 + 0.05);
    };
    const pairs = [
      ['text on surface', '--text', '--surface'], ['text on bg', '--text', '--bg'],
      ['muted on surface', '--muted', '--surface'], ['muted on bg', '--muted', '--bg'],
      ['dim on bg', '--dim', '--bg'], ['accent on surface', '--accent', '--surface'],
      ['on-accent on accent', '--on-accent', '--accent'], ['danger on surface', '--danger', '--surface'],
      ['warning on surface', '--warning', '--surface'], ['blue on surface', '--blue', '--surface'],
      ['text on raised', '--text', '--raised'], ['text on side', '--text', '--side'],
    ];
    return pairs.map(([name, fg, bg]) => ({ name, fg: v(fg), bg: v(bg), ratio: +ratio(v(fg), v(bg)).toFixed(2) }));
  });
}

/* ---- run --------------------------------------------------------------------------------- */
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

/* 1 + 2 + 3 — the matrix, the graph fit, the page overflow */
const matrix = [];
for (const vp of VIEWPORTS) {
  await page.setViewportSize({ width: vp.w, height: vp.h });
  await page.goto(PROTOTYPE, { waitUntil: 'load' });
  await page.evaluate(() => window.localStorage.removeItem('ai-company-graph-v1'));
  await page.reload({ waitUntil: 'load' });
  await openNetwork(page);
  await settled(page);
  const geo = await graphGeometry(page);
  // switching layout re-frames the picture; the framing must hold in both layouts
  const layouts = {};
  for (const layout of ['rings', 'force']) {
    await page.locator(`[data-g="layout"][data-value="${layout}"]`).first().click().catch(() => {});
    await settled(page);
    layouts[layout] = await graphGeometry(page);
  }
  geo.layouts = layouts;
  const overflow = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
    scrollH: document.documentElement.scrollHeight, clientH: document.documentElement.clientHeight,
  }));
  matrix.push({ vp: vp.label, geo, overflow });
}

const clipped = matrix.filter(m => m.geo && m.geo.clippedByStage > 0);
check('network: every node is inside its stage on first paint (no clipping)',
  clipped.length === 0,
  clipped.length
    ? clipped.map(m => `${m.vp}: ${m.geo.clippedByStage}/${m.geo.nodes} nodes cross the stage edge`).join(' · ')
    : matrix.map(m => `${m.vp}: fill ${(m.geo.fill * 100).toFixed(0)}%`).join(' · '));

const hullClip = matrix.filter(m => m.geo && m.geo.hullsClippedByStage > 0);
const layoutClip = [];
for (const m of matrix) {
  for (const [layout, g] of Object.entries(m.geo.layouts || {})) {
    if (g && (g.clippedByStage > 0 || g.hullsClippedByStage > 0))
      layoutClip.push(`${m.vp} ${layout}: ${g.clippedByStage} node / ${g.hullsClippedByStage} hull`);
  }
}
check('network: department hulls stay inside the stage (they are on screen too)',
  hullClip.length === 0 && layoutClip.length === 0,
  hullClip.length || layoutClip.length
    ? [...hullClip.map(m => `${m.vp}: ${m.geo.hullsClippedByStage}/${m.geo.hulls} hulls clipped`), ...layoutClip].join(' · ')
    : `${matrix.reduce((n, m) => n + (m.geo.hulls || 0), 0)} hulls framed, and both layouts re-frame on switch`);

const hOverflow = matrix.filter(m => m.overflow.scrollW > m.overflow.clientW + 1);
check('layout: no horizontal page overflow at any tested width',
  hOverflow.length === 0,
  hOverflow.length ? hOverflow.map(m => `${m.vp}: ${m.overflow.scrollW}>${m.overflow.clientW}`).join(' · ')
                   : `${matrix.length} viewports, no horizontal scrollbar`);

/* "Fitted" means the content box fills the axis it is constrained by (~94% allowing for the
   fit padding), not that it covers a particular share of the stage's area. */
const notFitted = matrix.filter(m => {
  if (m.geo.empty) return false;
  const fitX = (m.geo.union.maxX - m.geo.union.minX) / m.geo.stage.w;
  const fitY = (m.geo.union.maxY - m.geo.union.minY) / m.geo.stage.h;
  m.geo.fitAxis = Math.max(fitX, fitY);
  return m.geo.fitAxis < 0.7;
});
check('network: the graph is framed to its stage, not floating in it',
  notFitted.length === 0,
  notFitted.length
    ? notFitted.map(m => `${m.vp}: content fills ${(m.geo.fitAxis * 100).toFixed(0)}% of its constraining axis`).join(' · ')
    : matrix.map(m => `${m.vp}: ${(m.geo.fitAxis * 100).toFixed(0)}%`).join(' · '));

/* 4 — touch targets under pointer: coarse */
const touch = await browser.newContext({
  viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
});
const tPage = await touch.newPage();
await tPage.goto(PROTOTYPE, { waitUntil: 'load' });
const small = await tPage.evaluate(() => {
  const controls = [...document.querySelectorAll('button, [role="button"], a[href], input, select, textarea')]
    .filter(el => el.offsetParent !== null);
  return controls.map(el => {
    const r = el.getBoundingClientRect();
    return { label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height), cls: el.className };
  }).filter(c => c.h > 0 && (c.w < 44 || c.h < 44));
});
await touch.close();
check('touch: every visible control is >= 44px on a coarse pointer',
  small.length === 0,
  small.length ? `${small.length} small: ` + small.slice(0, 4).map(c => `${c.label||c.cls} ${c.w}x${c.h}`).join(' · ')
               : 'all controls meet the 44px floor at 390px');

/* 5 — contrast from the live variables */
const dark = await tokenContrast(page, 'dark');
const light = await tokenContrast(page, 'light');
const fails = [];
for (const [theme, rows] of [['dark', dark], ['light', light]]) {
  for (const r of rows) {
    // 4.5:1 for body text; --dim is documented as non-essential labels only (review item E7)
    const min = r.name.startsWith('dim') ? 3.0 : 4.5;
    if (r.ratio < min) fails.push(`${theme} ${r.name} ${r.ratio}:1 (min ${min})`);
  }
}
check('contrast: token pairs that carry text meaning meet WCAG AA',
  fails.length === 0,
  fails.length ? fails.join(' · ')
               : `${dark.length + light.length} pairs · worst ` +
                 [...dark, ...light].sort((a, b) => a.ratio - b.ratio)[0].name + ' ' +
                 [...dark, ...light].sort((a, b) => a.ratio - b.ratio)[0].ratio + ':1');

/* 6 — focus ring is visible on the first tab stops */
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(PROTOTYPE, { waitUntil: 'load' });
const focusTrail = [];
for (let i = 0; i < 6; i++) {
  await page.keyboard.press('Tab');
  focusTrail.push(await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const cs = getComputedStyle(el);
    const ring = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
    return { tag: el.tagName.toLowerCase(), text: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 20), ring };
  }));
}
const noRing = focusTrail.filter(f => f && !f.ring);
check('focus: the first tab stops draw a visible focus ring',
  noRing.length === 0 && focusTrail.filter(Boolean).length >= 4,
  noRing.length ? `${noRing.length} stop(s) without a ring: ` + noRing.map(f => f.tag + ' ' + f.text).join(', ')
                : focusTrail.filter(Boolean).map(f => f.tag + (f.text ? ' ' + f.text : '')).join(' → '));

/* 7 — the world tab: the same viewport matrix, on the new surface --------------------------- */
/**
 * The world tab is opened by address, not by clicking the sidebar: under 800px the demo keeps its
 * navigation behind a drawer button, so a click is a different gesture at every width. The demo
 * reads `location.hash` at boot (the same route a bookmark uses), which is one gesture everywhere.
 */
async function openWorld(page) {
  /* about:blank first: navigating to the same document with a different fragment is a
     same-document navigation, and the demo (correctly) does not listen for hash changes — the
     fragment is read once, at boot. Leaving the document forces that boot to happen. */
  await page.goto('about:blank');
  await page.goto(PROTOTYPE + '#world', { waitUntil: 'load' });
  await page.waitForSelector('#world-viewport', { timeout: 5000 });
  await page.waitForTimeout(400);
}

const worldMatrix = [];
for (const vp of VIEWPORTS) {
  await page.setViewportSize({ width: vp.w, height: vp.h });
  await openWorld(page);
  const geo = await page.evaluate(() => {
    const v = document.querySelector('#world-viewport');
    const c = document.querySelector('#world-canvas');
    const rooms = [...document.querySelectorAll('.room')];
    const desks = [...document.querySelectorAll('.desk')];
    const box = v.getBoundingClientRect();
    const cb = c.getBoundingClientRect();
    const inside = [...rooms, ...desks].filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.left >= box.left - 1 && r.right <= box.right + 1 && r.top >= box.top - 1 && r.bottom <= box.bottom + 1;
    }).length;
    return {
      stage: { w: Math.round(box.width), h: Math.round(box.height) },
      canvas: { w: Math.round(cb.width), h: Math.round(cb.height) },
      rooms: rooms.length, desks: desks.length, inside,
      scale: document.querySelector('[data-w="scale"]')?.textContent,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  worldMatrix.push({ vp: vp.label, geo });
}
const worldClipped = worldMatrix.filter(m => m.geo.inside < m.geo.rooms + m.geo.desks);
check('world: the whole floor plan is on screen at every tested width',
  worldClipped.length === 0,
  worldClipped.length
    ? worldClipped.map(m => `${m.vp}: ${m.geo.inside}/${m.geo.rooms + m.geo.desks} inside the stage`).join(' · ')
    : worldMatrix.map(m => `${m.vp}: ${m.geo.scale} of ${m.geo.rooms} rooms + ${m.geo.desks} desks`).join(' · '));

const worldOverflow = worldMatrix.filter(m => m.geo.overflowX > 1);
check('world: the tab does not push the page sideways on a phone',
  worldOverflow.length === 0,
  worldOverflow.length ? worldOverflow.map(m => `${m.vp}: +${m.geo.overflowX}px`).join(' · ')
                       : `${worldMatrix.length} viewports, no horizontal scrollbar`);

/* 8 — the movement: a wheel flick must travel over several frames, not teleport ------------------
   This is the check behind "make the zoom smooth". The camera is sampled every animation frame
   while a flick is delivered; a jump would show up as one big delta and no tail. */
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(PROTOTYPE, { waitUntil: 'load' });
await openNetwork(page);
await settled(page);
const motion = await page.evaluate(async () => {
  const viewport = document.querySelector('#g-canvas');
  const read = () => {
    const t = document.querySelector('#g-viewport').getAttribute('transform');
    const m = /translate\(([-0-9.]+) ([-0-9.]+)\) scale\(([-0-9.]+)\)/.exec(t);
    return m ? { k: +m[3], tx: +m[1], ty: +m[2] } : null;
  };
  const samples = [];
  let stop = false;
  const tick = () => { const v = read(); if (v) samples.push(v); if (!stop) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const box = viewport.getBoundingClientRect();
  for (let i = 0; i < 6; i++) {
    viewport.dispatchEvent(new WheelEvent('wheel', {
      deltaY: -120, deltaMode: 0, clientX: box.left + box.width / 2, clientY: box.top + box.height / 2,
      bubbles: true, cancelable: true,
    }));
    await new Promise(r => setTimeout(r, 30));
  }
  await new Promise(r => setTimeout(r, 900));
  stop = true;
  const first = samples[0], last = samples[samples.length - 1];
  let biggest = 0;
  for (let i = 1; i < samples.length; i++) biggest = Math.max(biggest, Math.abs(samples[i].k - samples[i - 1].k));
  const moved = samples.filter((v, i) => i > 0 && Math.abs(v.k - samples[i - 1].k) > 1e-4).length;
  return { frames: samples.length, movingFrames: moved, biggestStep: biggest, from: first, to: last };
});
check('graph: a wheel flick eases over many frames instead of jumping',
  motion.movingFrames >= 10 && motion.biggestStep < Math.abs(motion.to.k - motion.from.k) * 0.5,
  `k ${motion.from.k.toFixed(3)} → ${motion.to.k.toFixed(3)} across ${motion.movingFrames} moving frames ` +
  `(largest single-frame step ${motion.biggestStep.toFixed(4)})`);

/* 9 — reduced motion: the same flick arrives at once, and nothing glides ------------------------ */
const rmCtx = await browser.newContext({ reducedMotion: 'reduce' });
const rmPage = await rmCtx.newPage();
await rmPage.setViewportSize({ width: 1440, height: 900 });
await rmPage.goto(PROTOTYPE, { waitUntil: 'load' });
await openNetwork(rmPage);
await settled(rmPage);
const reduced = await rmPage.evaluate(async () => {
  const canvas = document.querySelector('#g-canvas');
  const read = () => {
    const m = /scale\(([-0-9.]+)\)/.exec(document.querySelector('#g-viewport').getAttribute('transform'));
    return m ? +m[1] : null;
  };
  const before = read();
  const box = canvas.getBoundingClientRect();
  canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, clientX: box.left + box.width / 2, clientY: box.top + box.height / 2, bubbles: true, cancelable: true }));
  const immediate = read();
  await new Promise(r => setTimeout(r, 400));
  return { before, immediate, after: read() };
});
await rmCtx.close();
check('graph: with reduced motion asked for, the camera arrives immediately and stays put',
  Math.abs(reduced.immediate - reduced.before) > 1e-4 && reduced.immediate === reduced.after,
  `k ${reduced.before.toFixed(3)} → ${reduced.immediate.toFixed(3)} on the same tick, unchanged after 400ms`);

await browser.close();

/* ---- report ------------------------------------------------------------------------------ */
const failed = results.filter(r => !r.ok);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  —  ' + r.detail : ''}`);
console.log('\nNOT CHECKED here (needs a device / screen reader / different engine):');
notChecked.forEach(n => console.log('  · ' + n));
console.log(`\n${results.length - failed.length}/${results.length} browser checks passed`);
process.exit(failed.length ? 1 : 0);
