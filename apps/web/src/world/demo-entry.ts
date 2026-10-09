/**
 * What the **design prototype** is allowed to use from the app's world code.
 *
 * The prototype is a single HTML file plus a few plain scripts — no bundler, no React. It still has
 * to draw the same floor, seat the same people and move its camera the same way, so
 * `scripts/build-world-lib.mjs` bundles exactly this file into `design/prototype/world-lib.js`
 * (an IIFE on `window.WORLD_LIB`) and the gate fails if that file is out of date.
 *
 * Only pure code crosses that line — no React, no DOM, no fetch. If it needs a browser, it does not
 * belong here; it belongs in `design/prototype/world.js`.
 */

/* The camera: a value, and pure functions over it. Both the world and the network graph use these. */
export {
  MIN_SCALE, MAX_SCALE, LADDER, EASE,
  clampScale, fitCamera, toPlan, toScreen, zoomAbout, zoomBy, zoomByCentre,
  clampCamera, clampCameraForZoom, panBy, centreOn, nextRung, ease, cameraTransform, wheelFactor,
} from './camera';
export type { Camera } from './camera';

/* The plan: the owner's layout, and the small questions asked of it. */
export {
  WORLD, DEFAULT_LAYOUT, defaultPlan, roomAt, desksOf, snap, sprite, SPRITES,
} from './plan';
export type { Desk, Plan, Prop, Room } from './plan';

/* The furniture: which shape a sprite id is, and the path that draws it. */
export { PROP_PATHS, PROP_GRID, shapeFor } from './prop-paths';

/* Who sits where. */
export { seatAgents } from './seat';
export {
  DOUBLE_CLICK_FACTOR, GLIDE_FRICTION, GLIDE_STOP,
  distanceBetween, doubleClickZoom, glideDistance, glideStep, midpoint, pinchCamera,
} from './gestures';
export type { Seat, SeatableAgent, SeatTask } from './seat';
