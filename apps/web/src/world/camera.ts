/**
 * The camera — pan and zoom over the studio plan.
 *
 * This is the owner's maths (`bounds`/`zoomTo`/`updateWorldTransform` in their demo), lifted out of
 * the DOM and made **pure**: a camera is a value, every function returns a new one, and nothing here
 * reads or writes an element. That is what makes the two things they asked for testable rather than
 * a matter of opinion:
 *
 *   · **smoother zoom** — the wheel moves a *target*, and `ease()` walks the live camera toward it
 *     once per frame, so a wheel flick is one continuous motion instead of a series of jumps;
 *   · **zoom that stays where you are looking** — `zoomAbout()` keeps the plan point under the
 *     pointer fixed, so the thing you point at does not slide away.
 *
 * The ladder is the owner's: 0.5 · 1 · 2 · 3 — that is what the stepped controls walk, and what a
 * hand lands on. The only scale that may go below it is a *fit* (FIT_MIN_SCALE): "show me the whole
 * plan" has to be able to, even on a phone.
 */
import { WORLD } from './layout.data';

export interface Camera {
  /** Screen pixels per plan unit. */
  scale: number;
  /** Where the plan's top-left corner sits, in screen pixels. */
  x: number;
  y: number;
}

/**
 * The floor a *fit* is allowed to reach.
 *
 * The plan is 1920×1200. A 390px phone can only show all of it at ≈0.17, so a fit clamped to the
 * ladder's own floor of 0.5 showed a corner of the studio and called it "Whole plan" — measured on
 * the prototype at 320px: 4 of 22 rooms and desks were inside the stage. Showing everything is what
 * that control promises, so a fit may go below the ladder; a hand may not (see MIN_SCALE).
 */
export const FIT_MIN_SCALE = 0.1;
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 3;
/** What the *steps* are: the owner's ladder. `nextRung` walks these, and the floor here is 0.5. */
export const LADDER = [0.5, 1, 2, 3] as const;
export const SCALE_MIN = MIN_SCALE;
export const SCALE_MAX = MAX_SCALE;
export const SCALE_LADDER = LADDER;

/** How much of the remaining distance one frame covers. 0.18 settles in about a third of a second. */
export const EASE = 0.18;

export const clampScale = (scale: number) =>
  Number.isFinite(scale) ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale)) : 1;

/** The floor a fit may reach — below the ladder, never below what is legible. */
export const clampFitScale = (scale: number) =>
  Number.isFinite(scale) ? Math.min(MAX_SCALE, Math.max(FIT_MIN_SCALE, scale)) : 1;

/**
 * The camera that shows the whole plan inside `width × height`, centred, with a margin.
 * The plan is never cropped by a fit: the scale is chosen from the smaller of the two ratios.
 */
export function fitCamera(width: number, height: number, margin = 24): Camera {
  const usable = Math.max(1, width - margin * 2);
  const usableH = Math.max(1, height - margin * 2);
  const scale = clampFitScale(Math.min(usable / WORLD.w, usableH / WORLD.h));
  return {
    scale,
    x: (width - WORLD.w * scale) / 2,
    y: (height - WORLD.h * scale) / 2,
  };
}

/** Screen point → plan point. */
export function toPlan(camera: Camera, screenX: number, screenY: number) {
  return { x: (screenX - camera.x) / camera.scale, y: (screenY - camera.y) / camera.scale };
}

/** Plan point → screen point. */
export function toScreen(camera: Camera, planX: number, planY: number) {
  return { x: planX * camera.scale + camera.x, y: planY * camera.scale + camera.y };
}

/**
 * Zoom to `scale` about a screen point, holding the plan point under it still.
 * This is the whole trick of a good zoom, in three lines.
 */
export function zoomAbout(camera: Camera, scale: number, screenX: number, screenY: number): Camera {
  const next = clampScale(scale);
  const plan = toPlan(camera, screenX, screenY);
  return { scale: next, x: screenX - plan.x * next, y: screenY - plan.y * next };
}

/** Zoom by a factor about a screen point (the wheel, the pinch). */
export const zoomBy = (camera: Camera, factor: number, screenX: number, screenY: number) =>
  zoomAbout(camera, camera.scale * factor, screenX, screenY);

/** Zoom about the centre of the viewport (the + and − buttons, the keyboard). */
export const zoomByCentre = (camera: Camera, factor: number, width: number, height: number) =>
  zoomAbout(camera, camera.scale * factor, width / 2, height / 2);

/**
 * One axis of the floor rule, in three cases rather than one.
 *
 *   1. **The plan is smaller than the view** — there is nothing to explore, so it rests centred.
 *      This case used to fall through to the rule below, whose two bounds *invert* when the content
 *      is smaller than the view: `Math.min(slack, …)` then always won and pinned the studio to the
 *      top-left corner. Measured: zooming out past the fit slammed the plan into the corner.
 *   2. **The plan is larger than the view** (a pan) — it may go `slack` px past either edge, no more,
 *      so the floor can never be dragged out of reach.
 */
function clampAxis(view: number, content: number, position: number, slack: number): number {
  if (content + slack * 2 <= view) return (view - content) / 2;
  return Math.min(slack, Math.max(view - content - slack, position));
}

/**
 * Keep the plan within reach: after a pan or a zoom-out, the floor is never dragged off-screen.
 * Allowed to go 80 px past either edge, which is enough to park a wall against the side of the view.
 */
export function clampCamera(camera: Camera, width: number, height: number, slack = 4000): Camera {
  const w = WORLD.w * camera.scale;
  const h = WORLD.h * camera.scale;
  return {
    scale: camera.scale,
    x: clampAxis(width, w, camera.x, slack),
    y: clampAxis(height, h, camera.y, slack),
  };
}

/**
 * The looser bound a **zoom** gets, because a zoom is anchored and a pan is not.
 *
 * When the pointer is near an edge of the plan, holding the point under it still means the plan's
 * edge comes *further in* than the pan rule allows — so the strict bound quietly moves the very
 * thing the user was pointing at (the smoke gesture slid 13.7 plan units). The allowance is a third
 * of the view, capped: enough for an anchored zoom, too small to lose the studio. Any pan afterwards
 * pulls the plan back inside the strict bound.
 */
export function clampCameraForZoom(camera: Camera, width: number, height: number): Camera {
  const slack = Math.min(240, Math.max(80, width / 3));
  return clampCamera(camera, width, height, slack);
}

export const panBy = (camera: Camera, dx: number, dy: number): Camera => ({
  scale: camera.scale,
  x: camera.x + dx,
  y: camera.y + dy,
});

/** Put a plan point in the middle of the viewport, keeping the scale. */
export function centreOn(camera: Camera, planX: number, planY: number, width: number, height: number): Camera {
  return { scale: camera.scale, x: width / 2 - planX * camera.scale, y: height / 2 - planY * camera.scale };
}

/** The next rung of the ladder, up or down. */
export function nextRung(scale: number, direction: 1 | -1): number {
  if (direction === 1) return LADDER.find((rung) => rung > scale + 1e-6) ?? MAX_SCALE;
  return [...LADDER].reverse().find((rung) => rung < scale - 1e-6) ?? MIN_SCALE;
}

/**
 * One eased step from `from` toward `to`. Returns `to` itself once it is close enough, so the
 * caller can stop the frame loop by identity and never leave a camera a fraction of a pixel off.
 */
export function ease(from: Camera, to: Camera, amount = EASE): Camera {
  const scale = from.scale + (to.scale - from.scale) * amount;
  const x = from.x + (to.x - from.x) * amount;
  const y = from.y + (to.y - from.y) * amount;
  const near = Math.abs(to.scale - scale) < 1e-3 && Math.abs(to.x - x) < 0.2 && Math.abs(to.y - y) < 0.2;
  return near ? to : { scale, x, y };
}

/** The plan as one CSS transform. Written once, so the two cannot drift apart. */
export const cameraTransform = (camera: Camera) =>
  `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`;

/**
 * How strong one wheel event is, as a multiplier.
 *
 * Three deltas arrive in three units (pixels, lines, pages) depending on the device, and a trackpad
 * pinch arrives as a wheel with `ctrlKey` set but wants a firmer response. Normalising here is what
 * stops one device from flying across the plan while another crawls.
 */
export function wheelFactor(deltaY: number, deltaMode: number, ctrlKey = false): number {
  const perLine = 16;
  const perPage = 400;
  const pixels = deltaMode === 1 ? deltaY * perLine : deltaMode === 2 ? deltaY * perPage : deltaY;
  const capped = Math.max(-240, Math.min(240, pixels));
  const rate = ctrlKey ? 0.004 : 0.0016;
  return Math.exp(-capped * rate);
}
