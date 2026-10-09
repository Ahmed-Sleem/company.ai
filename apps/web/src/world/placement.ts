/**
 * Where everybody is — the owner's rule, fifth round (C42), kept exactly as simple as he asked:
 *
 *   - an agent with work to do sits at their desk;
 *   - an agent who is free during work hours goes to the break room;
 *   - agents who talk to each other meet in the meeting room;
 *   - outside work hours everybody stays at their desk (asleep, as before).
 *
 * No energy meters, no forced rest, nothing "realistic" — placement is a pure function of
 * "does this person have an open task?" so there is nothing to fall out of sync.
 */
import type { Plan, Room } from './plan';

export type Place = 'desk' | 'lounge';

export interface PlacedPerson {
  agentId: string;
  /** True while the person is actually on a task (progress or review). Backlog does not count —
      a task nobody has started is no reason to miss the break room. */
  hasOpenTasks: boolean;
}

/** The break room: the owner's lounge, or any room the visitor painted with the lounge theme. */
export const loungeRoom = (plan: Plan): Room | null =>
  plan.rooms.find((r) => r.id === 'lounge' || r.theme === 'lounge-area') ?? null;

/** The meeting room: the owner's boardroom, or any room painted with the boardroom theme. */
export const boardRoom = (plan: Plan): Room | null =>
  plan.rooms.find((r) => r.id === 'board' || r.theme === 'boardroom-hub') ?? null;

/**
 * The whole rule in one place. Every agent always lands somewhere: working → desk, free during
 * work hours → break room (if the floor has one — otherwise the desk is the fallback, never a
 * gap), anything else → desk.
 */
export function placeAgents(
  people: readonly PlacedPerson[],
  lounge: Room | null,
  workTime: boolean,
): Record<string, Place> {
  const places: Record<string, Place> = {};
  for (const person of people) {
    places[person.agentId] = !person.hasOpenTasks && workTime && lounge ? 'lounge' : 'desk';
  }
  return places;
}

/** A seat inside a room: a small grid around the middle so a crowd does not stand in one spot. */
export const spotInRoom = (room: Room, index: number) => ({
  x: room.x + room.w / 2 + (index % 3) * 52 - 52,
  y: room.y + room.h / 2 + Math.floor(index / 3) * 52 - 26,
});

/** The centre of a room or a desk — the endpoint of every walk. */
export const centreOf = (box: { x: number; y: number; w: number; h: number }) => ({
  x: box.x + box.w / 2,
  y: box.y + box.h / 2,
});
