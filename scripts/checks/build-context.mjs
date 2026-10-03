#!/usr/bin/env node
/**
 * Contract §16.1 — "an app may only import from inside its own directory."
 * Fails when a deployable app imports from design/, _research/, docs/ or another app.
 * Workspace packages (@company/*) are compiled in and are fine.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const APPS = ['apps/web', 'services/api', 'services/orchestrator', 'packages'];
const FORBIDDEN_PREFIXES = ['design/', '_research/', 'docs/'];
const FORBIDDEN_CROSS_APP = /from\s+['"](apps\/|services\/)/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === 'test' || entry === 'e2e') continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(entry)) out.push(path);
  }
  return out;
}

const problems = [];
for (const app of APPS) {
  let files;
  try {
    files = walk(app);
  } catch {
    continue;
  }
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const target = match[1];
      if (FORBIDDEN_PREFIXES.some((prefix) => target.startsWith(prefix) || target.includes(`/${prefix}`))) {
        problems.push(`${file} imports ${target}`);
      }
      if (FORBIDDEN_CROSS_APP.test(`from '${target}'`)) {
        problems.push(`${file} imports across apps: ${target}`);
      }
    }
  }
}

if (problems.length) {
  console.error('build context: imports that escape their own directory');
  for (const problem of problems) console.error(`  · ${problem}`);
  process.exit(1);
}
console.log(`build context: no import escapes its app (${relative('.', process.cwd()) || '.'})`);
