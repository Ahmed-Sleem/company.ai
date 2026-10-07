/**
 * The built app, served by the same process that serves the API.
 *
 * Why this file exists: the product deploys as **one service**. The web app and the API were always
 * one thing in the browser's eyes — the dev server proxies `/api` to the API, so the page only ever
 * talks to its own origin — but in deployment they were two hosts, which would have meant CORS, two
 * dashboards, two cold starts and a build setting that has to be kept in step with the API's address.
 * Serving `apps/web/dist` from the API removes all of that: one URL, one origin, nothing to
 * configure, and the demo file's own promise ("in the browser only, no server") stays a property of
 * the demo, not of the product.
 *
 * It is written against `node:fs` rather than a framework's static middleware on purpose: the rules
 * below are the whole contract — which files are cached for how long, and that any unknown path is
 * the app rather than a 404 — and a dependency-free version keeps those rules visible and testable.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, normalize, resolve, sep } from 'node:path';
import type { MiddlewareHandler } from 'hono';

/**
 * What the build actually emits. Adding a file type to the app's assets means adding it here; an
 * unknown extension is served as `application/octet-stream` rather than guessed at.
 */
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.wasm': 'application/wasm',
};

const extensionOf = (path: string) => {
  const at = path.lastIndexOf('.');
  return at === -1 ? '' : path.slice(at).toLowerCase();
};

/**
 * Cache policy, in one place:
 *
 *   · `/assets/*` — Vite writes a content hash into every file name, so a given URL never changes
 *     meaning. Cached for a year, immutable.
 *   · `index.html` — never cached. This is the file that names the current bundle: caching it is
 *     how a deployment "does not take" for a returning visitor.
 *   · anything else — an hour, revalidated.
 */
function cacheFor(pathname: string) {
  if (pathname.startsWith('/assets/')) return 'public, max-age=31536000, immutable';
  if (pathname.endsWith('.html') || pathname === '/') return 'no-cache';
  return 'public, max-age=3600';
}

/**
 * Serve `root` for every path that is not the API's.
 *
 * The single-page rule: a path that is not a file on disk gets `index.html`, because every screen in
 * this app is reached by its own address (`#world`, `#settings`) and a reload there must not 404.
 * Mount this **after** the API routes; it answers last, and it never answers for `/api/*`.
 */
export function staticSite(root: string): MiddlewareHandler {
  const base = resolve(root);
  const index = join(base, 'index.html');
  const missing = !existsSync(index);

  return async (c, next) => {
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') return next();
    if (missing) return next();
    if (c.req.path.startsWith('/api/')) return next();

    let pathname: string;
    try {
      pathname = decodeURIComponent(c.req.path);
    } catch {
      return next(); // malformed percent-encoding is not ours to interpret
    }
    if (pathname.endsWith('/')) pathname += 'index.html';

    // Two locks, and the test proves the pair, not each alone (observed: with a naive
    // `join(base, pathname)` the file outside the root IS served and the test fails; with plain
    // `normalize` but no containment check it is not served, because `normalize('/../x')` is
    // `/x` on POSIX). Keep both: `normalize` collapses the path, and the check below is what makes
    // that a guarantee rather than a property of the platform.
    const candidate = resolve(base, normalize(pathname).replace(/^([/\\])+/, ''));
    const inside = candidate === base || candidate.startsWith(base + sep);
    const wanted = inside && existsSync(candidate) && statSync(candidate).isFile() ? candidate : index;

    const body = readFileSync(wanted);
    const type = TYPES[extensionOf(wanted)] ?? 'application/octet-stream';
    const served = wanted === index ? '/index.html' : pathname;
    const headers: Record<string, string> = {
      'content-type': type,
      'content-length': String(body.byteLength),
      'cache-control': cacheFor(served),
      // The app is its own thing; nothing here should be framed by someone else.
      'x-content-type-options': 'nosniff',
    };
    return new Response(c.req.method === 'HEAD' ? null : body, { headers });
  };
}
