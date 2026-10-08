#!/usr/bin/env node
/**
 * The budget-erasure check — "we do not have something called budget in this product"
 * (owner, 2026-10-08, REQ-32). Scans everything a user can see — the views, the components,
 * the string table and the prototype's world tab — for the vocabulary. The server-side schema
 * keeps its columns until the server itself retires (phase C); this check guards the surface.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const targets = [
  ...readdirSync(join(root, 'apps/web/src/views')).map((f) => `apps/web/src/views/${f}`),
  ...readdirSync(join(root, 'apps/web/src/components')).map((f) => `apps/web/src/components/${f}`),
  'apps/web/src/lib/i18n.ts',
  'design/prototype/world.js',
].filter((f) => existsSync(join(root, f)) && /\.(tsx?|js)$/.test(f));

const banned = /\bbudget\b|\bspend\b|\bspent\b|\bspending\b/i;
const hits = [];
for (const file of targets) {
  const lines = readFileSync(join(root, file), 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (banned.test(line)) hits.push(`${file}:${i + 1}: ${line.trim().slice(0, 90)}`);
  });
}

if (hits.length) {
  console.error(`no-budget: ${hits.length} hit(s) — the product has no budget`);
  for (const hit of hits) console.error(`  · ${hit}`);
  process.exit(1);
}
console.log('no-budget: the product surface is budget-free');
