#!/usr/bin/env node
/**
 * Law 1 — "No raw values."
 *
 * Fails when a colour or length literal appears where a token should be:
 *   · in our CSS (any hex/rgb/hsl colour, any px/rem length except 0 and 1px hairlines in
 *     the token rules themselves — those live in generated/, which is excluded);
 *   · in TSX/TS as hex colours or arbitrary Tailwind values (`p-[13px]`, `text-[#fff]`).
 *
 * Numbers that are data (cents, token counts, percentages) are not CSS values and are
 * allowed — the check only looks at style-shaped positions.
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const roots = ['apps/web/src', 'packages', 'services'];
const files = execSync(
  `find ${roots.join(' ')} -type f \\( -name '*.css' -o -name '*.tsx' -o -name '*.ts' \\) ` +
    `-not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/generated/*' -not -path '*/test/*'`,
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean);

/**
 * The one file allowed to hold colour literals: `lib/accent.ts` is the colour *maths* — it parses
 * hex, mixes it and measures contrast, so literals are its subject rather than a shortcut around the
 * tokens. The exception is a list of one, written here, so allowing a second file means editing this
 * checker — and the file must say so itself, or the exception does not apply.
 */
const COLOUR_MATHS = new Set(['apps/web/src/lib/accent.ts']);
const COLOUR_MATHS_MARKER = 'raw-values: colour-maths exception';

const problems = [];

const COLORS = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/gi;
// lengths only when written as a CSS value: `12px`/`1.5rem` NOT followed/preceded by letters
const LENGTHS = /(?<![\w-])(\d*\.?\d+)(px|rem|em)(?![\w-])/gi;
const ARBITRARY_TAILWIND = /\b[a-z-]+-\[[^\]]*(px|rem|em|#)[^\]]*\]/g;

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  // Same treatment as the design gate (design/prototype/verify.mjs check 4):
  // the token block itself, comments, and @media conditions are stripped — media-query
  // breakpoints are a platform constraint (custom properties cannot appear there).
  const source = file.endsWith('.css')
    ? raw.replace(/:root\{[\s\S]*?\n\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/@media[^{]*/g, '')
    : raw;
  const lines = source.split('\n');
  const isCss = file.endsWith('.css');
  const coloursAllowed = COLOUR_MATHS.has(file);
  if (coloursAllowed && !raw.includes(COLOUR_MATHS_MARKER)) {
    problems.push(`${file} is on the colour-maths list but does not say so (${COLOUR_MATHS_MARKER})`);
  }
  lines.forEach((line, index) => {
    const where = isCss ? file : `${file}:${index + 1}`;
    const trimmed = line.trim();
    if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) return;

    if (isCss) {
      for (const match of line.matchAll(COLORS)) problems.push(`${where} raw colour ${match[0]}`);
      for (const match of line.matchAll(LENGTHS)) {
        const value = Number(match[1]);
        if (value === 0) continue; // zero is unit-free by definition
        problems.push(`${where} raw length ${match[0]}`);
      }
    } else {
      if (!coloursAllowed) for (const match of line.matchAll(COLORS)) problems.push(`${where} raw colour ${match[0]}`);
      for (const match of line.matchAll(ARBITRARY_TAILWIND)) {
        problems.push(`${where} arbitrary Tailwind value ${match[0]}`);
      }
    }
  });
}

if (problems.length) {
  console.error(`raw values: ${problems.length} problem(s)`);
  for (const problem of problems.slice(0, 40)) console.error(`  · ${problem}`);
  process.exit(1);
}
console.log(`raw values: ${files.length} files clean (tokens only)`);
