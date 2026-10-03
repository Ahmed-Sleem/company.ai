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

  // 5 — inbox with a real decision and a working decision commit
  await page.goto(`http://127.0.0.1:${WEB_PORT}/#inbox`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Analytics read access', { timeout: 10_000 });
  check('the inbox lists a decision from the database', true, 'Analytics read access');
  const decisionText = await page.textContent('.decision');
  check('the decision shows its rule and change', decisionText?.includes('access.analytics.read') ?? false);

  // 6 — hygiene
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
