/**
 * Seating people at desks — the one piece of the world that is a *rule*, not a drawing.
 *
 * It lives here, apart from the React view, because the design prototype seats the same demo
 * company on the same floor (`scripts/build-world-lib.mjs` ships this function to it). Two
 * implementations of "who sits where" would drift; one cannot.
 */
import type { Desk, Plan } from './layout.data';

/** The least a row has to be to be seated. The API's `AgentRow` satisfies this; so does the demo's. */
export interface SeatableAgent {
  id: string;
  department?: string | null;
}

/** The least a task has to be to be counted at a desk. */
export interface SeatTask {
  ownerAgentId?: string | null;
  stage: string;
}

export interface Seat<A extends SeatableAgent = SeatableAgent, T extends SeatTask = SeatTask> {
  desk: Desk;
  agent: A | null;
  tasks: T[];
  working: boolean;
}

/**
 * Seat people at desks — in three passes over the whole floor rather than one pass per desk.
 *
 *   1. everyone to a desk of **their own department**;
 *   2. whoever is left to a desk whose **room theme** matches what they do;
 *   3. whoever is still left to **any** free desk.
 *
 * The order is the point. A single pass that falls back early seats an engineer at the first free
 * desk — the executive wing — while their own lab stands empty; the browser showed exactly that
 * before this was rewritten.
 */
export function seatAgents<A extends SeatableAgent, T extends SeatTask>(
  plan: Plan,
  agents: readonly A[],
  tasks: readonly T[],
): Seat<A, T>[] {
  const byDesk = new Map<string, A | null>(plan.desks.map((desk) => [desk.id, null]));
  const free = [...agents];
  const take = (desk: Desk, match: (agent: A, desk: Desk) => boolean) => {
    if (byDesk.get(desk.id)) return;
    const found = free.find((agent) => match(agent, desk));
    if (!found) return;
    byDesk.set(desk.id, found);
    free.splice(free.indexOf(found), 1);
  };
  const themed = (agent: A, desk: Desk) => {
    const dept = (agent.department ?? '').toLowerCase();
    const room = desk.dept.toLowerCase();
    if (dept.includes('lead') || dept.includes('exec')) return room === 'executive';
    if (dept.includes('engineer') || dept.includes('model')) return room === 'engineering';
    if (dept.includes('design') || dept.includes('product')) return room === 'design';
    if (dept.includes('operat') || dept.includes('growth')) return room === 'operations';
    return false;
  };

  for (const desk of plan.desks) take(desk, (agent, at) => (agent.department ?? '') === at.dept);
  for (const desk of plan.desks) take(desk, themed);
  for (const desk of plan.desks) take(desk, () => true);

  return plan.desks.map((desk) => {
    const agent = byDesk.get(desk.id) ?? null;
    const mine = agent ? tasks.filter((task) => task.ownerAgentId === agent.id) : [];
    return { desk, agent, tasks: mine, working: mine.some((task) => task.stage === 'progress') };
  });
}
