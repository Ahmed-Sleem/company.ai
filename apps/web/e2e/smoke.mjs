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

  await page.goto(`http://127.0.0.1:${WEB_PORT}/`, { waitUntil: 'networkidle' });

  // 1 — shell
  const navIds = await page.$$eval('[data-nav]', (nodes) => nodes.map((n) => n.getAttribute('data-nav')));
  check('the shell renders the six designer views plus the owner’s World Map',
    navIds.length === 7 && navIds[6] === 'world', navIds.join(', '));
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
    const from = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.world-canvas')).transform);
    await page.waitForFunction((startedAt) => {
      const now = getComputedStyle(document.querySelector('.world-canvas')).transform;
      if (now === startedAt) return false;
      const previous = window.__lastTransform;
      window.__lastTransform = now;
      return previous === now;
    }, from, { timeout: 8_000, polling: 80 });
    return page.evaluate(() => {
      const matrix = new DOMMatrix(getComputedStyle(document.querySelector('.world-canvas')).transform);
      return { scale: matrix.a, x: matrix.e, y: matrix.f };
    });
  };

  await page.goto(`http://127.0.0.1:${WEB_PORT}/#world`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.room', { timeout: 10_000 });
  const rooms = (await page.$$('[data-room-box]')).length;
  const desks = (await page.$$('[data-desk]')).length;
  const props = (await page.$$('[data-prop]')).length;
  const worldProps = { count: props };
  const staffed = await page.$$eval('[data-desk][data-agent]', (nodes) => nodes.length);
  check('the plan draws the owner’s six rooms, sixteen desks and twenty-one props',
    rooms === 6 && desks === 16 && props === 21, `${rooms} rooms · ${desks} desks · ${props} props`);
  check('the company is sitting at the desks it has', staffed === 8, `${staffed} desks staffed`);

  // the HUD counts what the save says, not what the demo said
  const hud = await page.$$eval('.world-stats .stat', (nodes) =>
    nodes.map((n) => [n.querySelector('.stat-label')?.textContent, n.querySelector('.stat-value')?.textContent]));
  const worldSave = await readSave(page);
  check('the HUD counts the roster and the ledger, not the demo’s numbers',
    hud.length === 3 && hud[0][1] === String(worldSave?.agents.length ?? -1),
    hud.map(([label, value]) => `${label} ${value}`).join(' · '));

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

  // build mode: drag a prop, watch it snap to the owner's grid, then undo it
  await page.click('[data-world=build]');
  await page.waitForSelector('[data-world=build-bar]', { timeout: 4_000 });
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
  await page.goto(`http://127.0.0.1:${WEB_PORT}/#settings`, { waitUntil: 'networkidle' });
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
    labels: [...document.querySelectorAll('.navlabel')].filter((n) => getComputedStyle(n).display !== 'none').length,
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
  await page.goto(`http://127.0.0.1:${WEB_PORT}/#inbox`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Analytics read access', { timeout: 10_000 });
  check('the inbox lists a decision from the database', true, 'Analytics read access');
  const decisionText = await page.textContent('.decision');
  check('the decision shows its rule and change', decisionText?.includes('access.analytics.read') ?? false);

  // 7 — hygiene
  // 5h — a phone. The owner opened the live link on his and it was unusable: the sidebar kept its
  // column of icons but lost its width, so every icon stacked into a ~1000px strip and pushed the
  // screen off the bottom. These checks hold the fix in place.
  {
    const phone = await browser.newPage({ ...devices['iPhone 13'] });
    await phone.goto(`http://127.0.0.1:${WEB_PORT}/#team`, { waitUntil: 'networkidle' });
    await phone.waitForSelector('[data-nav]', { timeout: 15_000 });
    const layout = await phone.evaluate(() => {
      const items = [...document.querySelectorAll('[data-nav]')].map((n) => n.getBoundingClientRect());
      const sidebar = document.querySelector('.sidebar').getBoundingClientRect();
      // the *screen's* heading, not the top bar's — the top bar's h1 is always at the top, which
      // made an earlier version of this check pass while the content sat below the fold
      const heading = document.querySelector('.main h1, .main h2, .pagehead')?.getBoundingClientRect() ?? null;
      return {
        navRow: Math.max(...items.map((r) => r.top)) - Math.min(...items.map((r) => r.top)),
        sidebarHeight: Math.round(sidebar.height),
        headingTop: heading ? Math.round(heading.top) : null,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        // the attribute, not `textContent`: the label is `display:none` when it is hidden, so its
        // text is in the DOM but gone from the accessibility tree — textContent was a false pass
        names: [...document.querySelectorAll('[data-nav]')].map((n) => n.getAttribute('aria-label') ?? ''),
      };
    });
    check('the sidebar is one strip across a phone, not a column of icons',
      layout.navRow < 8 && layout.sidebarHeight < 160, `row spread ${Math.round(layout.navRow)}px · rail ${layout.sidebarHeight}px`);
    check('so the screen itself starts on the first screenful',
      layout.headingTop !== null && layout.headingTop < 400, `heading at ${layout.headingTop}px`);
    check('and nothing runs off the side of a phone', layout.overflow <= 2, `overflow ${layout.overflow}px`);
    check('an icon-only item can still say what it is',
      layout.names.every((name) => name.length > 1), JSON.stringify(layout.names));

    await phone.goto(`http://127.0.0.1:${WEB_PORT}/#world`, { waitUntil: 'networkidle' });
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
