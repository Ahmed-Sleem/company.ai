#!/usr/bin/env node
/**
 * Law 6 — "The namespace lock."
 *
 * Ids in this product are opaque UUIDs. Nothing anywhere may read meaning out of them.
 * Forbidden, in product code (each package's src, each service's src, the web app's src):
 * (written without a slash-star sequence so it cannot end this comment early)
 *
 *   · decoding a vendor prefix or an identifier kind out of an id string;
 *   · generating an id out of the current time / a random suffix / a counter
 *     (the database generates ids; that is the one place they come from);
 *   · slicing, truncating or re-casing an id to present it to a person. A display ref
 *     (TSK-142) is a real column with a real value, never arithmetic on a UUID.
 *
 * A line may opt out with an explicit comment `// namespace-lock: allow` and a reason on it —
 * deliberate, greppable, and never silent.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['packages', 'services', 'apps/web/src'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'generated', 'test', 'e2e', 'migrations', 'meta']);
const ALLOW = /namespace-lock:\s*allow/;

const RULES = [
  { id: 'decode-prefix', pattern: /\b(?:id|ref)([A-Z_]*)\.split\(['"`]_/, why: 'reads a vendor prefix out of an id' },
  { id: 'decode-prefix-fn', pattern: /\bdecode(?:Vendor)?Prefix|\bcreateVendorId|\bgenerateCustomId|\bcreatePrefixedId/, why: 'a prefixed-id helper belongs to a closed, rejected design' },
  { id: 'id-from-time', pattern: /\bid\s*:\s*`?[^`;]*\$\{[^}]*Date\.now\(\)/, why: 'builds an id from the clock' },
  { id: 'id-from-random', pattern: /\b(?:id|ref)\b\s*[:=]\s*[^;]*(?:Math\.random\(\)|toString\(36\)|crypto\.randomUUID)/, why: 'generates an id instead of letting the database do it' },
  { id: 'id-from-counter', pattern: /\b(?:id|ref)\b\s*[:=]\s*[^;]*(?:\+\+|nextId|counter)/, why: 'generates an id from a counter' },
  // A slice applied directly to an id-shaped expression. Deliberately narrow: truncating an
  // error body or a log line is not the same thing, and a false positive makes a check useless.
  { id: 'id-truncated-for-display', pattern: /\b\w*[Ii]d\b(?:\.\w+)?\s*\.\s*(?:slice|substring|substr)\(\s*0\s*,\s*\d+/, why: 'presents a truncated id to a person; use a real display ref' },
  { id: 'id-shaped-ref', pattern: /\b(?:shortRef|ref)\b\s*\?\?\s*[^;\n]*\.(?:slice|substring|substr)\(/, why: 'guesses a display ref from an id' },
  { id: 'kind-from-id-length', pattern: /\b(?:isAgent|isTask|isDecision|looksLike\w*)\s*\(\s*\w*[Ii]d\b[^)]*\.length/, why: 'infers a record kind from an id' },
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || entry.endsWith('.d.ts')) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx|mjs)$/.test(entry)) out.push(path);
  }
  return out;
}

const files = ROOTS.flatMap((root) => {
  try {
    return walk(root);
  } catch {
    return [];
  }
});

const problems = [];
let scanned = 0;
for (const file of files) {
  scanned++;
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    const code = line.split('//')[0];
    if (ALLOW.test(line) || ALLOW.test(lines[index - 1] ?? '')) return;
    for (const rule of RULES) {
      if (rule.pattern.test(code)) {
        problems.push(`${file}:${index + 1} ${rule.id} — ${rule.why}`);
      }
    }
  });
}

if (problems.length) {
  console.error(`namespace lock: ${problems.length} place(s) read meaning out of an id`);
  for (const problem of problems) console.error(`  · ${problem}`);
  process.exit(1);
}
console.log(`namespace lock: ${scanned} files, ids are opaque everywhere`);
