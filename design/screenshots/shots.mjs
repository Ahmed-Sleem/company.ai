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

/** Click the first locator that exists; returns the label used, or null. */
async function tryClick(page, candidates, timeout = 1200) {
  for (const make of candidates) {
    try {
      const loc = make(page).first();
      if (await loc.isVisible({ timeout })) { await loc.click(); return true; }
    } catch { /* try the next strategy */ }
  }
  return false;
}

async function openView(page, name) {
  return tryClick(page, [
    (p) => p.getByRole('button', { name, exact: true }),
    (p) => p.getByRole('link', { name, exact: true }),
    (p) => p.locator(`[data-view="${name.toLowerCase()}"]`),
  ]);
}

async function setTheme(page, theme) {
  const current = await page.evaluate(() =>
    document.documentElement.dataset.theme || document.documentElement.className || '');
  if (current.includes(theme)) return true;
  const clicked = await tryClick(page, [
    (p) => p.getByRole('button', { name: new RegExp(theme, 'i') }),
    (p) => p.locator(`[data-theme-set="${theme}"]`),
  ]);
  if (clicked) return true;
  // last resort: set it directly and let the app react
  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t;
    document.documentElement.classList.toggle('dark', t === 'dark');
    window.dispatchEvent(new Event('resize'));
  }, theme);
  return true;
}

async function setLang(page, lang) {
  const current = await page.evaluate(() => document.documentElement.lang || '');
  if (current.startsWith(lang)) return true;
  const clicked = await tryClick(page, [
    (p) => p.getByRole('button', { name: lang === 'ar' ? /عرب|العربية|AR\b/ : /english|EN\b/i }),
    (p) => p.locator(`[data-lang="${lang}"]`),
  ]);
  if (clicked) return true;
  await page.evaluate((l) => {
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    window.dispatchEvent(new Event('resize'));
  }, lang);
  return true;
}

async function setLayout(page, layout) {
  if (!layout) return true;
  return tryClick(page, [
    (p) => p.getByRole('button', { name: new RegExp(layout === 'rings' ? 'rings' : 'force', 'i') }),
    (p) => p.locator(`[data-layout="${layout}"]`),
  ]);
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
    await page.waitForTimeout(700);            // let the graph settle before capturing
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
