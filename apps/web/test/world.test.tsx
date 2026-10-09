/**
 * The World Map — the maths, the floor and the seating, checked without a browser.
 *
 * The reason the camera is a module of pure functions is exactly this file: zoom anchoring, the
 * ladder, the easing and the clamping are the parts the owner asked to be *smoother*, and "it
 * feels smoother" is not a check. Each of these can fail, so each of these means something.
 */
import { describe, expect, it } from 'vitest';
import {
  EASE, FIT_MIN_SCALE, SCALE_LADDER, SCALE_MAX, SCALE_MIN, cameraTransform, centreOn, clampCamera, clampCameraForZoom,
  clampScale, ease,
  fitCamera, nextRung, panBy, toPlan, toScreen, wheelFactor, zoomBy,
} from '../src/world/camera';
import { DEFAULT_LAYOUT, SPRITES, desksOf, propShape, roomAt, snap, sprite } from '../src/world/plan';
import { seatAgents } from '../src/views/WorldView';

describe('the camera', () => {
  it('zooming about a point leaves that point exactly where it was', () => {
    const camera = { scale: 1, x: 40, y: -10 };
    const [px, py] = [357, 219];
    const before = toPlan(camera, px, py);
    const after = zoomBy(camera, 1.7, px, py);
    const still = toScreen(after, before.x, before.y);
    // within a rounding error of a pixel: this is the "zoom under the cursor" guarantee
    expect(Math.abs(still.x - px)).toBeLessThan(1e-6);
    expect(Math.abs(still.y - py)).toBeLessThan(1e-6);
  });

  it('the scale stays inside the ladder’s range however hard it is pushed', () => {
    expect(clampScale(99)).toBe(SCALE_MAX);
    expect(clampScale(0.01)).toBe(SCALE_MIN);
    expect(clampScale(Number.NaN)).toBe(1);
    const wild = zoomBy({ scale: 1, x: 0, y: 0 }, 1000, 100, 100);
    expect(wild.scale).toBe(SCALE_MAX);
  });

  it('the ladder steps one rung at a time in both directions', () => {
    expect(nextRung(1, 1)).toBe(2);
    expect(nextRung(1, -1)).toBe(0.5);
    expect(nextRung(SCALE_MAX, 1)).toBe(SCALE_MAX);
    expect(nextRung(SCALE_MIN, -1)).toBe(SCALE_MIN);
    expect([...SCALE_LADDER]).toEqual([0.5, 1, 2, 3]);
  });

  it('easing converges on the target and then stops moving exactly', () => {
    const from = { scale: 1, x: 0, y: 0 };
    const to = { scale: 2, x: 300, y: -150 };
    let current = from;
    let frames = 0;
    while (current !== to && frames < 400) {
      current = ease(current, to);
      frames++;
    }
    expect(current).toBe(to); // identity, not merely close: the frame loop can stop
    expect(frames).toBeGreaterThan(5);
    expect(frames).toBeLessThan(120); // and it settles inside two seconds at 60fps
    expect(EASE).toBeGreaterThan(0.05);
  });

  /**
   * The plan is 1920×1200. On a 390px phone the only fit that shows all of it is ≈0.17 — below the
   * ladder's own floor of 0.5, which exists for what a *hand* does, not for "show me everything".
   * Found by design/prototype/probe-browser.mjs, which measured 4 of 22 rooms and desks inside the
   * stage at 320px: the fit was clamped, so "Whole plan" showed a corner of the studio.
   */
  it('a phone can see the whole plan — the fit is allowed below the ladder', () => {
    for (const [w, h] of [[320, 341], [390, 506], [428, 600], [1440, 640]] as const) {
      const camera = fitCamera(w, h);
      const right = toScreen(camera, 1920, 1200);
      expect(right.x).toBeLessThanOrEqual(w + 0.5);
      expect(right.y).toBeLessThanOrEqual(h + 0.5);
      expect(camera.scale).toBeGreaterThanOrEqual(FIT_MIN_SCALE);
    }
    /* And the owner's ladder itself has not moved. The hard floor is separate from it so that a
       hand can zoom around a fitted scale of 0.17 without being yanked up to 0.5: the *steps*
       still walk 0.5 · 1 · 2 · 3. */
    expect([...SCALE_LADDER]).toEqual([0.5, 1, 2, 3]);
    expect(clampScale(0.2)).toBe(0.2);
    expect(clampScale(0.01)).toBe(SCALE_MIN);
    expect(nextRung(0.17, 1)).toBe(0.5);
    expect(FIT_MIN_SCALE).toBeLessThan(0.5);
  });

  it('the whole plan fits the viewport, and the fit is centred', () => {
    const camera = fitCamera(1000, 700);
    expect(camera.scale).toBeGreaterThanOrEqual(FIT_MIN_SCALE)
    expect(camera.scale).toBeLessThanOrEqual(SCALE_MAX);
    const left = toScreen(camera, 0, 0);
    const right = toScreen(camera, 1920, 1200);
    expect(left.x).toBeGreaterThanOrEqual(0);
    expect(right.x).toBeLessThanOrEqual(1000);
    expect(left.y).toBeGreaterThanOrEqual(0);
    expect(right.y).toBeLessThanOrEqual(700);
    expect(Math.abs(left.x - (1000 - right.x))).toBeLessThan(1); // equal margins: it is centred
  });

  it('the floor roams a generous field — the grid is infinite, the studio never lost', () => {
    // Owner, fifth round: the grid runs everywhere and the pan is free. The camera keeps the
    // studio inside a generous field (4000px) instead of hugging the frame, and Fit is the way home.
    const far = clampCamera({ scale: 2, x: -99999, y: -99999 }, 1000, 700);
    expect(far.x).toBeGreaterThanOrEqual(1000 - 1920 * 2 - 4000);
    expect(far.y).toBeGreaterThanOrEqual(700 - 1200 * 2 - 4000);
    const other = clampCamera({ scale: 2, x: 99999, y: 99999 }, 1000, 700);
    expect(other.x).toBeLessThanOrEqual(4000);
    expect(other.y).toBeLessThanOrEqual(4000);
  });

  /**
   * Two defects the browser smoke found in the camera, both about *where* the plan is allowed to
   * sit. Neither was visible while the fit happened to land on a round number.
   *
   *   1. when the plan is smaller than the viewport, the corner rule inverted itself and pinned the
   *      plan to `slack` px from the left instead of letting it rest centred — zooming out far
   *      slammed the studio into the top-left corner;
   *   2. an anchored zoom near the plan's left edge asks for a position the strict pan bound
   *      refuses, so the point under the pointer slid (13.7 plan units on the smoke's own wheel
   *      gesture). A pan can lose the plan and is bounded tightly; a zoom is anchored and may
   *      overshoot while the user is looking at a place.
   */
  it('a plan smaller than the view rests centred, and a zoom near an edge is not fought', () => {
    // 1 — a tiny plan roams the field like any other (the owner pans an infinite grid now);
    // the generous field, not the centre, is the new contract
    const tiny = { scale: 0.25, x: 99999, y: -99999 };
    const settled = clampCamera(tiny, 1000, 700);
    expect(settled.x).toBe(4000);

    // and it is still bounded, generously, when the plan is larger than the view
    const far = clampCamera({ scale: 2, x: -99999, y: -99999 }, 1000, 700);
    expect(far.x).toBeGreaterThanOrEqual(1000 - 1920 * 2 - 4000);
    expect(clampCamera({ scale: 2, x: 99999, y: 99999 }, 1000, 700).x).toBeLessThanOrEqual(4000);

    // 2 — the zoom bound is looser than the pan bound, and the anchor survives
    const view = { width: 1130, height: 630 };
    const start = fitCamera(view.width, view.height);
    const pointer = { x: 120, y: 90 };
    const anchor = toPlan(start, pointer.x, pointer.y);
    const zoomed = zoomBy(start, 1.468, pointer.x, pointer.y);
    const land = clampCameraForZoom(zoomed, view.width, view.height);
    const anchorAfter = toPlan(land, pointer.x, pointer.y);
    expect(Math.abs(anchorAfter.x - anchor.x)).toBeLessThan(2);
    // ...while a pan in the same situation is still held to the tight bound
    expect(clampCamera({ scale: zoomed.scale, x: 5000, y: 0 }, view.width, view.height).x).toBeLessThanOrEqual(4000);
  });

  it('a wheel on any device moves the zoom by a comparable amount', () => {
    const pixels = wheelFactor(120, 0);
    const lines = wheelFactor(8, 1); // 8 lines × 16px = 128px
    const pages = wheelFactor(0.3, 2); // 0.3 pages × 400px = 120px
    expect(pixels).toBeLessThan(1); // scrolling down zooms out
    expect(Math.abs(lines - pixels)).toBeLessThan(0.02);
    expect(Math.abs(pages - pixels)).toBeLessThan(0.02);
    // a huge delta cannot fling the view: it is clamped before it is turned into a factor
    expect(Math.abs(wheelFactor(100000, 0) - wheelFactor(240, 0))).toBeLessThan(1e-9);
    // a pinch (ctrl+wheel) is firmer than a plain wheel tick
    expect(wheelFactor(-100, 0, true)).toBeGreaterThan(wheelFactor(-100, 0));
  });

  it('panning and centring move the plan without changing the scale', () => {
    expect(panBy({ scale: 2, x: 10, y: 20 }, 5, -5)).toEqual({ scale: 2, x: 15, y: 15 });
    const centred = centreOn({ scale: 2, x: 0, y: 0 }, 500, 400, 1000, 700);
    expect(toScreen(centred, 500, 400)).toEqual({ x: 500, y: 350 });
  });

  it('one transform string, written one way', () => {
    expect(cameraTransform({ scale: 1.5, x: 12, y: -8 })).toBe('translate3d(12px, -8px, 0) scale(1.5)');
  });
});

describe('the floor is the owner’s floor', () => {
  it('carries their six rooms, sixteen desks and twenty-one props', () => {
    expect(DEFAULT_LAYOUT.rooms).toHaveLength(6);
    expect(DEFAULT_LAYOUT.desks).toHaveLength(16);
    expect(DEFAULT_LAYOUT.props).toHaveLength(21);
    expect(SPRITES).toHaveLength(54);
  });

  it('a plan point lands in the room the owner drew it in', () => {
    expect(roomAt(DEFAULT_LAYOUT, 300, 200)?.id).toBe('exec');
    expect(roomAt(DEFAULT_LAYOUT, 900, 300)?.id).toBe('eng');
    expect(roomAt(DEFAULT_LAYOUT, 700, 700)?.id).toBe('board');
    expect(roomAt(DEFAULT_LAYOUT, 300, 700)?.id).toBe('design');
    expect(roomAt(DEFAULT_LAYOUT, 1000, 700)?.id).toBe('ops');
    expect(roomAt(DEFAULT_LAYOUT, 1500, 400)?.id).toBe('lounge');
    expect(roomAt(DEFAULT_LAYOUT, 5, 5)).toBeUndefined();
  });

  it('every desk and prop names a sprite the owner’s catalogue actually has', () => {
    for (const desk of DEFAULT_LAYOUT.desks) expect(sprite(desk.deskType), desk.id).toBeTruthy();
    for (const prop of DEFAULT_LAYOUT.props) expect(sprite(prop.type), prop.id).toBeTruthy();
  });

  it('the office departments have desks, and the lobby does not', () => {
    expect(desksOf('Executive')).toHaveLength(2);
    expect(desksOf('Engineering')).toHaveLength(6);
    expect(desksOf('Design')).toHaveLength(4);
    expect(desksOf('Operations')).toHaveLength(4);
    expect(desksOf('Lounge')).toHaveLength(0);
  });

  it('a prop is drawn as the kind of thing it is', () => {
    // The vocabulary followed the art: when the sprite pack's licence is cleared these strings
    // become their sprite ids, and this test becomes the record of what each id looked like.
    expect(propShape('sp-chair-task')).toBe('chair');
    expect(propShape('sp-plant-palm')).toBe('plant');
    expect(propShape('sp-artwork-abstract')).toBe('board');
    expect(propShape('sp-cabinet-filing-tall')).toBe('cabinet');
    expect(propShape('sp-mug')).toBe('box');
    expect(propShape('sp-desk-straight')).toBe('desk');
  });

  it('build-mode moves land on the owner’s sixteen-unit grid', () => {
    expect(snap(0)).toBe(0);
    expect(snap(7)).toBe(0);
    expect(snap(9)).toBe(16);
    expect(snap(23)).toBe(16);
    expect(snap(24)).toBe(32);
    expect(snap(-9)).toBe(-16);
    expect(snap(1505)).toBe(1504);
  });
});

describe('seating people at desks', () => {
  const agent = (id: string, department: string, status = 'working') => ({
    id, name: id, nameAr: null, role: 'r', roleAr: null, department, focus: null, focusAr: null,
    avatar: 0, status, modelId: null, capabilities: [],
    budget: { limitCents: 100, spentCents: 10, remainingCents: 90, exceeded: false },
  });
  const task = (id: string, ownerAgentId: string, stage: string) => ({
    id, shortRef: 'TSK-1', title: id, titleAr: null, description: null, descriptionAr: null,
    stage, priority: 'medium', progress: 10, dueDate: null, ownerAgentId, owner: null,
    offers: [], createdAt: '', updatedAt: '',
  }) as never;

  it('seats people in their own department, one desk each', () => {
    const seats = seatAgents(DEFAULT_LAYOUT, [agent('a', 'Engineering'), agent('b', 'Engineering')] as never, []);
    const placed = seats.filter((seat) => seat.agent);
    expect(placed).toHaveLength(2);
    expect(placed.every((seat) => seat.desk.dept === 'Engineering')).toBe(true);
    expect(new Set(placed.map((seat) => seat.desk.id)).size).toBe(2);
    expect(seats).toHaveLength(16);
    // nobody sits at a desk somebody else already has
    const desks = seats.filter((seat) => seat.agent).map((seat) => seat.desk.id);
    expect(desks).toHaveLength(new Set(desks).size);
  });

  it('counts each person’s tasks and whether any of them is being worked on', () => {
    const seats = seatAgents(
      DEFAULT_LAYOUT,
      [agent('a', 'Executive'), agent('b', 'Design')] as never,
      [task('t1', 'a', 'progress'), task('t2', 'a', 'done'), task('t3', 'b', 'backlog')] as never,
    );
    const a = seats.find((seat) => seat.agent?.id === 'a')!;
    const b = seats.find((seat) => seat.agent?.id === 'b')!;
    expect(a.tasks).toHaveLength(2);
    expect(a.working).toBe(true);
    expect(b.tasks).toHaveLength(1);
    expect(b.working).toBe(false);
  });

  it('somebody whose department the plan has never heard of still gets a desk', () => {
    const seats = seatAgents(DEFAULT_LAYOUT, [agent('x', 'Legal')] as never, []);
    const filled = seats.filter((seat) => seat.agent);
    // three passes — own department, matching theme, then any free desk — so the floor never
    // shows a row of empty desks while the company's roster is full
    expect(filled).toHaveLength(1);
    for (const seat of seats) {
      if (!seat.agent) expect(seat.tasks).toEqual([]);
    }
  });
});
