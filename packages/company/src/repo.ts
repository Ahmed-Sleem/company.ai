/**
 * Repository — every read and write the API and the worker perform.
 *
 * Rules this file obeys (from the governance contract and the ported donors):
 *   · one implementation of each rule: the review gate, the budget check and the idempotent
 *     decision commit exist here and nowhere else;
 *   · the decision commit mirrors impri's outcomes — `ok` / `already_decided` — so a double
 *     click or two approvers racing cannot decide twice;
 *   · money is integer cents; sums are computed by the database, not in JavaScript.
 */
import { and, asc, desc, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import type { Db } from './client.js';
import * as t from './schema.js';

export class RuleViolation extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'RuleViolation';
  }
}

/* ── reads ──────────────────────────────────────────────────────────────────── */

export async function listAgents(db: Db, companyId: string) {
  return db
    .select({
      id: t.agents.id,
      name: t.agents.name,
      role: t.agents.role,
      title: t.agents.title,
      status: t.agents.status,
      reportsTo: t.agents.reportsTo,
      capabilities: t.agents.capabilities,
      budgetMonthlyCents: t.agents.budgetMonthlyCents,
      spentMonthlyCents: t.agents.spentMonthlyCents,
      modelId: t.agentModels.modelId,
    })
    .from(t.agents)
    .leftJoin(t.agentModels, eq(t.agentModels.agentId, t.agents.id))
    .where(eq(t.agents.companyId, companyId))
    .orderBy(asc(t.agents.createdAt), asc(t.agents.name));
}

export async function getAgent(db: Db, companyId: string, agentId: string) {
  const [row] = await db
    .select()
    .from(t.agents)
    .where(and(eq(t.agents.companyId, companyId), eq(t.agents.id, agentId)))
    .limit(1);
  return row ?? null;
}

export async function listTasks(db: Db, companyId: string) {
  return db
    .select()
    .from(t.tasks)
    .where(eq(t.tasks.companyId, companyId))
    .orderBy(asc(t.tasks.stage), desc(t.tasks.priority), asc(t.tasks.createdAt));
}

export async function listDecisions(db: Db, companyId: string, status?: string) {
  const where = status
    ? and(eq(t.decisions.companyId, companyId), eq(t.decisions.status, status))
    : eq(t.decisions.companyId, companyId);
  return db.select().from(t.decisions).where(where).orderBy(desc(t.decisions.createdAt));
}

export async function listModels(db: Db) {
  return db.select().from(t.models).where(eq(t.models.retired, false)).orderBy(asc(t.models.lane));
}

export async function listRuns(db: Db, companyId: string, limit = 50) {
  return db
    .select()
    .from(t.runs)
    .where(eq(t.runs.companyId, companyId))
    .orderBy(desc(t.runs.startedAt))
    .limit(limit);
}

export async function getCompany(db: Db, companyId: string) {
  const [row] = await db.select().from(t.companies).where(eq(t.companies.id, companyId)).limit(1);
  return row ?? null;
}

/** The company the shell shows. Single-company at P0; multi-tenant keeps the same shape. */
export async function firstCompany(db: Db) {
  const [row] = await db.select().from(t.companies).orderBy(asc(t.companies.createdAt)).limit(1);
  return row ?? null;
}

/* ── money ──────────────────────────────────────────────────────────────────── */

/** Spend for one agent inside the calendar month containing `now`. Summed by the database. */
export async function monthSpendCents(db: Db, agentId: string, now = new Date()): Promise<number> {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${t.ledger.amountCents}), 0)::int` })
    .from(t.ledger)
    .where(and(eq(t.ledger.agentId, agentId), gte(t.ledger.at, start), lt(t.ledger.at, next)));
  return row?.total ?? 0;
}

export interface BudgetState {
  agentId: string;
  limitCents: number;
  spentCents: number;
  remainingCents: number;
  exceeded: boolean;
}

/** The one budget check. Hard caps are the owner's choice (C5): `exceeded` blocks the call. */
export async function budgetState(db: Db, agentId: string, now = new Date()): Promise<BudgetState> {
  const [agent] = await db
    .select({ limit: t.agents.budgetMonthlyCents })
    .from(t.agents)
    .where(eq(t.agents.id, agentId))
    .limit(1);
  if (!agent) throw new RuleViolation('agent_not_found', `No agent ${agentId}`);
  const spent = await monthSpendCents(db, agentId, now);
  const limit = agent.limit;
  return {
    agentId,
    limitCents: limit,
    spentCents: spent,
    remainingCents: Math.max(0, limit - spent),
    // A limit of 0 means "no cap configured" — the product's explicit convention.
    exceeded: limit > 0 && spent >= limit,
  };
}

/* ── writes ─────────────────────────────────────────────────────────────────── */

export interface RaiseDecisionInput {
  companyId: string;
  kind: string;
  title: string;
  rule: Record<string, unknown>;
  diff: Record<string, unknown>;
  audit: Record<string, unknown>;
  taskId?: string | null;
  runId?: string | null;
  agentId?: string | null;
}

export async function raiseDecision(db: Db, input: RaiseDecisionInput) {
  const [row] = await db
    .insert(t.decisions)
    .values({
      companyId: input.companyId,
      kind: input.kind,
      title: input.title,
      rule: input.rule,
      diff: input.diff,
      audit: input.audit,
      taskId: input.taskId ?? null,
      runId: input.runId ?? null,
      agentId: input.agentId ?? null,
    })
    .returning();
  return row;
}

export type DecisionOutcome =
  | { kind: 'ok'; status: 'approved' | 'rejected'; decisionId: string }
  | { kind: 'already_decided'; status: string; decisionId: string }
  | { kind: 'not_found' };

/**
 * The only way a decision changes state. Idempotent by construction: the UPDATE is
 * conditioned on `status = 'pending'`, so a second click (or a second approver) cannot
 * decide twice — it receives `already_decided`, exactly like the donor `impri`.
 *
 * `memberId` is recorded next to the human label: the machine id is what the audit joins on,
 * the label is only for display (the donor's split, adopted deliberately).
 */
export async function commitDecision(
  db: Db,
  input: { decisionId: string; verdict: 'approve' | 'reject'; memberId: string; memberLabel: string; note?: string | null; now?: Date },
): Promise<DecisionOutcome> {
  const now = (input.now ?? new Date()).toISOString();
  const [existing] = await db
    .select({ id: t.decisions.id, status: t.decisions.status, audit: t.decisions.audit })
    .from(t.decisions)
    .where(eq(t.decisions.id, input.decisionId))
    .limit(1);
  if (!existing) return { kind: 'not_found' };
  if (existing.status !== 'pending') {
    return { kind: 'already_decided', status: existing.status, decisionId: existing.id };
  }

  const status = input.verdict === 'approve' ? 'approved' : 'rejected';
  const audit = {
    ...(existing.audit as Record<string, unknown>),
    decidedByKind: 'member',
    decidedById: input.memberId,
    decidedByLabel: input.memberLabel,
    decidedAt: now,
    note: input.note ?? null,
  };

  const updated = await db
    .update(t.decisions)
    .set({ status, audit, outcome: status === 'approved' ? 'Approved — execution continues' : 'Rejected — execution stopped', outcomeAt: now })
    .where(and(eq(t.decisions.id, input.decisionId), eq(t.decisions.status, 'pending')))
    .returning();

  if (updated.length === 0) {
    // Another writer won the race between our read and our write.
    const [again] = await db
      .select({ status: t.decisions.status })
      .from(t.decisions)
      .where(eq(t.decisions.id, input.decisionId))
      .limit(1);
    return { kind: 'already_decided', status: again?.status ?? status, decisionId: input.decisionId };
  }
  return { kind: 'ok', status: status as 'approved' | 'rejected', decisionId: input.decisionId };
}

/**
 * Move a task. The review gate lives here: `review → done` is refused unless an approving
 * member is recorded, and the decision that the member made is stored on the task.
 */
export async function transitionTask(
  db: Db,
  input: {
    companyId: string;
    taskId: string;
    to: 'backlog' | 'progress' | 'review' | 'done';
    actor: { kind: 'agent' | 'member'; id: string };
    decisionId?: string | null;
    progress?: number;
    now?: Date;
  },
) {
  const [task] = await db
    .select()
    .from(t.tasks)
    .where(and(eq(t.tasks.companyId, input.companyId), eq(t.tasks.id, input.taskId)))
    .limit(1);
  if (!task) throw new RuleViolation('task_not_found', `No task ${input.taskId}`);

  const from = task.stage as 'backlog' | 'progress' | 'review' | 'done';
  const allowed: Record<typeof from, readonly string[]> = {
    backlog: ['progress'],
    progress: ['review', 'backlog'],
    review: ['done', 'progress'],
    done: [],
  };
  if (!allowed[from].includes(input.to)) {
    throw new RuleViolation('illegal_transition', `${from} → ${input.to} is not allowed`);
  }

  const now = (input.now ?? new Date()).toISOString();
  let approvedByMemberId: string | null = task.approvedByMemberId ?? null;

  if (from === 'review' && input.to === 'done') {
    if (input.actor.kind !== 'member') {
      throw new RuleViolation('review_gate_needs_human', 'Only a member can approve a task');
    }
    if (!input.decisionId) {
      throw new RuleViolation('review_gate_needs_decision', 'A decision record is required to approve');
    }
    const [decision] = await db
      .select({ status: t.decisions.status, taskId: t.decisions.taskId })
      .from(t.decisions)
      .where(eq(t.decisions.id, input.decisionId))
      .limit(1);
    if (!decision || decision.status !== 'approved' || decision.taskId !== input.taskId) {
      throw new RuleViolation('review_gate_needs_approval', 'The decision is not an approved review of this task');
    }
    approvedByMemberId = input.actor.id;
  }

  const [updated] = await db
    .update(t.tasks)
    .set({
      stage: input.to,
      approvedByMemberId,
      progress: input.to === 'done' ? 100 : (input.progress ?? task.progress),
      updatedAt: now,
    })
    .where(and(eq(t.tasks.id, input.taskId), eq(t.tasks.companyId, input.companyId)))
    .returning();
  return updated;
}

/** Record a run and its spend in one transaction-shaped helper. Returns the run row. */
export async function recordRun(
  db: Db,
  input: {
    companyId: string;
    agentId: string;
    taskId?: string | null;
    modelId: string;
    requestedModelId: string;
    status: 'running' | 'succeeded' | 'failed' | 'blocked';
    blockedByDecisionId?: string | null;
    promptTokens?: number;
    completionTokens?: number;
    costCents?: number;
    traceId?: string | null;
    error?: string | null;
    now?: Date;
  },
) {
  const now = (input.now ?? new Date()).toISOString();
  const [run] = await db
    .insert(t.runs)
    .values({
      companyId: input.companyId,
      agentId: input.agentId,
      taskId: input.taskId ?? null,
      modelId: input.modelId,
      requestedModelId: input.requestedModelId,
      status: input.status,
      blockedByDecisionId: input.blockedByDecisionId ?? null,
      promptTokens: input.promptTokens ?? 0,
      completionTokens: input.completionTokens ?? 0,
      costCents: input.costCents ?? 0,
      traceId: input.traceId ?? null,
      error: input.error ?? null,
      startedAt: now,
      endedAt: input.status === 'running' ? null : now,
    })
    .returning();
  if (!run) throw new RuleViolation('run_not_recorded', 'The run could not be recorded');

  if ((input.costCents ?? 0) > 0) {
    await db.insert(t.ledger).values({
      companyId: input.companyId,
      agentId: input.agentId,
      runId: run.id,
      kind: 'model_call',
      modelId: input.modelId,
      promptTokens: input.promptTokens ?? 0,
      completionTokens: input.completionTokens ?? 0,
      amountCents: input.costCents ?? 0,
      at: now,
    });
    await db
      .update(t.agents)
      .set({ spentMonthlyCents: sql`${t.agents.spentMonthlyCents} + ${input.costCents ?? 0}`, updatedAt: now })
      .where(eq(t.agents.id, input.agentId));
  }
  return run;
}

/** Link a blocked run to the decision that is holding it — the inbox's join key. */
export async function linkRunBlockedBy(db: Db, runId: string, decisionId: string) {
  await db
    .update(t.runs)
    .set({ blockedByDecisionId: decisionId })
    .where(eq(t.runs.id, runId));
}

/**
 * Apply an approved decision's consequences. Called after `commitDecision` so the *effect*
 * of an approval is as auditable as the approval itself. Unknown kinds are recorded as
 * "applied" with no side effect — never an error, so the inbox can hold future kinds too.
 */
export async function applyApprovedDecision(db: Db, decisionId: string, now = new Date()) {
  const [decision] = await db
    .select()
    .from(t.decisions)
    .where(eq(t.decisions.id, decisionId))
    .limit(1);
  if (!decision) throw new RuleViolation('decision_not_found', `No decision ${decisionId}`);
  if (decision.status !== 'approved') {
    return { applied: false, reason: `decision is ${decision.status}` };
  }

  const rule = decision.rule as { id?: string; increaseCents?: number };
  let outcome = 'Approved';

  if (decision.kind === 'budget' && decision.agentId && typeof rule.increaseCents === 'number') {
    const [agent] = await db
      .select({ limit: t.agents.budgetMonthlyCents, name: t.agents.name })
      .from(t.agents)
      .where(eq(t.agents.id, decision.agentId))
      .limit(1);
    if (agent) {
      const raised = agent.limit + rule.increaseCents;
      await db
        .update(t.agents)
        .set({ budgetMonthlyCents: raised, pauseReason: null, updatedAt: now.toISOString() })
        .where(eq(t.agents.id, decision.agentId));
      outcome = `Budget raised by ${rule.increaseCents} cents — ${agent.name} now has ${raised} cents per month`;
    }
  } else if (decision.kind === 'access') {
    // Permissions are enforced in P4; at P0 the approval is recorded so the trail is complete.
    outcome = 'Access granted (enforcement lands with the permissions phase)';
  }

  await db
    .update(t.decisions)
    .set({ outcome, outcomeAt: now.toISOString() })
    .where(eq(t.decisions.id, decisionId));
  return { applied: true, outcome };
}

/** Threads with their latest message — what the Conversations list shows. */
export async function listThreads(db: Db, companyId: string) {
  const rows = await db
    .select()
    .from(t.threads)
    .where(eq(t.threads.companyId, companyId))
    .orderBy(desc(t.threads.lastMessageAt));
  const withLast = await Promise.all(
    rows.map(async (thread) => {
      const [last] = await db
        .select({ parts: t.messages.parts, authorKind: t.messages.authorKind })
        .from(t.messages)
        .where(eq(t.messages.threadId, thread.id))
        .orderBy(desc(t.messages.createdAt))
        .limit(1);
      const firstText = Array.isArray(last?.parts)
        ? (last.parts.find((part) => (part as { type?: string }).type === 'text') as { text?: string } | undefined)?.text ?? null
        : null;
      return {
        id: thread.id,
        title: thread.title,
        internal: thread.internal,
        lastMessage: last ? { text: firstText ?? '', authorKind: last.authorKind } : null,
      };
    }),
  );
  return withLast;
}

/** Open decisions for a company — the inbox's default query. */
export async function openDecisions(db: Db, companyId: string) {
  return db
    .select()
    .from(t.decisions)
    .where(and(eq(t.decisions.companyId, companyId), eq(t.decisions.status, 'pending')))
    .orderBy(desc(t.decisions.createdAt));
}

export const _internals = { isNull };
