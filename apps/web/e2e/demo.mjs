/** Drives the generated demo file straight off disk: no server, no network. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// Paths of THIS repo, wherever it is checked out — the demo file and the evidence shots.
const FILE = new URL('../../../demo/company-os-demo.html', import.meta.url).href;
const SHOTS = fileURLToPath(new URL('../../../.data/shots', import.meta.url));
mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
const external = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
page.on('requestfailed', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) external.push(r.url()); });
page.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) external.push(r.url()); });
await page.goto(FILE, { waitUntil: 'load' });
await page.waitForTimeout(1500);
// The front door (REQ-33): even the frozen demo waits behind its landing now. One click in,
// and the door remembers for the rest of the tab's gotos.
if (await page.$('[data-landing=open]')) await page.click('[data-landing=open]');
else if (await page.$('[data-landing=demo]')) await page.click('[data-landing=demo]');
await page.waitForTimeout(800);
const checks = [];
const check = (name, ok, detail = '') => { checks.push([name, ok]); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };
const body = await page.evaluate(() => document.body.textContent.slice(0, 120).replace(/\s+/g, ' '));
console.log('body starts:', body || '(empty)');
check('the app boots from the file', (await page.$$('[data-nav]')).length === 7, `${(await page.$$('[data-nav]')).length} nav items`);
await page.screenshot({ path: `${SHOTS}/demo-boot.png` });
await page.goto(FILE + '#world', { waitUntil: 'load' });
await page.waitForTimeout(1200);
const world = await page.evaluate(() => ({
  rooms: document.querySelectorAll('[data-room-box]').length,
  desks: document.querySelectorAll('[data-desk]').length,
  props: document.querySelectorAll('[data-prop]').length,
  staffed: document.querySelectorAll('[data-desk][data-agent]').length,
  hud: document.querySelector('.world-stats')?.textContent.replace(/\s+/g, ' ').trim(),
}));
check('the world map draws offline', world.rooms === 6 && world.desks === 16 && world.props === 21, JSON.stringify(world).slice(0, 120));
check('the HUD reads the frozen data', world.staffed === 8, world.hud ?? 'no HUD');
await page.screenshot({ path: `${SHOTS}/demo-world.png` });
await page.goto(FILE + '#settings', { waitUntil: 'load' });
await page.waitForTimeout(800);
const settings = await page.evaluate(() => ({
  toggles: [...document.querySelectorAll('.switch input')].map((n) => n.checked),
  palettes: document.querySelectorAll('.palette-options button').length,
}));
check('both of the owner’s toggles are on in the file', settings.toggles.length === 2 && settings.toggles.every(Boolean), settings.toggles.join(','));
check('the five palettes and the custom accent are all there', settings.palettes === 6, `${settings.palettes} buttons`);
await page.screenshot({ path: `${SHOTS}/demo-settings.png` });
// the things the owner will actually click: a write, a move, and a decision
await page.goto(FILE + '#tasks', { waitUntil: 'load' });
await page.waitForTimeout(1000);
const before = await page.evaluate(() => document.querySelectorAll('[data-task]').length);
await page.click('button:has-text("New task")');
await page.waitForSelector('#task-form', { timeout: 5_000 });
await page.fill('#task-form [name=title]', 'Judge the demo file');
await page.click('button:has-text("Add task")');
await page.waitForTimeout(600);
const after = await page.evaluate(() => document.querySelectorAll('[data-task]').length);
check('creating a task works in the file', after === before + 1, `${before} → ${after} tasks`);
await page.keyboard.press('Escape'); // the form is a dialog: close it before working the board
await page.waitForSelector('dialog[open]', { state: 'detached', timeout: 4_000 }).catch(() => {});
await page.waitForTimeout(300);

await page.click('[data-task]:has-text("Judge the demo file")');
await page.waitForSelector('dialog[open]', { timeout: 5_000 });
await page.click('dialog button:has-text("Move to In progress")');
const moved = await page
  .waitForFunction(() => {
    const progress = [...document.querySelectorAll('.column')]
      .find((column) => column.querySelector('.column-head span:not(.dot)')?.textContent === 'progress');
    return progress?.textContent?.includes('Judge the demo file') ?? false;
  }, null, { timeout: 8_000 })
  .then(() => true)
  .catch(() => false);
check('moving it to In progress works in the file', moved);
await page.keyboard.press('Escape');
await page.screenshot({ path: `${SHOTS}/demo-tasks.png` });

await page.goto(FILE + '#inbox', { waitUntil: 'load' });
await page.waitForTimeout(800);
await page.screenshot({ path: `${SHOTS}/demo-inbox.png` });

check('nothing was fetched from the network', external.length === 0, external.slice(0, 2).join(' '));
check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

// Sandboxed frames (how this file is usually opened) make *reading* localStorage throw. The file
// must still boot there — that is what the storage shim at the top of it is for.
const sandboxed = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const sandboxErrors = [];
sandboxed.on('pageerror', (error) => sandboxErrors.push(String(error).slice(0, 160)));
await sandboxed.addInitScript(() => {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() { throw new Error('SecurityError: storage is blocked in this frame'); },
  });
});
await sandboxed.goto(FILE + '#settings', { waitUntil: 'load' });
await sandboxed.waitForTimeout(1200);
// The front door exists even where storage throws — walk through it like any visitor.
if (await sandboxed.$('[data-landing=open]')) await sandboxed.click('[data-landing=open]');
else if (await sandboxed.$('[data-landing=demo]')) await sandboxed.click('[data-landing=demo]');
await sandboxed.waitForTimeout(800);
const sandboxedToggles = await sandboxed.evaluate(() => [...document.querySelectorAll('.switch input')].map((n) => n.checked));
check('it still boots where storage throws, and the switches still work',
  sandboxErrors.length === 0 && sandboxedToggles.length === 2 && sandboxedToggles.every(Boolean),
  sandboxErrors[0] ?? sandboxedToggles.join(','));
await sandboxed.screenshot({ path: `${SHOTS}/demo-sandboxed.png` });
await browser.close();
const failed = checks.filter((c) => !c[1]).length;
console.log(`\n${checks.length - failed}/${checks.length} demo-file checks passed`);
process.exit(failed ? 1 : 0);
