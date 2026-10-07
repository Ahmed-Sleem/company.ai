/**
 * The server: dev uses PGlite (no install), production uses DATABASE_URL.
 * Model calls go to the mock adapter unless provider keys are configured — so the product
 * always runs, and never spends money by accident.
 *
 * It also serves the built app when there is one (`STATIC_DIR`, or `apps/web/dist` if that exists),
 * so the product is **one service**: one URL, one origin, no CORS, no second dashboard. See
 * `static.ts` for why. An API-only run is the same command with no build present.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { staticSite } from './static.js';
import { createPgliteDb, createPgDb, seed } from '@company/company';
import { createGateway, dbRegistry, mockAdapter, openAiCompatAdapter } from '@company/gateway';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 8787);
const databaseUrl = process.env.DATABASE_URL;

const { db, close } = databaseUrl
  ? await createPgDb(databaseUrl)
  : await createPgliteDb(process.env.PGLITE_DIR ?? '.data/pglite');

// Seed once, on an empty database — the demo's company.
const { firstCompany } = await import('@company/company');
if (!(await firstCompany(db))) {
  await seed(db);
  console.log('[api] seeded the demo company');
}

const adapters = new Map();
const baseUrl = process.env.LITELLM_URL;
if (baseUrl) {
  const adapter = openAiCompatAdapter({
    id: 'litellm',
    provider: 'openai',
    baseUrl,
    ...(process.env.LITELLM_KEY ? { apiKey: process.env.LITELLM_KEY } : {}),
  });
  adapters.set('openai', adapter);
  adapters.set('anthropic', adapter);
} else {
  const mock = mockAdapter();
  adapters.set('openai', mock);
  adapters.set('anthropic', mock);
  adapters.set('open', mock);
  console.log('[api] no LITELLM_URL — using the offline mock provider (no spend)');
}

const gateway = createGateway({ db, registry: dbRegistry(db), adapters });
const app = createApp({ db, gateway });

// The API owns `/api/*`; everything else is the app, when a build is present.
const staticDir = process.env.STATIC_DIR ?? (existsSync('apps/web/dist/index.html') ? 'apps/web/dist' : null);
const root = new Hono();
root.route('/', app);
if (staticDir) root.use('*', staticSite(resolve(staticDir)));

serve({ fetch: root.fetch, port, hostname: '0.0.0.0' }, (info) => {
  console.log(`[api] listening on http://0.0.0.0:${info.port}`);
  if (staticDir) {
    console.log(`[api] serving the built app from ${resolve(staticDir)} — open this port, not the dev server`);
  } else {
    console.log('[api] no build found (apps/web/dist) — API only; the app runs on the dev server');
  }
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await close();
    process.exit(0);
  });
}
