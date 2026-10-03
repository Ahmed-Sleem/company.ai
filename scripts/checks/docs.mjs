#!/usr/bin/env node
/**
 * The development-requirements check: the project's required documents exist and the
 * append-only log has not been rewritten into a summary.
 */
import { existsSync, readFileSync } from 'node:fs';

const required = {
  '_research/dev-docs/THINGS_DONE.md': 'append-only completed-work log',
  '_research/dev-docs/SUPPORTING_NOTES.md': 'merged special notes',
  '_research/dev-docs/PROJECT_MAP.md': 'human-readable map of the project',
  '_research/dev-docs/README.md': 'where to start',
  '_research/24-mix-and-match-inventory.md': 'the reuse plan',
  'THIRD_PARTY.md': 'the licence ledger',
  'README.md': 'the project README',
};
const plan = ['_research/19-plan-what-remains.md', '_research/dev-docs/IMPLEMENTATION_PLAN.md'];

const missing = Object.entries(required).filter(([file]) => !existsSync(file)).map(([file, why]) => `${file} (${why})`);
if (!plan.some((file) => existsSync(file))) missing.push('an implementation plan document');

const log = '_research/dev-docs/THINGS_DONE.md';
if (existsSync(log)) {
  const entries = readFileSync(log, 'utf8').match(/^## /gm)?.length ?? 0;
  if (entries < 5) missing.push(`${log} — only ${entries} entries; the log looks rewritten, not appended`);
}

if (missing.length) {
  console.error('docs: missing or unhealthy');
  for (const item of missing) console.error(`  · ${item}`);
  process.exit(1);
}
console.log('docs: required documents present, done-log append-only');
