/**
 * The palettes are borrowed, so they must stay borrowed.
 *
 * `design/tokens/company-os-palettes.json` holds five presets that were lifted from the owner's
 * demo. This file reads that demo — `design/owner-demo/acme-studio-os.html`, never edited — and
 * compares it with our committed copy value by value, the same way `parity.test.ts` locks the
 * team/tasks screens against the designer's demo. If either side moves, this fails and names the
 * colour.
 *
 * The comparison is a plain function so a mutant can be fed to it: a check nobody has watched
 * fail is not a check (rules §18.2).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SRC_CSS, SRC_PALETTES, buildContext, loadPalettes, type PaletteDoc } from '../src/generate.mjs';

const REPO = join(import.meta.dirname, '..', '..', '..');
const OWNER_DEMO = join(REPO, 'design/owner-demo/acme-studio-os.html');



/** Read `const PALETTES={…}` out of the owner's demo, as data. */
export function demoPalettes(html = readFileSync(OWNER_DEMO, 'utf8')): PaletteDoc {
  const at = html.indexOf('const PALETTES=');
  if (at === -1) throw new Error('owner demo: PALETTES not found — the borrow source moved');
  const open = html.indexOf('{', at);
  let depth = 0;
  let end = -1;
  for (let i = open; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) throw new Error('owner demo: PALETTES is unterminated');
  const literal = html.slice(open, end + 1)
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
    .replace(/'([^']*)'/g, '"$1"');
  const parsed = JSON.parse(literal) as Record<string, any>;
  const presets: PaletteDoc['presets'] = {};
  for (const [id, value] of Object.entries(parsed)) {
    presets[id] = { chip: value.color, dark: value.dark, light: value.light };
  }
  return { keys: Object.keys(presets.sage?.dark ?? {}), presets };
}

/**
 * Every disagreement between our committed copy and the demo. Empty means they agree.
 *
 * Presets the demo has and we deliberately do not borrow are listed — with a reason — in our
 * own file (`notBorrowed`), so an omission is a decision that is written down, and a *new*
 * preset appearing in the demo is still reported.
 */
export function comparePalettes(ours: PaletteDoc, theirs: PaletteDoc) {
  const problems: string[] = [];
  const skipped = Object.keys(ours.notBorrowed ?? {});
  const ourIds = Object.keys(ours.presets);
  const theirIds = Object.keys(theirs.presets);
  const expectedTheirs = [...ourIds, ...skipped];
  if (expectedTheirs.join(',') !== theirIds.join(',')) {
    problems.push(
      `palette list differs: ours ${ourIds.join(', ')}${skipped.length ? ` (+ not borrowed: ${skipped.join(', ')})` : ''} — demo ${theirIds.join(', ')}`,
    );
  }
  for (const id of skipped) {
    if (!(id in theirs.presets)) problems.push(`notBorrowed lists ${id}, which the demo no longer has`);
  }
  for (const id of ourIds) {
    const mine = ours.presets[id]!;
    const them = theirs.presets[id]!;
    if (!them) continue;
    for (const mode of ['dark', 'light'] as const) {
      const mineVals = mine[mode];
      const theirVals = them[mode];
      if (!mineVals && !theirVals) continue;
      if (!mineVals || !theirVals) { problems.push(`${id}.${mode}: declared in only one of the two files`); continue; }
      for (const key of ours.keys) {
        const a = String(mineVals[key] ?? '').toLowerCase();
        const b = String(theirVals[key] ?? '').toLowerCase();
        if (a !== b) problems.push(`${id}.${mode}.${key}: ours ${a || '(absent)'} — demo ${b || '(absent)'}`);
      }
    }
  }
  return problems;
}

describe('the borrowed palettes still match the owner’s demo', () => {
  const ours = JSON.parse(readFileSync(SRC_PALETTES, 'utf8')) as PaletteDoc;
  const theirs = demoPalettes();

  it('reads the palette block out of the demo at all', () => {
    expect(Object.keys(theirs.presets)).toEqual(['sage', 'ocean', 'violet', 'amber', 'rose', 'custom']);
    expect(theirs.presets.ocean!.dark).toBeTruthy();
  });

  it('agrees with the demo on every colour of every preset, in both themes', () => {
    expect(comparePalettes(ours, theirs)).toEqual([]);
  });

  it('OBSERVED FAILING: a changed colour in our copy is reported, naming the token', () => {
    const mutant = JSON.parse(JSON.stringify(ours)) as PaletteDoc;
    mutant.presets.ocean!.dark!.accent = '#ff00ff';
    const problems = comparePalettes(mutant, theirs);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toBe(`ocean.dark.accent: ours #ff00ff — demo ${theirs.presets.ocean!.dark!.accent}`);
  });

  it('OBSERVED FAILING: a dropped preset is reported', () => {
    const mutant = JSON.parse(JSON.stringify(ours)) as PaletteDoc;
    delete mutant.presets.rose;
    expect(comparePalettes(mutant, theirs).join('\n')).toContain('palette list differs');
  });

  it('the one preset we leave out is written down with a reason, not silently missing', () => {
    expect(Object.keys(ours.presets)).not.toContain('custom');
    expect(Object.keys(theirs.presets)).toContain('custom');
    expect(Object.keys(ours.notBorrowed ?? {})).toEqual(['custom']);
    expect((ours.notBorrowed?.custom ?? '').length).toBeGreaterThan(40);
  });

  it('OBSERVED FAILING: a preset that appears in the demo and nowhere in our file is reported', () => {
    const mutantTheirs = JSON.parse(JSON.stringify(theirs)) as PaletteDoc;
    mutantTheirs.presets.mint = { chip: '#abcdef' };
    expect(comparePalettes(ours, mutantTheirs).join('\n')).toContain('palette list differs');
  });

  it('the default palette is the design source’s own accent, so it needs no overrides', () => {
    const [darkBlock] = readFileSync(SRC_CSS, 'utf8').replace(/\r/g, '').split(':root[data-theme=light]');
    const match = /--accent:\s*(#[0-9a-f]{3,8})/i.exec(darkBlock!);
    if (!match) throw new Error('design source: --accent not found in the dark block');
    const accent = match[1]!;
    const sage = ours.presets.sage!;
    expect(accent.toLowerCase()).toBe(theirs.presets.sage!.chip.toLowerCase());
    expect(sage.chip.toLowerCase()).toBe(accent.toLowerCase());
    expect(sage.dark).toBeUndefined();
    expect(sage.light).toBeUndefined();
  });
});

describe('the palette source is complete enough to switch a whole screen', () => {
  const ours = JSON.parse(readFileSync(SRC_PALETTES, 'utf8')) as PaletteDoc;

  it('every preset that overrides anything states all 13 colour tokens, twice', () => {
    const withOverrides = Object.entries(ours.presets).filter(([, p]) => p.dark || p.light);
    expect(withOverrides.length).toBe(4);
    for (const [id, preset] of withOverrides) {
      expect(Object.keys(preset.dark!), `${id}.dark`).toEqual(ours.keys);
      expect(Object.keys(preset.light!), `${id}.light`).toEqual(ours.keys);
    }
  });

  it('the loader refuses a preset that states only some of the tokens', () => {
    const dir = mkdtempSync(join(tmpdir(), 'palettes-'));
    const broken = JSON.parse(JSON.stringify(ours)) as PaletteDoc;
    delete (broken.presets.violet!.dark as Record<string, string>)['accent-bg'];
    const path = join(dir, 'company-os-palettes.json');
    writeFileSync(path, JSON.stringify(broken));
    expect(() => loadPalettes(path)).toThrow(/violet\.dark: missing accent-bg/);
  });

  it('the loader refuses a chip that is not a colour', () => {
    const dir = mkdtempSync(join(tmpdir(), 'palettes-'));
    const broken = JSON.parse(JSON.stringify(ours)) as PaletteDoc;
    broken.presets.rose!.chip = 'dusty rose';
    const path = join(dir, 'company-os-palettes.json');
    writeFileSync(path, JSON.stringify(broken));
    expect(() => loadPalettes(path)).toThrow(/rose: chip is not a colour/);
  });
});

/* ── readability ─────────────────────────────────────────────────────────────────────────────
   The pressed option in Settings draws its label in `--accent` on `--accent-bg`, and every
   screen draws body text in `--muted` on `--bg`. A preset that fails there is a preset that
   makes the control unreadable for exactly the person who needs it, so the pairs are measured
   rather than trusted — the owner's own `custom` entry does a contrast walk for this reason. */
const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function luminance(hex: string) {
  const full = hex.replace('#', '').replace(/^([0-9a-f])([0-9a-f])([0-9a-f])$/i, '$1$1$2$2$3$3');
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(full.slice(i, i + 2), 16) / 255)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (high + 0.05) / (low + 0.05);
}

describe('every palette is readable in both themes', () => {
  const { dark: baseDark, light: baseLight } = buildContext();
  const ours = JSON.parse(readFileSync(SRC_PALETTES, 'utf8')) as PaletteDoc;
  // the generator's maps are keyed by custom-property name (`--accent`); the palette file's
  // keys are the bare token names (`accent`), so strip the prefix once, here
  const toMap = (map: Map<string, string>) =>
    Object.fromEntries([...map].map(([k, v]) => [k.replace(/^--/, ''), v])) as Record<string, string>;
  const base = { dark: toMap(baseDark), light: toMap(baseLight) };

  it('the pressed option and the body text clear AA for small text (4.5:1)', () => {
    const failures: string[] = [];
    for (const [id, preset] of Object.entries(ours.presets)) {
      for (const theme of ['dark', 'light'] as const) {
        const tokens = preset[theme] ?? base[theme];
        const pressed = contrast(tokens.accent!, tokens['accent-bg']!);
        const body = contrast(tokens.muted!, tokens.bg!);
        if (pressed < 4.5) failures.push(`${id}.${theme}: accent on accent-bg is ${pressed.toFixed(2)}:1`);
        if (body < 4.5) failures.push(`${id}.${theme}: muted on bg is ${body.toFixed(2)}:1`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('OBSERVED FAILING: the same measurement rejects a washed-out accent', () => {
    expect(contrast('#c98aa0', '#f5dfe7')).toBeLessThan(4.5);
    expect(contrast('#ccd7ff', '#dbe4ff')).toBeLessThan(4.5);
    // and the two pairs the design source itself ships are the ones that pass
    expect(contrast('#accab3', '#253c2d')).toBeGreaterThan(4.5);
  });
});
