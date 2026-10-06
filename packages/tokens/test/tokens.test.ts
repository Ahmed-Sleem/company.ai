/**
 * Token pipeline tests.
 *
 * These are the contract's law 1 made executable: the designer's file is the only place a
 * value exists, and the app cannot drift from it. The comparator tests use deliberately
 * broken copies (mutants) — each was observed failing before being trusted (rules §18.2).
 */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  SRC_CSS,
  SRC_JSON,
  SRC_PALETTES,
  GENERATED,
  FONT_FILE,
  buildAll,
  buildContext,
} from '../src/generate.mjs';

interface Mutant { css: string; json: Record<string, any>; dir: string }
function mutantDir(mutate: (m: Mutant) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'tokens-'));
  const css = readFileSync(SRC_CSS, 'utf8');
  const json = JSON.parse(readFileSync(SRC_JSON, 'utf8')) as Record<string, any>;
  mutate({ css, json, dir });
  writeFileSync(join(dir, 'company-os-pixel.css'), css);
  writeFileSync(join(dir, 'company-os-pixel.json'), JSON.stringify(json, null, 2));
  return dir;
}

describe('token source agreement (CSS ↔ JSON)', () => {
  it('the committed sources agree', () => {
    const { mismatches } = buildContext();
    expect(mismatches).toEqual([]);
  });

  it('OBSERVED FAILING: a changed colour in the JSON copy is reported', () => {
    const dir = mutantDir(({ json }) => {
      json.tokens.dark.accent = '#ff00ff';
    });
    const { mismatches } = buildContext({
      cssPath: join(dir, 'company-os-pixel.css'),
      jsonPath: join(dir, 'company-os-pixel.json'),
    });
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0]).toContain('dark.accent');
  });

  it('OBSERVED FAILING: a token deleted from the CSS copy is reported as missing', () => {
    const dir = mutantDir(({ css }) => {
      if (!css.includes('--warning:#dfc18b;')) throw new Error('fixture assumption changed');
    });
    // rewrite the fixture file that mutantDir produced from the mutated string
    const fixture = join(dir, 'company-os-pixel.css');
    const broken = readFileSync(fixture, 'utf8').replace('--warning:#dfc18b;', '');
    writeFileSync(fixture, broken);
    const { mismatches } = buildContext({
      cssPath: fixture,
      jsonPath: join(dir, 'company-os-pixel.json'),
    });
    expect(mismatches.some((m) => m.includes('dark.warning') && m.includes('missing'))).toBe(true);
  });

  it('accepts #fff and #ffffff as the same colour (documented notation difference)', () => {
    const dir = mutantDir(({ json }) => {
      json.tokens.light.onAccent = '#fff'; // canonical form of #ffffff
    });
    const { mismatches } = buildContext({
      cssPath: join(dir, 'company-os-pixel.css'),
      jsonPath: join(dir, 'company-os-pixel.json'),
    });
    expect(mismatches).toEqual([]);
  });
});

describe('generated output', () => {
  const { files, ctx } = buildAll() as { files: Record<string, string>; ctx: import('../src/generate.d.mts').BuildContext };

  it('every generated file is present and in sync with a fresh build', () => {
    for (const [name, content] of Object.entries(files)) {
      const onDisk = readFileSync(join(GENERATED, name), 'utf8') as string;
      expect(onDisk, `${name} is out of date — run npm run tokens:build`).toBe(content);
    }
  });

  it('carries every colour from the design source, in both themes', () => {
    for (const map of [ctx.dark, ctx.light]) {
      for (const [name, value] of map as Map<string, string>) {
        expect(String(files['tokens.css'])).toContain(`${name}:`);
        expect(String(files['tokens.css'])).toContain(value);
      }
    }
  });

  it('keeps the pixel skin rules (square corners, hard shadows, stepped frames)', () => {
    const css = String(files['tokens.css'] ?? '');
    expect(css).toContain('--radius:0px');
    expect(css).toContain('--pixel:');
    expect(css).toContain('box-shadow:2px 2px 0 var(--line)');
    expect(css).toContain('clip-path:polygon(3px 0');
  });

  it('implements the two media queries the design source left as intent', () => {
    const css = String(files['tokens.css'] ?? '');
    expect(css).toMatch(/@media\(pointer:coarse\)\{[\s\S]*min-height:var\(--touch\)/);
    expect(css).toMatch(/@media\(prefers-reduced-motion:reduce\)\{[\s\S]*animation-duration:0\.001ms/);
  });

  // Changed 2026-10-06, observed failing first: adding the owner's palettes made this check
  // report every palette colour as unknown. The guarantee is unchanged — a generated colour
  // must be declared in a committed source — but there are two committed sources now, the
  // designer's file and the owner's palette file.
  it('never introduces a colour that neither committed source declares', () => {
    const source = readFileSync(SRC_CSS, 'utf8').toLowerCase();
    const palettes = readFileSync(SRC_PALETTES, 'utf8').toLowerCase();
    const generated = String(files['tokens.css'] ?? '').toLowerCase();
    const newColors = new Set();
    for (const m of generated.matchAll(/#[0-9a-f]{3,8}\b/g)) newColors.add(m[0]);
    for (const c of newColors as Set<string>) {
      const known = source.includes(c) || palettes.includes(c) || generated.includes(`var(--${c})`);
      expect(known, `unknown colour ${c}`).toBe(true);
    }
  });

  it('points @font-face at the vendored font file, which exists', () => {
    expect(String(files['tokens.css'])).toContain("url('../assets/PixelifySans.woff2')");
    expect(readFileSync(FONT_FILE).subarray(0, 4).toString('latin1')).toBe('wOF2');
  });

  it('theme.css maps Tailwind utilities onto our variables, not Tailwind defaults', () => {
    const theme = String(files['theme.css'] ?? '');
    expect(theme).toContain('--color-accent: var(--accent);');
    expect(theme).toContain('--font-pixel: var(--pixel);');
    expect(theme).not.toMatch(/--color-red-/);
  });
});
