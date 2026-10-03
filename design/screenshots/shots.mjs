#!/usr/bin/env node
/**
 * Capture the README gallery from the real prototype.
 *
 *   npx playwright@latest install chromium
 *   node design/screenshots/shots.mjs
 *
 * Writes PNGs into this folder (design/screenshots/). Optional first argument: output directory.
 * Every step is defensive: if a control cannot be found the shot is skipped with a warning, and the
 * summary at the end says exactly what was produced. Nothing is ever faked.
 */
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(process.argv[2] || HERE);
const PROTOTYPE = pathToFileURL(resolve(HERE, '..', 'prototype', 'company-os.html')).href;

const SHOTS = [
  { file: '01-team-light-en.png',               view: 'Team',          theme: 'light', lang: 'en' },
  { file: '02-tasks-light-en.png',              view: 'Tasks',         theme: 'light', lang: 'en' },
  { file: '03-inbox-light-en.png',              view: 'Inbox',         theme: 'light', lang: 'en' },
  { file: '04-conversations-light-en.png',      view: 'Conversations', theme: 'light', lang: 'en' },
  { file: '05-network-force-light-en.png',      view: 'Network',       theme: 'light', lang: 'en', layout: 'force' },
  { file: '06-network-rings-light-en.png',      view: 'Network',       theme: 'light', lang: 'en', layout: 'rings' },
  { file: '07-settings-light-en.png',           view: 'Settings',      theme: 'light', lang: 'en' },
  { file: '08-team-dark-en.png',                view: 'Team',          theme: 'dark',  lang: 'en' },
  { file: '09-network-force-dark-ar.png',       view: 'Network',       theme: 'dark',  lang: 'ar', layout: 'force' },
  { file: '10-tasks-dark-ar.png',               view: 'Tasks',         theme: 'dark',  lang: 'ar' },
  { file: '11-team-light-ar.png',               view: 'Team',          theme: 'light', lang: 'ar' },
  { file: '12-network-mobile-ar.png',           view: 'Network',       theme: 'dark',  lang: 'ar', layout: 'force', width: 390, height: 844 },
];

/**
 * The prototype's OWN controls (verified against design/designer-demo/ai-company-os.html):
 *   nav items          [data-nav="team|tasks|inbox|comms|network|settings"]
 *   mobile drawer      [data-action="open-nav"]   (visible below 800px)
 *   appearance toggle  [data-action="theme"]      (flips dark <-> light through the app's handler)
 *   language toggle    [data-action="language"]   (flips en <-> ar through the app's handler)
 *   graph layout       [data-g="layout"][data-value="force|rings"]
 *
 * Every step goes through the real control, and if a control cannot be found or the state does not
 * actually change, the shot FAILS and is reported as skipped. Nothing is ever faked by writing to
 * the DOM from outside the app — a screenshot that did not come from the app's own state is worse
 * than no screenshot.
 */

/** Wait until the control exists and click it; throws with a clear reason if it does not. */
async function clickControl(page, selector, what) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: 'visible', timeout: 4000 })
    .catch(() => { throw new Error(`${what}: control ${selector} not visible`); });
  await loc.click();
}

/** Which nav id does a display name mean? */
const VIEW_ID = { Team: 'team', Tasks: 'tasks', Inbox: 'inbox',
                  Conversations: 'comms', Network: 'network', Settings: 'settings' };

async function openView(page, name) {
  const id = VIEW_ID[name];
  if (!id) throw new Error(`unknown view "${name}"`);
  // NB: [data-nav="settings"] matches twice — the workspace button at the top of the sidebar and the
  // settings nav item at the bottom. Only the nav item carries aria-current, so target nav items.
  const selector = `#sidebar .navitem[data-nav="${id}"], #sidebar [data-nav="${id}"].navitem`;
  const target = page.locator(selector).first();
  if (!(await target.isVisible().catch(() => false))) {
    // below 800px the sidebar is a drawer: open it with the app's own button first
    await clickControl(page, '[data-action="open-nav"]', `view "${name}"`);
  }
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: 'visible', timeout: 4000 })
    .catch(() => { throw new Error(`view "${name}": nav item not visible`); });
  await loc.click();
  await page.waitForFunction(
    (v) => [...document.querySelectorAll(`[data-nav="${v}"]`)].some(el => el.getAttribute('aria-current') === 'page'),
    id, { timeout: 4000 }).catch(() => { throw new Error(`view "${name}" did not become current`); });
  return true;
}

async function setTheme(page, theme) {
  // the toggle flips; click until the app reports the wanted theme (max 3 tries)
  for (let i = 0; i < 3; i++) {
    const current = await page.evaluate(() => document.documentElement.dataset.theme);
    if (current === theme) return true;
    await clickControl(page, '[data-action="theme"]', `theme "${theme}"`);
  }
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  if (after !== theme) throw new Error(`theme stayed "${after}", wanted "${theme}"`);
  return true;
}

async function setLang(page, lang) {
  for (let i = 0; i < 3; i++) {
    const current = await page.evaluate(() => document.documentElement.lang);
    if (current === lang) return true;
    await clickControl(page, '[data-action="language"]', `language "${lang}"`);
  }
  const after = await page.evaluate(() => document.documentElement.lang);
  if (after !== lang) throw new Error(`language stayed "${after}", wanted "${lang}"`);
  return true;
}

async function setLayout(page, layout) {
  if (!layout) return true;
  await clickControl(page, `[data-g="layout"][data-value="${layout}"]`, `graph layout "${layout}"`);
  const pressed = await page.locator(`[data-g="layout"][data-value="${layout}"]`).first()
    .getAttribute('aria-pressed');
  if (pressed !== 'true') throw new Error(`graph layout "${layout}" did not engage`);
  return true;
}

/** Wait until the graph stops moving, so a capture shows the settled layout, not a transient. */
async function settled(page, timeout = 8000) {
  await page.waitForFunction(() => {
    const svg = document.querySelector('#g-canvas');
    if (!svg) return true;                       // not the network view — nothing to wait for
    const now = [...document.querySelectorAll('.g-node')].map(n => n.getAttribute('transform')).join('|');
    const still = now === svg.__lastPos;
    svg.__lastPos = now;
    return still;
  }, null, { timeout, polling: 200 }).catch(() => {});
}

const browser = await chromium.launch();
mkdirSync(OUT, { recursive: true });
const done = [], skipped = [];

for (const shot of SHOTS) {
  const page = await browser.newPage({
    viewport: { width: shot.width || 1440, height: shot.height || 900 },
    deviceScaleFactor: 2,
  });
  try {
    await page.goto(PROTOTYPE, { waitUntil: 'networkidle' });
    await setTheme(page, shot.theme);
    await setLang(page, shot.lang);
    if (!(await openView(page, shot.view))) throw new Error(`view "${shot.view}" not found`);
    await setLayout(page, shot.layout);
    await settled(page);                        // the layout engine has stopped moving
    await page.waitForTimeout(250);             // one last paint
    await page.screenshot({ path: resolve(OUT, shot.file) });
    done.push(shot.file);
  } catch (error) {
    skipped.push(`${shot.file} (${error.message})`);
  } finally {
    await page.close();
  }
}

await browser.close();

console.log(`\nSaved ${done.length} screenshot(s) in ${OUT}`);
for (const f of done) console.log('  ✔', f);
if (skipped.length) {
  console.log('\nSkipped (fix the selector or take these by hand — see README.md):');
  for (const s of skipped) console.log('  ✖', s);
}
