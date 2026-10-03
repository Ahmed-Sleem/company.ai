#!/usr/bin/env node
/**
 * Law 5 — "RTL is a first-class layout, not a translation."
 * Fails on physical horizontal properties in our CSS: left/right, margin-left/right,
 * padding-left/right, border-left/right, inset-inline is fine, text-align:left|right is not.
 * (Vertical `top`/`bottom` are direction-neutral and allowed.)
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const files = execSync(
  `find apps/web/src packages -type f -name '*.css' -not -path '*/node_modules/*' ` +
    `-not -path '*/generated/*' -not -path '*/dist/*'`,
  { encoding: 'utf8' },
).trim().split('\n').filter(Boolean);

const PHYSICAL = [
  /\b(?:margin|padding|border)-(?:left|right)\b/g,
  /(?<!inset-)\bleft\s*:/g,
  /\bright\s*:/g,
  /\btext-align\s*:\s*(?:left|right)\b/g,
];

const problems = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    for (const pattern of PHYSICAL) {
      for (const match of line.matchAll(pattern)) {
        problems.push(`${file}:${index + 1} physical property ${match[0].trim()}`);
      }
    }
  });
}

if (problems.length) {
  console.error(`logical properties: ${problems.length} physical rule(s) in CSS`);
  for (const problem of problems) console.error(`  · ${problem}`);
  process.exit(1);
}
console.log(`logical properties: ${files.length} CSS files use logical properties only`);
