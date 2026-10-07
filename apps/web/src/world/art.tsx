/**
 * The office art — the React component.
 *
 * The paths and the naming rule live in `prop-paths.ts`, because the **design prototype draws the
 * same furniture** and is not React; `scripts/build-world-lib.mjs` ships `PROP_PATHS` and
 * `shapeFor` to it. This file is only the React half: one `<svg>` per prop, on the owner's grid.
 */
import { PROP_GRID, PROP_PATHS, shapeFor } from './prop-paths';
import type { Prop } from './layout.data';

export { shapeFor } from './prop-paths';
export type { ShapeName } from './prop-paths';

export function PropArt({ prop }: { prop: Prop }) {
  const shape = shapeFor(prop.type);
  return (
    <svg className={`prop-art prop-art-${shape}`} viewBox={`0 0 ${PROP_GRID} ${PROP_GRID}`} aria-hidden="true" focusable="false" preserveAspectRatio="none">
      <path d={PROP_PATHS[shape]} />
    </svg>
  );
}
