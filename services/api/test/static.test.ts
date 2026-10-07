/**
 * The static side of the server: the rules that make one service host the whole product.
 *
 * Every one of these is a rule someone will be tempted to change later — "why is index.html never
 * cached", "why does a wrong URL return the app instead of a 404" — so they are written down as
 * tests rather than as intentions. The first one is not a style question: a static handler that
 * lets `..` climb out of its root serves the server's own files, and that is a disclosure bug.
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { staticSite } from '../src/static.js';

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'company-os-site-'));
  writeFileSync(join(root, 'index.html'), '<!doctype html><title>the app</title>');
  mkdirSync(join(root, 'assets'));
  writeFileSync(join(root, 'assets', 'index-abc123.js'), 'console.log("built")');
  writeFileSync(join(root, 'assets', 'index-abc123.css'), '.a{color:red}');
  writeFileSync(join(root, 'Pixelify.woff2'), 'font-bytes');
  // a file *outside* the served root, to be reached for and not found
  writeFileSync(join(root, '..', 'company-os-secret.txt'), 'must never be served');
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

function server() {
  const app = new Hono();
  app.get('/api/health', (c) => c.json({ ok: true }));
  app.use('*', staticSite(root));
  return app;
}

describe('serving the built app from the API', () => {
  it('the root is the app', async () => {
    const response = await server().request('/');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('the app');
    expect(response.headers.get('content-type')).toContain('text/html');
  });

  it('a URL the app knows but the disk does not gets the app, not a 404', async () => {
    // Every screen has its own address, and a reload on one must not 404.
    const response = await server().request('/some/deep/address');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('the app');
  });

  it('the API keeps its own paths', async () => {
    const response = await server().request('/api/health');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('a hashed asset is cached for a year; index.html is never cached', async () => {
    const asset = await server().request('/assets/index-abc123.js');
    expect(asset.status).toBe(200);
    expect(asset.headers.get('cache-control')).toContain('immutable');
    expect(asset.headers.get('content-type')).toContain('text/javascript');

    const page = await server().request('/');
    // This is the rule that makes a deployment actually reach a returning visitor: the page names
    // the current bundle, so a cached page would keep pointing at the old one.
    expect(page.headers.get('cache-control')).toBe('no-cache');
  });

  it('a file type it knows is typed; one it does not is bytes, not a guess', async () => {
    expect((await server().request('/Pixelify.woff2')).headers.get('content-type')).toBe('font/woff2');
    const css = await server().request('/assets/index-abc123.css');
    expect(css.headers.get('content-type')).toContain('text/css');
  });

  it('a path that climbs out of the root is not served', async () => {
    // Encoded and raw, because both reach the handler.
    for (const path of ['/../company-os-secret.txt', '/..%2Fcompany-os-secret.txt', '/assets/../../company-os-secret.txt']) {
      const response = await server().request(path);
      const body = await response.text();
      expect(body, path).not.toContain('must never be served');
    }
  });

  it('HEAD answers without a body, and a write is not the static handler’s business', async () => {
    const head = await server().request('/', { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');

    const post = await server().request('/', { method: 'POST' });
    expect(post.status).toBe(404); // nothing else answers it — the static handler stayed out
  });
});
