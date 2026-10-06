/**
 * The portraits are the designer's artwork, and they are the one asset in this app that was copied
 * rather than written. These tests keep the copy honest: the committed data module must still match
 * the demo file line for line, and the component must draw what the demo draws — including the
 * demo's own fallback for an index that is out of range.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { PORTRAITS } from '../src/lib/avatars.data';
import { Avatar } from '../src/components/Avatar';

// jsdom rewrites `import.meta.url` to an http URL, so the demo is found from the working directory
// (the web suite runs with `apps/web` as cwd — and from the repository root as a fallback).
function demoPath(): string {
  const found = ['../../design/designer-demo/ai-company-os.html', 'design/designer-demo/ai-company-os.html']
    .map((candidate) => join(process.cwd(), candidate))
    .find((candidate) => existsSync(candidate));
  if (!found) throw new Error(`the designer’s demo file was not found from ${process.cwd()}`);
  return found;
}
const DEMO = demoPath();

/** The demo's own `const AVATARS=[…]`, read straight out of the file the designer owns. */
function demoPortraits() {
  const source = readFileSync(DEMO, 'utf8');
  const start = source.indexOf('const AVATARS=[');
  expect(start, 'the demo still contains `const AVATARS=[`').toBeGreaterThan(-1);
  let depth = 0;
  for (let i = start + 'const AVATARS='.length; i < source.length; i += 1) {
    if (source[i] === '[') depth += 1;
    else if (source[i] === ']') {
      depth -= 1;
      if (depth === 0) return JSON.parse(source.slice(start + 'const AVATARS='.length, i + 1));
    }
  }
  throw new Error('the demo’s AVATARS array is not closed');
}

describe('the designer’s portraits', () => {
  it('are the same artwork the demo carries', () => {
    const demo = demoPortraits();
    expect(PORTRAITS).toHaveLength(demo.length);
    expect(PORTRAITS.map((p) => p.id)).toEqual(demo.map((p: { id: string }) => p.id));
    expect(PORTRAITS.map((p) => p.grid)).toEqual(demo.map((p: { grid: number }) => p.grid));
    // the paths themselves: a checksum of all of them, so one changed pixel cannot slip through
    const sum = (rows: Array<{ path: string }>) => rows.reduce((total, row) => total + row.path.length, 0);
    expect(sum(PORTRAITS)).toBe(sum(demo));
    expect(PORTRAITS.every((p) => p.path.startsWith('M'))).toBe(true);
  });

  it('draws the portrait the agent’s index points at', () => {
    const { container } = render(<Avatar index={2} size="sm" />);
    const path = container.querySelector('svg path');
    expect(path?.getAttribute('d')).toBe(PORTRAITS[2]!.path);
    expect(container.querySelector('.avatar.sm')).toBeTruthy();
  });

  it('falls back to the first portrait, as the demo does, instead of drawing nothing', () => {
    const { container } = render(<Avatar index={9999} />);
    expect(container.querySelector('svg path')?.getAttribute('d')).toBe(PORTRAITS[0]!.path);
  });

  it('is hidden from assistive technology — the name beside it is the label', () => {
    const { container } = render(<Avatar index={0} />);
    expect(container.querySelector('.avatar')?.getAttribute('aria-hidden')).toBe('true');
  });
});
