/**
 * The gesture layer (Phase G, PORT_AUDIT): the pointer state machine as pure, testable maths —
 * inertial glide, two-finger pinch about the midpoint, and double-click zoom. WorldView owns
 * the DOM and calls these; nothing here touches React, so both the app and any other host can
 * share one movement. Wheel normalisation already lives in camera.ts (wheelFactor); the
 * anchored zoom these build on is camera.ts's zoomBy.
 */
import { zoomBy, type Camera } from './camera';

/** The demo's glide: friction 0.92 per frame, stops under 0.05 px/frame. */
export const GLIDE_FRICTION = 0.92;
export const GLIDE_STOP = 0.05;

/** One frame of inertial glide. Returns the velocity for the NEXT frame; 0 means arrived. */
export function glideStep(velocity: number): number {
  const next = velocity * GLIDE_FRICTION;
  return Math.abs(next) < GLIDE_STOP ? 0 : next;
}

/** How far a glide travels in total from a starting velocity — the sum of the decay. */
export function glideDistance(velocity: number): number {
  let v = velocity;
  let total = 0;
  for (let i = 0; i < 600 && v !== 0; i += 1) {
    total += v;
    v = glideStep(v);
  }
  return total;
}

/** The snapshot a pinch starts from: the opening distance, the midpoint, the camera. */
export interface PinchStart {
  distance: number;
  mid: { x: number; y: number };
  camera: Camera;
}

export const distanceBetween = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const midpoint = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

/**
 * Pinch zoom about the midpoint: the camera scales by how the finger distance changed, keeping
 * the plan point that sat under the OPENING midpoint under the CURRENT one — so the picture
 * follows the hand instead of sliding away from it.
 */
export function pinchCamera(
  start: PinchStart,
  distance: number,
  mid: { x: number; y: number },
): Camera {
  if (start.distance <= 0) return start.camera;
  const zoomed = zoomBy(start.camera, distance / start.distance, start.mid.x, start.mid.y);
  return { ...zoomed, x: zoomed.x + (mid.x - start.mid.x), y: zoomed.y + (mid.y - start.mid.y) };
}

/** Double-click zoom: 1.6× in, Shift reverses — anchored at the click, like every map. */
export const DOUBLE_CLICK_FACTOR = 1.6;
export function doubleClickZoom(camera: Camera, px: number, py: number, invert = false): Camera {
  return zoomBy(camera, invert ? 1 / DOUBLE_CLICK_FACTOR : DOUBLE_CLICK_FACTOR, px, py);
}
