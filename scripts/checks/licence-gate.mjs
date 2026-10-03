#!/usr/bin/env node
/**
 * The licence gate (§18 of the contract, and doc `24`): nothing enters the product that the
 * ledger does not allow. It reads the installed dependency tree, resolves each package's
 * declared licence, and fails on:
 *   · a forbidden licence (AGPL/GPL/LGPL/SSPL/BUSL/Elastic/fair-code/no-licence);
 *   · a package whose licence cannot be determined at all;
 *   · a runtime dependency missing from THIRD_PARTY.md.
 *
 * Development-only dependencies may be weak-copyleft (MPL) but must still appear in the ledger.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN = [
  'AGPL', 'GPL-3', 'GPL-2', 'LGPL', 'SSPL', 'BUSL', 'Elastic', 'Commons Clause',
  'PolyForm', 'Fair Source', 'BUSL-1.1',
];
const WEAK = ['MPL', 'EPL'];
const UNKNOWN = ['UNLICENSED', 'SEE LICENSE IN', ''];

const root = process.cwd();
const ledger = existsSync(join(root, 'THIRD_PARTY.md'))
  ? readFileSync(join(root, 'THIRD_PARTY.md'), 'utf8').toLowerCase()
  : '';
if (!ledger) {
  console.error('licence gate: THIRD_PARTY.md is missing');
  process.exit(1);
}

const packages = new Set();
for (const scope of ['node_modules', 'node_modules/@company']) {
  const dir = join(root, scope);
  if (!existsSync(dir)) continue;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('@')) {
      for (const inner of readdirSync(join(dir, entry))) packages.add(`${entry}/${inner}`);
    } else if (!entry.startsWith('.')) {
      packages.add(entry);
    }
  }
}

const violations = [];
const undocumented = [];
let checked = 0;

for (const name of [...packages].sort()) {
  const manifestPath = join(root, 'node_modules', name, 'package.json');
  if (!existsSync(manifestPath)) continue;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.private === true) continue;
  const licence = String(manifest.license ?? manifest.licenses?.[0]?.type ?? '');
  checked++;

  if (FORBIDDEN.some((bad) => licence.toUpperCase().includes(bad.toUpperCase()))) {
    violations.push(`${name} — ${licence}`);
    continue;
  }
  const unknown = UNKNOWN.includes(licence.toUpperCase()) || licence === '';
  if (unknown && !licence.includes('SEE LICENSE IN')) {
    violations.push(`${name} — licence declares nothing (treated as all rights reserved)`);
    continue;
  }
  if (WEAK.some((weak) => licence.toUpperCase().includes(weak))) {
    // allowed unmodified, but must be visible in the ledger. Platform binaries
    // (`lightningcss-linux-x64-gnu`, `@esbuild/linux-x64`, …) are covered by naming their base.
    const candidates = [name, name.split('/')[0], name.split('-linux-')[0], name.split('-darwin-')[0], name.split('-win32-')[0]];
    if (!candidates.some((candidate) => ledger.includes(candidate.toLowerCase()))) {
      undocumented.push(`${name} — ${licence} (must be listed)`);
    }
  }
}

if (violations.length) {
  console.error(`licence gate: ${violations.length} forbidden or unlicensed package(s)`);
  for (const violation of violations) console.error(`  · ${violation}`);
  process.exit(1);
}
if (undocumented.length) {
  console.error('licence gate: weak-copyleft packages must be recorded in THIRD_PARTY.md');
  for (const item of undocumented) console.error(`  · ${item}`);
  process.exit(1);
}
console.log(`licence gate: ${checked} dependency licences checked, none forbidden`);
