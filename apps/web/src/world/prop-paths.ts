/**
 * What a piece of furniture looks like, and how it is drawn.
 *
 * Kept apart from `art.tsx` (which is the React component) on purpose: the **paths** and the
 * **naming rule** are shared with the design prototype, which is not React. `art.tsx` renders
 * `PROP_PATHS`; `design/prototype/world.js` renders the same paths into the same 28-unit viewBox
 * (shipped to it by `scripts/build-world-lib.mjs`), so the plan cannot look different in the two
 * places — and swapping in the owner's real sprite pack is a change here, once.
 *
 * The owner's demo draws every prop from a pack of 54 sprites that has **no attribution in the
 * file**, so it is not in this repository yet (see `_research/dev-docs/OWNER_DEMO_READING.md` §3).
 * What stands in for it is deliberately small and deliberately ours: a handful of shapes, chosen
 * from the owner's own sprite *names* (`sp-desk-*`, `sp-chair-*`, `sp-plant-*`, …), each drawn from
 * theme tokens so the plan re-tints with the palette and reads in dark and light.
 */

export type ShapeName =
  | 'desk' | 'chair' | 'table' | 'plant' | 'cabinet' | 'screen' | 'sofa' | 'arcade' | 'board' | 'fridge' | 'box';

/** What kind of thing a sprite id is — read from the owner's own naming, never guessed at random. */
export function shapeFor(type: string): ShapeName {
  const id = type.replace(/^sp-/, '');
  if (id.startsWith('desk')) return 'desk';
  if (id.startsWith('chair') || id.startsWith('stool')) return 'chair';
  if (id.startsWith('plant') || id.startsWith('tree') || id.startsWith('succulent')) return 'plant';
  if (id.startsWith('cabinet') || id.startsWith('credenza') || id.startsWith('pedestal') || id.startsWith('organizer')) return 'cabinet';
  if (id.startsWith('laptop') || id.startsWith('monitor') || id.startsWith('computer') || id.startsWith('camera') || id.startsWith('copier') || id.startsWith('printer') || id.startsWith('projector')) return 'screen';
  if (id.startsWith('counter') || id.startsWith('lamp') || id.startsWith('control')) return 'sofa';
  if (id.startsWith('artwork') || id.startsWith('frame') || id.startsWith('clock') || id.startsWith('partition')) return 'board';
  if (id.startsWith('refrigerator') || id.startsWith('water') || id.startsWith('shredder') || id.startsWith('ups') || id.startsWith('bin')) return 'fridge';
  if (id.startsWith('mug') || id.startsWith('keys') || id.startsWith('stapler') || id.startsWith('pen') || id.startsWith('papers') || id.startsWith('notebook') || id.startsWith('tape') || id.startsWith('usb') || id.startsWith('clipboard') || id.startsWith('folder') || id.startsWith('archive') || id.startsWith('calculator') || id.startsWith('headphones') || id.startsWith('wastebasket') || id.startsWith('stand')) return 'box';
  if (id.startsWith('table')) return 'table';
  return 'box';
}

/**
 * One prop, as an SVG path on a 28×28 grid — the owner's sprites are 28 wide or high, so a
 * replacement keeps their geometry. The fill comes from CSS (`.prop-art-<shape> path`), which is
 * what makes the plan follow the theme rather than a hard-coded colour.
 */
export const PROP_PATHS: Record<ShapeName, string> = {
  // a top slab with two legs
  desk: 'M2 10h24v3H2zM4 13h3v11H4zM21 13h3v11h-3z',
  chair: 'M9 5h10v3H9zM10 8h8v8h-8zM9 16h2v8H9zM17 16h2v8h-2z',
  table: 'M3 9h22v4H3zM6 13h3v10H6zM19 13h3v10h-3z',
  plant: 'M12 17h4v8h-4zM8 6h4v11H8zM16 4h4v13h-4zM9 9h10v8H9z',
  cabinet: 'M5 4h18v21H5zM6 6h16v8H6zM6 17h16v6H6z',
  screen: 'M4 6h20v13H4zM11 19h6v4h-6zM6 8h16v9H6z',
  sofa: 'M3 12h22v7H3zM5 8h4v4H5zM19 8h4v4h-4zM4 19h3v3H4zM21 19h3v3h-3z',
  arcade: 'M6 3h16v22H6zM9 6h10v8H9zM10 17h3v3h-3zM16 17h3v3h-3z',
  board: 'M3 4h22v16H3zM6 7h16v10H6zM10 21h8v3h-8z',
  fridge: 'M7 3h14v22H7zM8 5h12v8H8zM8 14h12v10H8zM12 17h4v2h-4z',
  box: 'M5 8h18v16H5zM8 4h12v4H8zM12 14h4v4h-4z',
};

/** The grid the paths above are drawn on. */
export const PROP_GRID = 28;
