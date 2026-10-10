#!/usr/bin/env node
/**
 * Re-capture the README's screens FROM THE REAL BUILT APP (not the prototype). Needs a build
 * (`npm run build -w @company/web`). Walks the labelled demo through every room, both themes,
 * both languages, and a phone — the same doors a visitor uses.
 */
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { chromium } from 'playwright';

const PORT = 4176;
const OUT = new URL('../design/screenshots/', import.meta.url).pathname;

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '0.0.0.0'], {
  cwd: new URL('../apps/web', import.meta.url).pathname,
  stdio: 'ignore',
});
const up = async () => {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/`);
      if (res.ok) return;
    } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('preview did not come up');
};

const shot = async (page, name) => {
  await page.waitForTimeout(450);
  await page.screenshot({ path: join(OUT, name) });
  console.log('shot', name);
};

try {
  await up();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.landing');
  await shot(page, '00-landing-light-en.png');

  await page.click('[data-landing=demo]');
  await page.waitForSelector('.sidebar');
  const go = async (view, sel) => { await page.click(`[data-nav=${view}]`); await page.waitForSelector(sel); };

  await go('team', '.team-card');       await shot(page, '01-team-light-en.png');
  await go('tasks', '[data-task]');     await shot(page, '02-tasks-light-en.png');
  await go('inbox', '.inbox, .deck, main'); await shot(page, '03-inbox-light-en.png');
  await go('comms', '.chat-log');       await shot(page, '04-conversations-light-en.png');
  await go('network', 'svg.graph, .graph-stage'); await shot(page, '05-network-light-en.png');
  await go('world', '.world');                await shot(page, '06-world-light-en.png');
  await go('settings', '.settings-section'); await shot(page, '07-settings-light-en.png');

  // the diary, in its own tab
  await go('team', '.team-card');
  await page.locator('.team-card').first().click();
  await page.waitForSelector('[data-team=history]');
  const [diary] = await Promise.all([page.waitForEvent('popup'), page.click('[data-team=history]')]);
  await diary.waitForSelector('.landing');
  // the demo showroom never resumes: the new tab is a fresh visitor and takes the demo door
  await diary.click('[data-landing=demo]');
  await diary.waitForSelector('[data-history-view]');
  await shot(diary, '13-history-light-en.png');
  await diary.close();
  await page.keyboard.press('Escape');

  // dark + arabic passes
  await page.click('[data-action=theme]');
  await go('team', '.team-card');       await shot(page, '08-team-dark-en.png');
  await page.click('[data-action=language]');
  await go('network', 'svg.graph, .graph-stage'); await shot(page, '09-network-dark-ar.png');
  await go('tasks', '[data-task]');     await shot(page, '10-tasks-dark-ar.png');
  await page.click('[data-action=theme]');
  await go('team', '.team-card');       await shot(page, '11-team-light-ar.png');

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await phone.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await phone.click('[data-landing=demo]');
  await phone.waitForSelector('.sidebar');
  await phone.evaluate(() => { location.hash = 'network'; });
  await phone.waitForSelector('svg.graph, .graph-stage');
  await shot(phone, '12-network-mobile-ar.png');

  await browser.close();
  console.log('screens captured into design/screenshots/');
} finally {
  server.kill();
}
