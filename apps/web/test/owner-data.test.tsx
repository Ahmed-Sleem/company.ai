/**
 * The borrow is data, and data can drift.
 *
 * Everything taken from the owner's demo — the 31 pixel icons and the studio plan — is generated
 * into this repo by `scripts/gen-owner-data.mjs`, which reads their file and writes ours. These two
 * tests are the lock: they regenerate from the demo *in memory* and compare with what is committed.
 *
 * This is the test that used to be a lie. It compared the disk file with a value produced by
 * importing the generator — and importing the generator ran its CLI body, so it rewrote the disk
 * file first and the test could never fail. The generator now writes only when it is the program
 * being run (its `isMain` guard), so the comparison means something. Observed failing before that
 * fix: mutating one icon path produced `× has exactly the demo's icons`.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { demoIcons, demoLayout } from '../../../scripts/gen-owner-data.mjs';
import { ICONS } from '../src/lib/icons.data';
import { Icon } from '../src/components/Icon';
import { DESKS, PROPS, ROOMS, SPRITES } from '../src/world/layout.data';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('the owner’s data, as generated', () => {
  it('has exactly the demo’s icons', () => {
    const fromDemo = demoIcons();
    expect(Object.keys(ICONS)).toEqual(Object.keys(fromDemo));
    for (const [name, path] of Object.entries(fromDemo)) {
      expect(ICONS[name], `${name} drifted from the demo`).toBe(path);
    }
    expect(Object.keys(ICONS)).toHaveLength(31);
  });

  it('has exactly the demo’s floor plan', () => {
    const demo = demoLayout();
    expect(ROOMS).toEqual(demo.rooms);
    expect(DESKS).toEqual(demo.desks);
    expect(PROPS).toEqual(demo.props);
    expect(SPRITES).toEqual(demo.sprites);
    // the counts the owner's own demo draws, and the browser checks count too
    expect(ROOMS).toHaveLength(6);
    expect(DESKS).toHaveLength(16);
    expect(PROPS).toHaveLength(21);
    expect(SPRITES).toHaveLength(54);
  });

  it('keeps the owner’s nav on the record, with the World Map first where they put it', () => {
    expect(demoLayout().nav[0]?.[0]).toBe('world');
    expect(demoLayout().nav).toHaveLength(7);
  });

  it('draws every icon the nav asks for, substituting only where it has to', () => {
    // Six of the owner's seven nav icons are in the shared set and are used as-is. The seventh —
    // their `terminal` for the World Map — is not one of the 31, so `packages/contracts` names
    // `grid` for that view instead. That substitution is the only one, and it is asserted here.
    const substitute: Record<string, string> = { terminal: 'grid' };
    for (const [id, , icon] of demoLayout().nav) {
      const name = substitute[icon as string] ?? icon;
      const { container } = render(<Icon name={name} label={id} />);
      expect(container.querySelector('svg'), `${id} → ${name}`).toBeTruthy();
      expect(container.querySelector('path')?.getAttribute('d')).toBe(ICONS[name]);
    }
    expect(Object.keys(substitute)).toEqual(['terminal']);
    expect(ICONS['grid']).toBeTruthy();
  });

  it('the generated files say they are generated', () => {
    expect(read('../src/lib/icons.data.ts')).toContain('GENERATED from design/owner-demo/acme-studio-os.html');
    expect(read('../src/world/layout.data.ts')).toContain('GENERATED from design/owner-demo/acme-studio-os.html');
  });
});
