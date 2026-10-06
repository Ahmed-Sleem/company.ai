#!/usr/bin/env node
/**
 * Extracts the designer's portrait library from the demo into a data module.
 *
 * The demo draws each person as a pixel-art SVG; the paths are the designer's own artwork and are
 * far too large to retype. They are lifted out of the demo file verbatim, so the product shows the
 * designer's faces rather than a substitute. The demo file itself is never written to.
 *
 * Usage: node scripts/gen-demo-avatars.mjs [--check]
 *   (no flag) write apps/web/src/lib/avatars.data.ts
 *   --check    exit 1 if the committed module and the demo disagree
 */
import { readFileSync, writeFileSync } from 'node:fs';

const DEMO = new URL('../design/designer-demo/ai-company-os.html', import.meta.url);
const OUT = new URL('../apps/web/src/lib/avatars.data.ts', import.meta.url);

/** The `const AVATARS=[…]` array in the demo, parsed. */
export function readDemoAvatars(source = readFileSync(DEMO, 'utf8')) {
  const start = source.indexOf('const AVATARS=[');
  if (start === -1) throw new Error('the demo no longer contains `const AVATARS=[`');
  let depth = 0;
  let end = -1;
  for (let i = start + 'const AVATARS='.length; i < source.length; i += 1) {
    if (source[i] === '[') depth += 1;
    else if (source[i] === ']') {
      depth -= 1;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end === -1) throw new Error('the AVATARS array is not closed');
  const rows = JSON.parse(source.slice(start + 'const AVATARS='.length, end));
  return rows.map((row) => {
    if (typeof row?.id !== 'string' || typeof row?.grid !== 'number' || typeof row?.path !== 'string') {
      throw new Error(`unexpected portrait shape: ${JSON.stringify(row).slice(0, 80)}`);
    }
    return { id: row.id, grid: row.grid, path: row.path };
  });
}

function render(rows) {
  const body = rows
    .map((row) => `  { id: ${JSON.stringify(row.id)}, grid: ${row.grid}, path: ${JSON.stringify(row.path)} },`)
    .join('\n');
  return `/**
 * GENERATED FILE — do not edit.
 *
 * The designer's portrait library, extracted verbatim from
 * \`design/designer-demo/ai-company-os.html\` by \`node scripts/gen-demo-avatars.mjs\`.
 * \`apps/web/test/avatars.test.ts\` fails if this file and the demo disagree, and every agent's
 * \`avatar\` column is an index into this list (the demo stores indices the same way).
 */
export interface DemoPortrait {
  id: string;
  /** The viewBox grid the path was drawn on. */
  grid: number;
  /** SVG path data, drawn with \`shape-rendering="crispEdges"\`. */
  path: string;
}

export const PORTRAITS: DemoPortrait[] = [
${body}
];
`;
}

export function build(source) {
  return render(readDemoAvatars(source));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check');
  const rendered = build();
  if (check) {
    const current = readFileSync(OUT, 'utf8');
    if (current !== rendered) {
      console.error('avatars.data.ts no longer matches the demo — run: node scripts/gen-demo-avatars.mjs');
      process.exit(1);
    }
    console.log(`avatars.data.ts matches the demo (${readDemoAvatars().length} portraits)`);
  } else {
    writeFileSync(OUT, rendered);
    console.log(`wrote avatars.data.ts — ${readDemoAvatars().length} portraits`);
  }
}
