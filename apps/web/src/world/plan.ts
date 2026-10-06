/**
 * Reading the plan — the small questions the world asks about the owner's layout.
 *
 * The data itself is generated (`layout.data.ts`, drift-checked against the owner's demo); this file
 * is the hand-written vocabulary around it, so the rest of the app never reaches into raw arrays:
 * where is this point, which desks belong to a department, what does this sprite look like.
 */
import { DESKS, SPRITES, WORLD, defaultPlan, sprite, type Desk, type Plan, type Prop, type Room } from './layout.data';
import { shapeFor, type ShapeName } from './art';

export { WORLD, SPRITES, sprite, shapeFor };
export type { Desk, Plan, Prop, Room, ShapeName };

/**
 * The plan as the owner drew it, in the shape the views expect.
 *
 * A fresh copy each import, mutable — the world edits its own plan in build mode and the reader of
 * this should never be able to change the owner's data by accident.
 */
export const DEFAULT_LAYOUT: Plan = defaultPlan();

/** Which room contains a plan point, or `undefined` outside every wall. */
export const roomAt = (plan: { rooms: readonly Room[] }, x: number, y: number) =>
  plan.rooms.find((room) => x >= room.x && x <= room.x + room.w && y >= room.y && y <= room.y + room.h);

/** The desks of one department, left to right then top to bottom — the order the owner drew them. */
export const desksOf = (dept: string) =>
  DESKS.filter((desk) => desk.dept === dept).sort((a, b) => a.y - b.y || a.x - b.x);

/** What a sprite id looks like. Kept here so `art.tsx` stays about drawing, not naming. */
export const propShape = (type: string): ShapeName => shapeFor(type);

/** Snap a plan coordinate to the owner's build grid (16 units). */
export const snap = (value: number) => Math.round(value / WORLD.snap) * WORLD.snap;

/** Does this piece of furniture keep a person from walking through it? (Build mode will care.) */
export const isFurniture = (thing: unknown): thing is Prop =>
  typeof thing === 'object' && thing !== null && 'type' in (thing as Prop);
