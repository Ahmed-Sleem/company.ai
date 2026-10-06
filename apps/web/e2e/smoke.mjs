#!/usr/bin/env node
/**
 * End-to-end smoke test — the gate's browser half.
 *
 * It starts the API and the built web app itself, drives a real Chromium, and tears the
 * servers down. Nothing is mocked: the same code path the owner would run.
 *
 * What it proves (each check is written to be able to fail — see the mutant note in the log):
 *   1. the app renders and the shell has all six views;
 *   2. the theme control really changes the document theme;
 *   3. the language control really switches to Arabic and flips `dir` to rtl;
 *   4. every view's four data states render (`?state=`);
 *   5. the API answers and the decision inbox shows a real decision;
 *   6. no uncaught page errors, and no failed requests to our own origin.
 */
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

// Deliberately NOT the development ports (8787/5173): a smoke test must talk to the servers
// it started itself. Sharing a port with a running dev server silently tested the wrong app.
const API_PORT = 8790;
const WEB_PORT = 4174;
const ROOT = new URL('../../..', import.meta.url).pathname;

const children = [];
function run(command, args, options = {}) {
  // `detached` puts each server in its own process group, so shutting down can signal the
  // group — killing only the `npx` wrapper would leave the real server running (and the next
  // run would fail with "port already in use").
  const child = spawn(command, args, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    ...options,
  });
  children.push(child);
  return child;
}
function shutdown() {
  for (const child of children) {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
  }
}

async function waitFor(url, timeoutMs = 30_000) {
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

const results = [];
const check = (name, condition, detail = '') => {
  results.push({ name, ok: Boolean(condition), detail });
  console.log(`  ${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

try {
  // Always start from an empty database: a smoke test that only passes on the second run
  // (because a decision was already approved) is worse than no smoke test.
  rmSync(`${ROOT}/.data/e2e-pglite`, { recursive: true, force: true });

  console.log(`· starting the API on ${API_PORT} (PGlite, mock provider — no keys, no spend)`);
  const api = run('npx', ['tsx', 'services/api/src/server.ts'], {
    env: { ...process.env, PORT: String(API_PORT), PGLITE_DIR: '.data/e2e-pglite' },
  });
  let apiLog = '';
  api.stdout.on('data', (chunk) => { apiLog += chunk; });
  api.stderr.on('data', (chunk) => { apiLog += chunk; });
  api.on('exit', (code) => {
    if (code !== 0 && code !== null) console.error(`api exited early (${code}) — ${apiLog.trim().slice(0, 300)}`);
  });
  await waitFor(`http://127.0.0.1:${API_PORT}/api/health`);
  if (api.exitCode !== null) {
    // e.g. the machine ran out of memory because another API is already running
    throw new Error(`the API died before the checks began (exit ${api.exitCode}): ${apiLog.trim().slice(0, 300)}`);
  }

  console.log('· starting the built web app');
  run('npx', ['vite', 'preview', '--port', String(WEB_PORT), '--strictPort'], {
    cwd: `${ROOT}/apps/web`,
    env: { ...process.env, API_URL: `http://127.0.0.1:${API_PORT}` },
  });
  await waitFor(`http://127.0.0.1:${WEB_PORT}/`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  const badRequests = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('requestfailed', (request) => badRequests.push(request.url()));
  page.on('response', (response) => {
    if (response.url().includes('/api/') && response.status() >= 500) badRequests.push(response.url());
  });

  await page.goto(`http://127.0.0.1:${WEB_PORT}/`, { waitUntil: 'networkidle' });

  // 1 — shell
  const navIds = await page.$$eval('[data-nav]', (nodes) => nodes.map((n) => n.getAttribute('data-nav')));
  check('the shell renders the six views', navIds.length === 6, navIds.join(', '));
  check('the status bar names the company', (await page.textContent('.statusbar'))?.includes('Acme Studio') ?? false);
  await page.waitForSelector('text=Aria', { timeout: 10_000 });
  check('the team view shows real agents from the database', true, 'Aria rendered');
  const roster = await page.textContent('.roster');
  check('the meter shows the money the ledger recorded, not zero', roster?.includes('$12.50') ?? false,
    (roster ?? '').slice(0, 80).replace(/\s+/g, ' '));

  // 2 — theme
  const before = await page.getAttribute('html', 'data-theme');
  await page.click('[data-action=theme]');
  await page.waitForFunction((b) => document.documentElement.dataset.theme !== b, before);
  const after = await page.getAttribute('html', 'data-theme');
  check('the theme control changes the theme', before !== after, `${before} → ${after}`);
  check('the pixel skin is applied (radius 0)', (await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--radius').trim())) === '0px');

  // 3 — language
  await page.click('[data-action=language]');
  await page.waitForFunction(() => document.documentElement.dir === 'rtl');
  check('Arabic flips the document to rtl', (await page.getAttribute('html', 'dir')) === 'rtl');
  check('Arabic keeps the readable face, not the pixel face',
    await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? !getComputedStyle(h1).fontFamily.includes('Pixelify') : false;
    }));
  await page.click('[data-action=language]');
  await page.waitForFunction(() => document.documentElement.dir === 'ltr');

  // 4 — the four data states, through the URL the demo also uses
  for (const state of ['loading', 'empty', 'error', 'restricted']) {
    await page.goto(`http://127.0.0.1:${WEB_PORT}/?state=${state}#team`, { waitUntil: 'domcontentloaded' });
    const selector = state === 'loading' ? '[role=status]' : state === 'error' ? '[role=alert]' : '.state';
    const found = (await page.$$(selector)).length > 0;
    check(`the ${state} state renders`, found);
  }

  // 5 — the board: the demo's layout on real state, and the review gate refusing the wrong move
  await page.goto(`http://127.0.0.1:${WEB_PORT}/#tasks`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-task]', { timeout: 10_000 });
  const cards = (await page.$$('[data-task]')).length;
  check('the board shows the designer’s ten tasks', cards === 10, `${cards} cards`);

  // The four statistics are read from the rows: "open" is every unfinished task, the other three
  // are the stages it covers — so open = progress + review + backlog, and open = cards − done.
  const statValues = await page.$$eval('.stat-value', (nodes) =>
    nodes.map((node) => Number(node.textContent)));
  const [open, progress, review, done] = statValues;
  // The columns are found by the word they print (the design's vocabulary key beside the dot).
  const columnHeads = await page.$$eval('.column', (columns) => columns.map((column) => ({
    word: column.querySelector('.column-head span:not(.dot)')?.textContent ?? '',
    count: Number(column.querySelector('.column-head span:last-child')?.textContent ?? NaN),
  })));
  const backlog = columnHeads.find((head) => head.word === 'backlog')?.count;
  check('the four statistics are read from the rows, not written in',
    statValues.length === 4 && columnHeads.length === 4 &&
      open === progress + review + backlog && open === cards - done,
    `open ${open} = ${progress} + ${review} + ${backlog} backlog, and ${open} = ${cards} − ${done} done · columns: ${columnHeads.map((h) => `${h.word} ${h.count}`).join(', ')}`);
  check('the board offers the list view the demo has',
    (await page.$$eval('.toolbar', (nodes) => nodes.some((node) => node.textContent?.includes('List')))));

  // the designer's portraits, drawn on the cards: what the API names is what the page draws
  const apiTasks = await (await fetch(`http://127.0.0.1:${API_PORT}/api/tasks`)).json();
  const portraits = await page.evaluate(() => Object.fromEntries(
    [...document.querySelectorAll('[data-task]')].map((card) => [
      card.textContent?.slice(0, 40),
      {
        index: card.querySelector('.avatar')?.getAttribute('data-avatar'),
        pathLength: card.querySelector('.avatar svg path')?.getAttribute('d')?.length ?? 0,
      },
    ]),
  ));
  const drawn = Object.values(portraits);
  check('every card carries a portrait, and it is the agent’s own',
    drawn.length === apiTasks.tasks.length &&
      drawn.every((row) => row.pathLength > 100 && row.index !== null) &&
      new Set(drawn.map((row) => row.pathLength)).size > 1,
    `${drawn.length} portraits, ${new Set(drawn.map((row) => row.pathLength)).size} distinct`);
  const firstCard = drawn[0];
  const firstAgent = apiTasks.tasks.find((task) => (task.owner?.avatar ?? 0) === Number(firstCard.index));
  check('the portrait index matches the one the database stored',
    firstAgent !== undefined && Number(firstCard.index) === firstAgent.owner.avatar);

  // the review gate, in the interface: a task in review cannot be finished without a decision
  await page.click('[data-task]:has-text("Rehearse the migration")');
  await page.waitForSelector('dialog[open]', { timeout: 5_000 });
  const finish = page.locator('dialog button:has-text("Move to Completed")');
  check('the interface disables the move the server refused', await finish.isDisabled());
  const refused = await page.$$eval('dialog .reason', (nodes) => nodes.map((n) => n.textContent));
  const finishTitle = await finish.getAttribute('title');
  check('and prints the rule’s own reason, the same words the server sent',
    refused.length > 0 && refused[0] === finishTitle && (finishTitle?.length ?? 0) > 10,
    JSON.stringify(refused));
  await page.keyboard.press('Escape');

  // and a move the server allows really happens, and lands in the right column
  await page.click('[data-task]:has-text("Billing integration tests")');
  await page.waitForSelector('dialog[open]', { timeout: 5_000 });
  await page.click('dialog button:has-text("Move to In review")');
  const landed = await page.waitForFunction(() => {
    const review = [...document.querySelectorAll('.column')]
      .find((column) => column.querySelector('.column-head span:not(.dot)')?.textContent === 'review');
    return review?.textContent?.includes('Billing integration tests') ?? false;
  }, null, { timeout: 8_000 }).then(() => true).catch(() => false);
  check('a move the server allows lands in the right column', landed);
  await page.keyboard.press('Escape');

  // 5b — the form the designer drew: create a task, see it on the board, then edit it
  await page.goto(`http://127.0.0.1:${WEB_PORT}/#tasks`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-task]');
  await page.click('button:has-text("New task")');
  await page.waitForSelector('#task-form', { timeout: 5_000 });
  const formFields = await page.$$eval('#task-form [name]', (nodes) => nodes.map((node) => node.getAttribute('name')));
  check('the form carries the demo’s six fields', JSON.stringify(formFields) === JSON.stringify(['title', 'owner', 'priority', 'due', 'stage', 'description']),
    formFields.join(', '));
  const prefilledDue = await page.inputValue('#task-form [name=due]');
  check('the required date starts filled, as the demo’s does', /^\d{4}-\d{2}-\d{2}$/.test(prefilledDue), prefilledDue);
  await page.fill('#task-form [name=title]', 'Draft the November hiring plan');
  await page.selectOption('#task-form [name=stage]', 'progress');
  await page.selectOption('#task-form [name=priority]', 'high');
  await page.click('button:has-text("Add task")');
  await page.waitForFunction(() => document.body.textContent?.includes('Draft the November hiring plan') ?? false, null, { timeout: 8_000 })
    .then(() => check('a new task appears on the board with a database-made reference', true))
    .catch(() => check('a new task appears on the board with a database-made reference', false));
  const created = await page.evaluate(() => {
    const card = [...document.querySelectorAll('[data-task]')].find((node) => node.textContent?.includes('Draft the November hiring plan'));
    const progress = [...document.querySelectorAll('.column')].find((column) => column.querySelector('.column-head span:not(.dot)')?.textContent === 'progress');
    return { ref: card?.querySelector('.task-id')?.textContent ?? null, inProgress: progress?.textContent?.includes('Draft the November hiring plan') ?? false };
  });
  check('it lands in the column its stage names, carrying a TSK- reference',
    created.inProgress && /^TSK-\d{3,}$/.test(created.ref ?? ''), JSON.stringify(created));

  // edit it: open the card, take the form, change the title, save
  await page.click('[data-task]:has-text("Draft the November hiring plan")');
  await page.waitForSelector('dialog[open]');
  const detail = await page.textContent('dialog');
  check('the task dialog opens on the detail with an Edit action',
    (detail?.includes('Task detail') ?? false) && (detail?.includes('Edit task') ?? false));
  await page.click('dialog button:has-text("Edit task")');
  await page.waitForSelector('#task-form');
  const filled = await page.inputValue('#task-form [name=title]');
  check('the form opens filled with the task’s own values', filled === 'Draft the November hiring plan', filled);
  await page.fill('#task-form [name=title]', 'Draft the December hiring plan');
  await page.click('button:has-text("Save changes")');
  await page.waitForFunction(() => document.body.textContent?.includes('Draft the December hiring plan') ?? false, null, { timeout: 8_000 })
    .then(() => check('the edit is saved and the board shows it', true))
    .catch(() => check('the edit is saved and the board shows it', false));


  // 5c — the palette, borrowed from the owner's demo: it must change what is drawn, not just
  // what is recorded. The colour check reads the rendered background, so an attribute no token
  // block answers (a typo in a selector) fails here rather than looking fine in a DOM test.
  // Both themes are checked: a preset that answers in only one of them renders half-themed, and
  // that is the failure this step exists to catch.
  const bg = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
  const setTheme = async (theme) => {
    await page.evaluate((value) => localStorage.setItem('company-os.theme', value), theme);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.palette-option');
  };

  await page.goto(`http://127.0.0.1:${WEB_PORT}/#settings`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.palette-option', { timeout: 10_000 });
  const paletteNames = await page.$$eval('.palette-option', (nodes) => nodes.map((n) => n.textContent?.trim()));
  check('Settings offers the owner’s five palettes, in the owner’s order',
    JSON.stringify(paletteNames) === JSON.stringify(['Original sage', 'Ocean blue', 'Soft violet', 'Warm amber', 'Dusty rose']),
    paletteNames.join(' · '));

  await setTheme('light');
  const sageLight = await bg();
  await page.click('.palette-option:has-text("Ocean blue")');
  await page.waitForFunction(() => document.documentElement.dataset.palette === 'ocean');
  const oceanLight = await bg();
  // Measured against the design source's own palette in the SAME theme: comparing the two
  // themes with each other would pass even if the palette did nothing in one of them.
  check('choosing a palette repaints the document, not just its attribute',
    sageLight !== oceanLight, `light ${sageLight} → ${oceanLight}`);
  check('the chosen palette is announced as pressed',
    (await page.getAttribute('.palette-option:has-text("Ocean blue")', 'aria-pressed')) === 'true');

  // the palette has to survive a reload: a preference that lasts only until you navigate is a bug
  await page.reload({ waitUntil: 'networkidle' });
  check('the palette survives a reload',
    (await page.evaluate(() => document.documentElement.dataset.palette)) === 'ocean' && (await bg()) === oceanLight);

  // and it has to answer in the other theme too — measured against sage in that same theme
  await setTheme('dark');
  const oceanDark = await bg();
  await page.click('.palette-option:has-text("Original sage")');
  await page.waitForFunction(() => !document.documentElement.dataset.palette);
  const sageDark = await bg();
  check('the palette repaints the dark theme as well as the light one',
    oceanDark !== sageDark && oceanLight !== sageLight, `ocean dark ${oceanDark} · sage dark ${sageDark}`);
  check('returning to the design source’s palette removes the attribute and the pressed mark moves back',
    (await page.getAttribute('.palette-option:has-text("Original sage")', 'aria-pressed')) === 'true' &&
      (await page.getAttribute('.palette-option:has-text("Ocean blue")', 'aria-pressed')) === 'false');

  // forced colours: the OS replaces every colour, and the swatch is the only place a palette is
  // named in colour. Both of these were wrong in the browser before they were right, which is
  // why they are measured here and not assumed from the stylesheet.
  await page.emulateMedia({ forcedColors: 'active' });
  const forcedState = await page.evaluate(() => {
    const chip = document.querySelector('.palette-chip');
    const pressed = document.querySelector('.palette-option[aria-pressed=true]');
    const style = pressed ? getComputedStyle(pressed) : null;
    return {
      chip: chip ? getComputedStyle(chip).backgroundColor : '',
      outline: style?.outlineStyle ?? 'none',
      outlineWidth: style?.outlineWidth ?? '0px',
    };
  });
  await page.emulateMedia({ forcedColors: 'none' });
  const outlineWhenNormal = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.palette-option[aria-pressed=true]')).outlineStyle);
  check('in forced-colors mode the swatch keeps its colour, so the palette is still readable',
    forcedState.chip === 'rgb(172, 202, 179)', `${forcedState.chip} (sage’s own accent)`);
  check('and the chosen palette is still drawn as chosen',
    forcedState.outline === 'solid' && forcedState.outlineWidth === '2px' && outlineWhenNormal === 'none',
    `forced ${forcedState.outline} ${forcedState.outlineWidth} · normal ${outlineWhenNormal}`);

  // 6 — inbox with a real decision and a working decision commit
  await page.goto(`http://127.0.0.1:${WEB_PORT}/#inbox`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Analytics read access', { timeout: 10_000 });
  check('the inbox lists a decision from the database', true, 'Analytics read access');
  const decisionText = await page.textContent('.decision');
  check('the decision shows its rule and change', decisionText?.includes('access.analytics.read') ?? false);

  // 7 — hygiene
  check('no uncaught page errors', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 200));
  check('no failed requests', badRequests.length === 0, badRequests.join(', ').slice(0, 200));

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} browser checks passed`);
  shutdown();
  // give the servers a moment to release their ports before this process exits
  await sleep(400);
  process.exit(failed.length ? 1 : 0);
} catch (error) {
  console.error('e2e: fatal —', error instanceof Error ? error.message : error);
  console.error('  hint: only one API can run at a time on a small machine (each one loads PostgreSQL).');
  shutdown();
  await sleep(400);
  process.exit(1);
}
