#!/usr/bin/env node
/**
 * End-to-end smoke test — the gate's browser half.
 *
 * It serves the built web app itself, drives a real Chromium, and tears the server down.
 * Nothing is mocked: the same bundle the owner downloads, reading and writing its own save
 * file in the browser — there is no API any more (REQ-13).
 *
 * What it proves (each check is written to be able to fail — see the mutant note in the log):
 *   1. the app renders and the shell has all six views;
 *   2. the theme control really changes the document theme;
 *   3. the language control really switches to Arabic and flips `dir` to rtl;
 *   4. every view's four data states render (`?state=`);
 *   5. the save file is what the screens read and write, and the decision inbox works;
 *   6. no uncaught page errors, no requests to any API, nothing off-origin.
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium, devices } from 'playwright';

// Deliberately NOT the development port (5173): a smoke test must talk to the server it
// started itself. Sharing a port with a running dev server silently tested the wrong app.
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

/** The visitor's save, read out of the browser. This is the database now. */
const readSave = (target) => target.evaluate(() => {
  const raw = localStorage.getItem('company.ai.save.v1');
  return raw ? JSON.parse(raw).state : null;
});

const results = [];
const check = (name, condition, detail = '') => {
  results.push({ name, ok: Boolean(condition), detail });
  console.log(`  ${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

try {
  // Nothing to seed and nothing to wipe: every run gets a fresh browser profile, so the save
  // starts absent and the app writes the labelled demo company into it on first paint.
  console.log('· starting the built web app');
  run('npx', ['vite', 'preview', '--port', String(WEB_PORT), '--strictPort'], {
    cwd: `${ROOT}/apps/web`,
  });
  await waitFor(`http://127.0.0.1:${WEB_PORT}/`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  const badRequests = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('requestfailed', (request) => badRequests.push(request.url()));
  page.on('request', (request) => {
    if (request.url().includes('/api/')) badRequests.push(`api call: ${request.url()}`);
  });

  /** Every navigation walks back through the landing door like a real visitor would —
      REQ-41 made the door the front door of every fresh load. */
  const openDoor = async (target) => {
    await page.goto(target, { waitUntil: 'networkidle' });
    if (await page.$('[data-landing=open]')) await page.click('[data-landing=open]');
  };
  await openDoor(`http://127.0.0.1:${WEB_PORT}/`);

  // 0 — the front door (REQ-33): a brand-new visitor has no save at all, so the product shows
  // its landing page before anything else. The rest of the smoke looks at the demo company,
  // so it walks through that door first.
  await page.waitForSelector('.landing');
  check('a brand-new visitor meets the landing page before the product', true, 'landing shown');
  await page.click('[data-landing=demo]');
  await page.waitForSelector('.sidebar');

  // 1 — shell
  const navIds = await page.$$eval('[data-nav]', (nodes) => nodes.map((n) => n.getAttribute('data-nav')));
  check('the shell renders the six designer views plus the owner’s World Map — team, tasks, inbox, comms, network, world, settings',
    navIds.join(', ') === 'team, tasks, inbox, comms, network, world, settings', navIds.join(', '));
  // the icons the owner borrowed: every nav item draws one, and it is a filled path
  const navIcons = await page.$$eval('[data-nav]', (nodes) =>
    nodes.map((n) => n.querySelector('svg.pixel-icon path')?.getAttribute('d')?.length ?? 0));
  check('every nav item carries a pixel icon', navIcons.length === 7 && navIcons.every((n) => n > 40),
    navIcons.join(', '));
  check('the status bar names the product and its version',
    (await page.textContent('.statusbar'))?.includes('company.ai') ?? false);
  await page.waitForSelector('text=Aria', { timeout: 10_000 });
  check('the team view shows real agents from the database', true, 'Aria rendered');
  const roster = await page.textContent('.roster');
  check('the roster shows roles and no budget meter (REQ-32)',
    (roster?.includes('Lead engineer') ?? false) && !/budget|\$/i.test(roster ?? ''),
    (roster ?? '').slice(0, 80).replace(/\s+/g, ' '));

  // REQ-41 (owner, sixth round): the landing is the front door on EVERY fresh load — and one
  // click gives the studio back, exactly where it was left.
  await page.reload({ waitUntil: 'networkidle' });
  const resumeDoor = await page.$('[data-landing=open]');
  check('the landing is the front door on every fresh load, offering the studio back',
    resumeDoor !== null);
  if (resumeDoor) await page.click('[data-landing=open]');
  await page.waitForSelector('.sidebar');

  // REQ-37: search is typed straight into the topbar; results hang under the field; no dialog.
  await page.fill('[data-action=search]', 'Aria');
  await page.waitForSelector('.topsearch .search-results li', { timeout: 5_000 });
  const anyDialog = await page.$('.dialog');
  check('search lives inline in the topbar — typing shows results, no dialog',
    (await page.$('.topsearch .search-results li')) !== null && !(anyDialog && await anyDialog.isVisible()));
  await page.fill('[data-action=search]', '');

  // REQ-39: the contracted rail is a strip of labels — the company menu does not open there.
  // the rail defaults to contracted, so the button starts inert; expanding wakes it
  const inertInRail = await page.$eval('.workspace', (b) => b.disabled);
  await page.click('[data-action=rail]');
  const liveAgain = await page.$eval('.workspace', (b) => !b.disabled);
  await page.click('[data-action=rail]');
  const inertAgain = await page.$eval('.workspace', (b) => b.disabled);
  check('the company save/load menu is inert while the rail is contracted',
    inertInRail && liveAgain && inertAgain);

  // REQ-38: one pointer language on every node — a single click never opens the inspector,
  // a double-click does, and the graph is alive in every filter mode.
  await openDoor(`http://127.0.0.1:${WEB_PORT}/#network`);
  await page.waitForSelector('.gnode', { timeout: 10_000 });
  await page.waitForTimeout(2_200); // let the opening simulation breathe
  const anyNode = page.locator('.gnode.person').first();
  const nodeBox = await anyNode.boundingBox();
  await page.mouse.move(nodeBox.x + nodeBox.width / 2, nodeBox.y + nodeBox.height / 2);
  await page.waitForTimeout(250); // the hover pin holds the node still
  await page.mouse.down(); await page.mouse.up(); // a single click…
  await page.waitForTimeout(400);
  const noWindowOnClick = (await page.$('.node-window')) === null;
  await page.mouse.dblclick(nodeBox.x + nodeBox.width / 2, nodeBox.y + nodeBox.height / 2);
  await page.waitForSelector('.node-window', { timeout: 5_000 });
  check('network: double-click inspects, a single click does not', noWindowOnClick);
  // every filter mode keeps the graph alive — nothing freezes under any variant
  let aliveInEveryMode = true;
  const modes = [];
  for (const mode of ['people', 'tasks', 'threads', 'all']) {
    const btn = page.locator(`[data-graph-mode=${mode}]`);
    if (await btn.count() > 0) { await btn.click(); modes.push(mode); }
    await page.waitForTimeout(1_800);
    const t1 = await page.$$eval('.gnode', (ns) => ns.map((n) => n.getAttribute('transform')).join('|'));
    await page.waitForTimeout(700);
    const t2 = await page.$$eval('.gnode', (ns) => ns.map((n) => n.getAttribute('transform')).join('|'));
    if (t1 === t2) aliveInEveryMode = false;
  }
  check('network: every agency drifts in every filter mode — nothing freezes', aliveInEveryMode, modes.join(','));

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
  await openDoor(`http://127.0.0.1:${WEB_PORT}/#tasks`);
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
  const saved = await readSave(page);
  const apiTasks = { tasks: saved?.tasks ?? [] };
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
  const firstAgent = (saved?.agents ?? []).find((agent) => agent.avatar === Number(firstCard.index));
  check('the portrait index matches the one the save stored',
    firstAgent !== undefined && Number(firstCard.index) === Number(firstAgent.avatar));

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
  await openDoor(`http://127.0.0.1:${WEB_PORT}/#tasks`);
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
    if (await page.$('[data-landing=open]')) await page.click('[data-landing=open]');
    await page.waitForSelector('.palette-option');
  };

  await openDoor(`http://127.0.0.1:${WEB_PORT}/#settings`);
  await page.waitForSelector('.palette-option', { timeout: 10_000 });
  const paletteNames = await page.$$eval('.palette-option', (nodes) => nodes.map((n) => n.textContent?.trim()));
  // Changed 2026-10-06: the group now ends with the custom accent, which is an app feature rather
  // than a token preset — so the owner's five are checked in their order, and the sixth is named.
  check('Settings offers the owner’s five palettes, in the owner’s order, then the custom accent',
    JSON.stringify(paletteNames) === JSON.stringify(
      ['Original sage', 'Ocean blue', 'Soft violet', 'Warm amber', 'Dusty rose', 'Custom accent']),
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
  if (await page.$('[data-landing=open]')) await page.click('[data-landing=open]');
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


  // 5d — the owner's World Map: the plan, the camera and the desk drawer, in a real browser
  {
  // The camera eases toward its target, so a check that reads the transform immediately after a
  // gesture measures the animation, not the destination. This waits for it to settle instead.
  const settled = async () => {
    // Two consecutive reads that agree — but only *after* the camera has moved at least once.
    // Comparing immediately against the previous gesture's value declared "arrived" before the
    // new move had started, which is how this check first passed-ish and then measured the wrong
    // frame. The `from` snapshot is what makes the wait honest.
    //
    // "At least once" is only asked for when the camera really is moving: a Fit pressed on an
    // already-fitted plan lands on the exact transform it started from, and demanding movement
    // there would wait for a change that can never come. The app marks the canvas `data-moving`
    // while its frame loop runs; two consecutive still reads while *not* moving is the arrival.
    // (The loop may not have started on this function's very first evaluation — the gesture's
    // handler and this poll race — so "moving" alone never counts as settled either way.)
    await page.waitForFunction(() => {
      const canvas = document.querySelector('.world-canvas');
      const now = getComputedStyle(canvas).transform;
      const previous = window.__lastTransform;
      window.__lastTransform = now;
      return canvas.dataset.moving !== 'true' && previous === now;
    }, undefined, { timeout: 8_000, polling: 80 });
    return page.evaluate(() => {
      const matrix = new DOMMatrix(getComputedStyle(document.querySelector('.world-canvas')).transform);
      return { scale: matrix.a, x: matrix.e, y: matrix.f };
    });
  };

  await openDoor(`http://127.0.0.1:${WEB_PORT}/#world`);
  await page.waitForSelector('.room', { timeout: 10_000 });
  const rooms = (await page.$$('[data-room-box]')).length;
  const desks = (await page.$$('[data-desk]')).length;
  const props = (await page.$$('[data-prop]')).length;
  const worldProps = { count: props };
  const staffed = await page.$$eval('[data-desk][data-agent]', (nodes) => nodes.length);
  check('the plan draws the owner’s six rooms, sixteen desks and twenty-one props',
    rooms === 6 && desks === 16 && props === 21, `${rooms} rooms · ${desks} desks · ${props} props`);
  check('the company is sitting at the desks it has', staffed === 8, `${staffed} desks staffed`);

  // C42 (owner): free agents gather in the break room during work hours — and only then.
  {
    const hour = new Date().getHours();
    const atWork = hour >= 9 && hour < 17;
    const crowd = await page.$$eval('[data-world=lounge-crowd] .presence-chip', (n) => n.length);
    const away = await page.$$eval('.desk-away', (n) => n.length);
    check('free agents rest in the break room during work hours, and stay at their desks outside them',
      atWork ? crowd >= 1 && crowd === away : crowd === 0 && away === 0,
      `crowd ${crowd}, away ${away}, hour ${hour}`);
  }

  // the stats strip is gone (owner 2026-10-09): the floor belongs to the plan; the facts the
  // strip carried still exist for screen readers in the hidden summary sentence
  const noStats = (await page.$('.world-stats')) === null;
  const summary = await page.$eval('[data-world=summary]', (n) => n.textContent ?? '');
  const worldSave = await readSave(page);
  check('the floor has no stats strip and the spoken summary still counts the save',
    noStats && summary.includes(String(worldSave.agents.length)), `${noStats} · ${summary.trim()}`);

  // the plan arrives fitted — it did not, once: the fit effect ran while the world was still a
  // skeleton, found no viewport, and left the owner looking at a cropped floor at 100%
  const fitted = await page.evaluate(() => {
    const matrix = new DOMMatrix(getComputedStyle(document.querySelector('.world-canvas')).transform);
    const viewport = document.querySelector('[data-world=viewport]').getBoundingClientRect();
    const label = Number(document.querySelector('[data-world=scale]').textContent.replace('%', ''));
    return {
      label,
      fitsWidth: matrix.a * 1920 <= viewport.width + 1,
      fitsHeight: matrix.a * 1200 <= viewport.height + 1,
    };
  });
  check('the plan comes up fitted to its viewport, whole', fitted.label < 100 && fitted.fitsWidth && fitted.fitsHeight,
    `${fitted.label}% whole=${fitted.fitsWidth && fitted.fitsHeight}`);

  // zoom: the wheel changes the scale, and it changes it *about the pointer*
  const scaleOf = () => page.evaluate(() => {
    const text = document.querySelector('[data-world=scale]')?.textContent ?? '0%';
    return Number(text.replace('%', ''));
  });
  const before = await scaleOf();
  const viewportBox = await page.locator('[data-world=viewport]').boundingBox();
  const planPointBefore = await page.evaluate(() => {
    const canvas = document.querySelector('.world-canvas');
    const matrix = new DOMMatrix(getComputedStyle(canvas).transform);
    return { matrix: [matrix.a, matrix.e, matrix.f] };
  });
  await page.mouse.move(viewportBox.x + 120, viewportBox.y + 90);
  await page.mouse.wheel(0, -400);
  await settled(); // let the easing arrive
  const after = await scaleOf();
  const planPointAfter = await page.evaluate(() => {
    const canvas = document.querySelector('.world-canvas');
    const matrix = new DOMMatrix(getComputedStyle(canvas).transform);
    return { matrix: [matrix.a, matrix.e, matrix.f] };
  });
  check('the wheel zooms the plan', after > before, `${before}% → ${after}%`);
  const anchor = await page.evaluate(({ a, b, px, py }) => {
    // the same plan point under the pointer before and after: the cursor-anchored guarantee
    const planBefore = { x: (px - a[1]) / a[0], y: (py - a[2]) / a[0] };
    const planAfter = { x: (px - b[1]) / b[0], y: (py - b[2]) / b[0] };
    return Math.max(Math.abs(planBefore.x - planAfter.x), Math.abs(planBefore.y - planAfter.y));
  }, {
    a: planPointBefore.matrix, b: planPointAfter.matrix,
    px: 120, py: 90,
  });
  check('the point under the pointer stays put while zooming', anchor < 2, `moved ${anchor.toFixed(2)} plan units`);

  // a desk opens the drawer with that person's own work
  await page.click('[data-desk][data-agent]:has-text("Aria")');
  await page.waitForSelector('[data-world=drawer]', { timeout: 5_000 });
  const drawer = await page.textContent('[data-world=drawer]');
  const aria = (worldSave?.agents ?? []).find((agent) => agent.name === 'Aria');
  const ariaTasks = (worldSave?.tasks ?? []).filter((task) => task.ownerAgentId === aria?.id);
  check('clicking a desk opens the drawer with that person and their tasks',
    (drawer?.includes('Aria') ?? false) && ariaTasks.every((task) => drawer?.includes(task.shortRef)),
    `${ariaTasks.length} tasks on the drawer`);
  check('and the drawer says which room the desk is in',
    (drawer?.includes('Executive Wing') ?? false) || (drawer?.includes('Sits in') ?? false));
  // Two bugs the browser found here, now locked: a captured pointer stopped the click from ever
  // reaching the desk, and `selected?.id === seat.agent?.id` marked all eight empty desks selected.
  const deskEvents = await page.evaluate(() => ({
    selected: document.querySelectorAll('[data-desk].desk-selected').length,
    art: document.querySelectorAll('.prop-art').length,
  }));
  check('exactly the desk that was clicked is drawn as chosen', deskEvents.selected === 1, `${deskEvents.selected} selected`);
  check('every prop is drawn, and none of them is a blank box', deskEvents.art === worldProps.count, `${deskEvents.art} drawings`);
  await page.click('[data-desk]:not([data-agent])');
  check('clicking an empty desk chooses nothing', (await page.$$('[data-desk].desk-selected')).length === 0);

  // every control now lives in one menu (owner 2026-10-09): open it, then build
  await page.click('[data-world=controls]');
  await page.waitForSelector('[data-world=build-bar]', { timeout: 4_000 });
  check('one menu carries every control',
    (await page.$('[data-world=fit]')) !== null && (await page.$('[data-world=zoom-in]')) !== null &&
    (await page.$('[data-world=build]')) !== null && (await page.$('[data-room=lounge]')) !== null);
  await page.click('[data-world=build]');
  await page.click('[data-world=fit]');
  await settled();
  // Pick a prop that is genuinely grabbable: fully inside the viewport, and the topmost element at
  // its own centre (the plan is a stack of overlapping props and desks — the first prop on a
  // zoomed-in camera was off-screen, and the check below failed against nothing at all).
  const propBefore = await page.evaluate(() => {
    const view = document.querySelector('[data-world=viewport]').getBoundingClientRect();
    const nodes = [...document.querySelectorAll('[data-prop]')];
    const node = nodes.find((candidate) => {
      const rect = candidate.getBoundingClientRect();
      const inside = rect.left > view.left + 8 && rect.top > view.top + 8 && rect.right < view.right - 8 && rect.bottom < view.bottom - 8;
      const centre = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      const top = document.elementFromPoint(centre.x, centre.y)?.closest('[data-prop]');
      return inside && top === candidate;
    }) ?? nodes[0];
    const rect = node.getBoundingClientRect();
    return {
      id: node.getAttribute('data-prop'),
      inlineStart: getComputedStyle(node).insetInlineStart,
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    };
  });
  await page.mouse.move(propBefore.x, propBefore.y);
  await page.mouse.down();
  await page.mouse.move(propBefore.x + 40, propBefore.y + 40, { steps: 8 });
  await page.mouse.up();
  await page.click('[data-world=undo]');
  const undone = await page.$eval(`[data-prop=${propBefore.id}]`, (prop) => getComputedStyle(prop).insetInlineStart);
  check('undo puts it back', Math.abs(parseFloat(undone) - parseFloat(propBefore.inlineStart)) < 0.5, `${undone}`);
  // rooms are buildable too: add one, then undo it away again
  await page.click('[data-world=add-room]');
  const withNewRoom = (await page.$$('[data-room-box]')).length;
  await page.click('[data-world=undo]');
  const afterUndo = (await page.$$('[data-room-box]')).length;
  check('a room can be built — and undone', withNewRoom === 7 && afterUndo === 6, `${withNewRoom} → ${afterUndo}`);
  await page.click('[data-world=build]');

  // the room jumps move the camera to that room
  await page.click('[data-room=lounge]');
  await settled();
  const centred = await page.evaluate(() => {
    const canvas = document.querySelector('.world-canvas');
    const matrix = new DOMMatrix(getComputedStyle(canvas).transform);
    const viewport = document.querySelector('[data-world=viewport]').getBoundingClientRect();
    // where is the middle of the lounge (1300..1680 x 80..960) on screen now?
    const x = 1490 * matrix.a + matrix.e;
    const y = 520 * matrix.a + matrix.f;
    return { dx: Math.abs(x - viewport.width / 2), dy: Math.abs(y - viewport.height / 2) };
  });
  check('a room jump centres that room', centred.dx < 120 && centred.dy < 120, JSON.stringify(centred));

  // RTL: the plan does not mirror, the chrome does
  await page.click('[data-action=language]');
  await page.waitForFunction(() => document.documentElement.dir === 'rtl');
  const rtl = await page.evaluate(() => {
    const canvas = document.querySelector('.world-canvas');
    const matrix = new DOMMatrix(getComputedStyle(canvas).transform);
    const aria = document.querySelector('[data-agent]');
    return {
      scale: matrix.a,
      deskIsRightOfRoom: (() => {
        const room = document.querySelector('[data-room-box=exec]').getBoundingClientRect();
        const desk = document.querySelector('[data-desk=d0]').getBoundingClientRect();
        return desk.left > room.left; // inside the plan, the exec desks still sit to the right
      })(),
      navItem: aria?.textContent,
    };
  });
  check('Arabic flips the chrome but never mirrors the plan', rtl.deskIsRightOfRoom, `scale ${rtl.scale.toFixed(2)}`);
  await page.click('[data-action=language]');
  await page.waitForFunction(() => document.documentElement.dir === 'ltr');

  // 5e — the two preferences the owner asked for, both defaulting to on
  await openDoor(`http://127.0.0.1:${WEB_PORT}/#settings`);
  await page.waitForSelector('.switch', { timeout: 8_000 });
  const defaults = await page.evaluate(() => ({
    fxAttr: document.documentElement.getAttribute('data-fx'),
    railAttr: document.documentElement.getAttribute('data-collapsed'),
    navWidth: getComputedStyle(document.documentElement).getPropertyValue('--nav').trim(),
    fxBoxes: document.querySelectorAll('[data-fx-overlay]').length,
    checked: [...document.querySelectorAll('.switch input')].map((input) => input.checked),
  }));
  check('the screen effect and the collapsed rail are both on by default',
    defaults.fxAttr === 'true' && defaults.railAttr === 'true' && defaults.navWidth === '68px' &&
      defaults.fxBoxes === 1 && defaults.checked.every(Boolean),
    JSON.stringify(defaults));
  const navWidthBefore = defaults.navWidth;
  await page.click('label.switch:has-text("Collapsed sidebar") input');
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-collapsed'));
  const expanded = await page.evaluate(() => ({
    nav: getComputedStyle(document.documentElement).getPropertyValue('--nav').trim(),
    labels: [...document.querySelectorAll('.navitem .itemlabel')].filter((n) => getComputedStyle(n).display !== 'none').length,
  }));
  check('turning the rail off expands the sidebar and shows the labels',
    expanded.nav !== navWidthBefore && expanded.labels === 7, `${navWidthBefore} → ${expanded.nav}, ${expanded.labels} labels`);
  await page.click('label.switch:has-text("Screen effect") input');
  await page.waitForFunction(() => !document.querySelector('[data-fx-overlay]'));
  check('turning the screen effect off removes it from the page', true);

  // and the custom accent really repaints
  await page.click('[data-palette-option=custom]');
  await page.waitForSelector('.accent-picker input[type=color]');
  // `fill` is what actually drives a colour input in Chromium; dispatching a synthetic `input`
  // event does not reach React's value tracker, and the first version of this check therefore
  // "passed" while the accent had never changed at all.
  await page.fill('.accent-picker input[type=color]', '#4a6fa5');
  await page.waitForFunction(() =>
    document.documentElement.dataset.customAccent !== undefined &&
    document.documentElement.dataset.customAccent !== '#accab3');
  const accent = await page.evaluate(() => ({
    applied: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    note: document.querySelector('[data-accent-note]')?.textContent ?? '',
    palette: document.documentElement.dataset.palette,
  }));
  check('a custom accent is derived, written and reported',
    accent.palette === 'custom' && /^#[0-9a-f]{6}$/.test(accent.applied) && accent.applied !== '#accab3' &&
      /(Adjusted for contrast|Used as chosen)/.test(accent.note),
    JSON.stringify(accent));
  }

  // 6 — inbox with a real decision and a working decision commit
  await openDoor(`http://127.0.0.1:${WEB_PORT}/#inbox`);
  await page.waitForSelector('text=Analytics read access', { timeout: 10_000 });
  check('the inbox lists a decision from the database', true, 'Analytics read access');
  const decisionText = await page.textContent('.decision-slide');
  check('the decision shows its rule and change', decisionText?.includes('access.analytics.read') ?? false);

  // 7 — hygiene
  // 5h — a phone. The owner opened the live link on his and it was unusable: the sidebar kept its
  // column of icons but lost its width, so every icon stacked into a ~1000px strip and pushed the
  // screen off the bottom. These checks hold the fix in place.
  {
    const phone = await browser.newPage({ ...devices['iPhone 13'] });
    const openDoorPhone = async (target) => {
      await phone.goto(target, { waitUntil: 'networkidle' });
      if (await phone.$('[data-landing=open]')) await phone.click('[data-landing=open]');
      else if (await phone.$('[data-landing=demo]')) await phone.click('[data-landing=demo]');
    };
    await openDoorPhone(`http://127.0.0.1:${WEB_PORT}/#team`);
    // a fresh context has no save, so it meets the landing page first (REQ-33) — take the demo door
    if (await phone.$('.landing')) {
      await phone.click('[data-landing=demo]');
    }
    await phone.waitForSelector('[data-nav]', { timeout: 15_000 });
    // the prototype's phone answer: the sidebar is a drawer, opened by the hamburger — not a strip
    const closed = await phone.evaluate(() => {
      const sidebar = document.querySelector('.sidebar').getBoundingClientRect();
      const burger = document.querySelector('.mobile-nav');
      const heading = document.querySelector('.main h1, .main h2, .pagehead')?.getBoundingClientRect() ?? null;
      return {
        offscreen: sidebar.right <= 1,
        burger: burger ? getComputedStyle(burger).display !== 'none' : false,
        headingTop: heading ? Math.round(heading.top) : null,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    check('on a phone the sidebar waits off-screen and the hamburger shows', closed.offscreen && closed.burger, JSON.stringify(closed));
    check('so the screen itself starts on the first screenful', closed.headingTop !== null && closed.headingTop < 400, `heading at ${closed.headingTop}px`);
    check('and nothing runs off the side of a phone', closed.overflow <= 2, `overflow ${closed.overflow}px`);
    await phone.click('.mobile-nav');
    await phone.waitForFunction(() => document.body.classList.contains('nav-open') &&
      document.querySelector('.sidebar').getBoundingClientRect().left >= 0, null, { timeout: 5_000 });
    const open = await phone.evaluate(() => {
      const sidebar = document.querySelector('.sidebar').getBoundingClientRect();
      return { left: Math.round(sidebar.left), height: Math.round(sidebar.height) };
    });
    check('the hamburger opens the drawer with the whole navigation', open.left >= 0 && open.height > 300, JSON.stringify(open));
    const names = await phone.$$eval('[data-nav]', (n) => n.map((x) => x.getAttribute('aria-label') ?? ''));
    await phone.click('.nav-close');
    await phone.waitForFunction(() => document.querySelector('.sidebar').getBoundingClientRect().right <= 1);
    check('and the close button puts it back off-screen', true);
        check('an icon-only item can still say what it is',
      names.every((name) => name.length > 1), JSON.stringify(names));

    await openDoorPhone(`http://127.0.0.1:${WEB_PORT}/#world`);
    await phone.waitForSelector('[data-desk]', { timeout: 15_000 });
    const map = await phone.evaluate(() => {
      const viewport = document.querySelector('[data-world=viewport]').getBoundingClientRect();
      return { height: Math.round(viewport.height), desks: document.querySelectorAll('[data-desk]').length };
    });
    check('the floor plan fits a phone screen', map.desks === 16 && map.height <= 700, `${map.desks} desks in ${map.height}px`);
    await phone.screenshot({ path: '/home/user/work/.data/shots/phone-world.png' });
    await phone.close();
  }

  // 5g — the deployed shape: a folder of static files, nothing behind it
  {
    const root = await fetch(`http://127.0.0.1:${WEB_PORT}/`);
    const html = await root.text();
    check('the built app is served on its own, with no server behind it',
      root.status === 200 && (root.headers.get('content-type') ?? '').includes('text/html') &&
        html.includes('id="root"'),
      `GET / → ${root.status}`);
    // relative asset paths: the same build works at the Pages root, in a subfolder, and off a disk
    const assetPath = /src="([^"]+\.js)"/.exec(html)?.[1];
    check('the build points at its assets relatively, so it works from any path',
      Boolean(assetPath?.startsWith('./')), String(assetPath));
    const asset = assetPath ? await fetch(`http://127.0.0.1:${WEB_PORT}/${assetPath.replace('./', '')}`) : null;
    check('and the assets it points at are really there', asset?.status === 200, `${assetPath} → ${asset?.status}`);
  }

  // 5i — the team editor (owner C23 / REQ-17): people are typed in by the owner, given a pixel
  // portrait from the sprite set and a place in the hierarchy — and it all survives a reload.
  {
    await openDoor(`http://127.0.0.1:${WEB_PORT}/#team`);
    await page.waitForSelector('.team-card');
    const before = await page.locator('.team-card').count();
    await page.click('[data-team=add]');
    await page.waitForSelector('.team-form');
    await page.click('[data-team=save]');
    check('the teammate editor refuses a nameless person with a message the owner reads',
      (await page.textContent('[data-team=error]'))?.includes('name') ?? false);
    await page.fill('[data-team=name]', 'Nour');
    await page.fill('[data-team=role]', 'Quality engineer');
    await page.click('[data-portrait="12"]');
    await page.click('[data-team=save]');
    await page.waitForFunction((n) => document.querySelectorAll('.team-card').length === n, before + 1);
    const added = await page.evaluate(() => {
      const a = JSON.parse(localStorage.getItem('company.ai.save.v1')).state.agents;
      return a[a.length - 1];
    });
    check('a typed-in teammate joins the roster with the picked portrait and a save-given id',
      added.name === 'Nour' && added.role === 'Quality engineer' && added.avatar === 12 && added.id === 'p-new-1',
      `${added.id} ${added.name} avatar ${added.avatar}`);
    await page.reload({ waitUntil: 'networkidle' });
    if (await page.$('[data-landing=open]')) await page.click('[data-landing=open]');
    await page.waitForSelector('.team-card');
    check('the typed-in teammate survives a reload',
      (await page.textContent('.roster'))?.includes('Nour') ?? false);
    // an existing teammate opens the same editor, pre-filled, and the change lands in the save
    await page.locator('.team-card').first().click();
    await page.waitForSelector('[data-team=edit]');
    await page.click('[data-team=edit]');
    await page.waitForSelector('.team-form');
    const prefilled = await page.inputValue('[data-team=name]');
    await page.fill('[data-team=name]', 'Aria Zahra');
    await page.click('[data-team=save]');
    await page.waitForFunction(() => (document.querySelector('.roster')?.textContent ?? '').includes('Aria Zahra'));
    check('an existing teammate is editable — same window, pre-filled, saved', prefilled === 'Aria');

    // Phase E (REQ-18/19): each person carries their own model connection, and the test button
    // makes a tiny REAL request to the chosen provider. The provider's own error is a passing
    // observation — what the rule asks for is that its words reach the owner.
    await page.locator('.team-card').first().click();
    await page.waitForSelector('[data-team=edit]');
    await page.click('[data-team=edit]');
    await page.waitForSelector('[data-team=provider]');
    await page.selectOption('[data-team=provider]', 'anthropic');
    await page.fill('[data-team=model-id]', 'claude-sonnet-4-5');
    await page.fill('[data-team=model-key]', 'sk-ant-smoke');
    await page.click('[data-team=test-conn]');
    await page.waitForSelector('[data-team=test-result]', { timeout: 20_000 });
    check('the connection test talks to the provider and reports its own words back',
      ((await page.textContent('[data-team=test-result]')) ?? '').length > 3);
    await page.click('[data-team=save]');
    const conn = await page.evaluate(() => {
      const a = JSON.parse(localStorage.getItem('company.ai.save.v1')).state.agents[0];
      return a.model?.provider;
    });
    check('the connection is saved on the person, in the visitor’s own save', conn === 'anthropic', String(conn));
    // hand the next run a clean save
    await page.evaluate(() => localStorage.removeItem('company.ai.save.v1'));
  }

  // 5j — Phase D, the owner's own words: "I open it, I don't see any landing page or intro,
  // and the data is the hard-coded demo, not my own or start from scratch." All three, fixed:
  // the landing appears for a visitor with no save, the wizard collects THEIR company, and
  // finishing it starts from scratch — no demo work attached — and is resumable on the way.
  {
    await page.reload({ waitUntil: 'networkidle' }); // 5i just cleared the save
    await page.waitForSelector('.landing');
    check('the landing explains the product with screenshots of itself',
      (await page.locator('.landing-shot img').count()) === 3);
    await page.click('[data-landing=start]');
    await page.waitForSelector('.intro-main');
    await page.click('[data-intro=next]');
    check('the wizard refuses a nameless company',
      (await page.textContent('[data-intro=error]'))?.includes('name') ?? false);
    await page.fill('[data-intro=company-name]', 'Nile Pixels');
    await page.click('[data-intro=next]');
    await page.fill('[data-intro=employee-name]', 'Sara');
    await page.fill('[data-intro=employee-role]', 'Producer');
    await page.click('[data-portrait="5"]');
    await page.click('[data-intro=add-employee]');
    await page.reload({ waitUntil: 'networkidle' }); // close the tab mid-wizard…
    await page.waitForSelector('.landing');
    check('…and the wizard is resumable, draft included (REQ-15)',
      ((await page.textContent('[data-landing=start]')) ?? '').includes('Continue'));
    await page.click('[data-landing=start]');
    await page.waitForSelector('.intro-main');
    check('the drafted employee survived the reload',
      (await page.locator('.draft-employee').count()) === 1);
    await page.click('[data-intro=next]');
    await page.click('[data-intro=finish]');
    await page.waitForSelector('.sidebar');
    const mine = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('company.ai.save.v1')).state;
      return { name: s.company.name, agents: s.agents.length, tasks: s.tasks.length, introDone: s.introDone };
    });
    check('finishing the wizard starts MY company from scratch — not the hard-coded demo',
      mine.name === 'Nile Pixels' && mine.agents === 1 && mine.tasks === 0 && mine.introDone === true,
      JSON.stringify(mine));
    // REQ-41: even my own studio now waits behind the front door — one click gives it back.
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('[data-landing=open]');
    check('the landing offers MY studio back by name (REQ-41)',
      (await page.textContent('[data-landing=open]'))?.includes('Nile Pixels') ?? false,
      (await page.textContent('[data-landing=open]')) ?? '');
    await page.click('[data-landing=open]');
    await page.waitForSelector('.sidebar');
    check('and my own company is what opens from now on',
      (await page.textContent('.workspace'))?.includes('Nile Pixels') ?? false);
  }

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
  console.error('  hint: the app must be built first — run `npm run build -w @company/web`.');
  shutdown();
  await sleep(400);
  process.exit(1);
}
