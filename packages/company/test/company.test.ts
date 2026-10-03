/**
 * Database + rules tests, against real PostgreSQL (PGlite, in-process).
 *
 * These cover the two rules the product cannot get wrong: the review gate (nothing reaches
 * `done` without a human approval recorded as a decision) and the budget cap (the ledger,
 * not a cached counter, is what the cap reads).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createPgliteDb,
  schema,
  seed,
  listAgents,
  budgetState,
  raiseDecision,
  commitDecision,
  transitionTask,
  recordRun,
  openDecisions,
  monthSpendCents,
  RuleViolation,
  type Db,
} from '../src/index.js';

let db: Db;
let close: () => Promise<void>;
let companyId: string;
let ownerId: string;
let agentIds: string[];
let modelIds: Record<string, { id: string }>;

beforeAll(async () => {
  const created = await createPgliteDb();
  db = created.db;
  close = created.close;
  const s = await seed(db);
  companyId = s.companyId;
  ownerId = s.ownerId;
  agentIds = s.agentIds;
  const modelRows = await db.select().from(schema.models);
  modelIds = Object.fromEntries(modelRows.map((m) => [m.lane, { id: m.id }]));
});

afterAll(async () => {
  await close?.();
});

describe('seed and reads', () => {
  it('starts with the demo’s company, org and board', async () => {
    const agents = await listAgents(db, companyId);
    expect(agents.map((a) => a.name).sort()).toEqual(['Aria', 'Leo', 'Zara']);
    expect(agents.find((a) => a.name === 'Zara')?.status).toBe('error');
    expect(agents.find((a) => a.name === 'Leo')?.reportsTo).toBe(agents.find((a) => a.name === 'Aria')?.id);
  });

  it('enforces the 0–100 progress bound in the database itself', async () => {
    let message = '';
    try {
      await db.insert(schema.tasks).values({
        companyId, title: 'Bad progress', ownerAgentId: agentIds[0]!, progress: 140,
      });
    } catch (error) {
      const e = error as Error & { cause?: Error };
      message = `${e.message} ${e.cause?.message ?? ''}`;
    }
    expect(message).toMatch(/tasks_progress_range/);
  });
});

describe('the review gate', () => {
  it('refuses an agent approving its own task', async () => {
    const rows = await db.select().from(schema.tasks);
    const inReview = rows.find((r) => r.stage === 'review')!;
    await expect(
      transitionTask(db, {
        companyId, taskId: inReview.id, to: 'done',
        actor: { kind: 'agent', id: agentIds[0]! },
      }),
    ).rejects.toThrow(RuleViolation);
  });

  it('refuses approval without a decision, and accepts it with an approved one', async () => {
    const rows = await db.select().from(schema.tasks);
    const inReview = rows.find((r) => r.stage === 'review')!;

    await expect(
      transitionTask(db, { companyId, taskId: inReview.id, to: 'done', actor: { kind: 'member', id: ownerId } }),
    ).rejects.toThrow(/decision record is required/);

    const decision = await raiseDecision(db, {
      companyId, kind: 'task_review', title: 'Approve: Understand cohort retention',
      taskId: inReview.id, agentId: agentIds[2]!,
      rule: { id: 'task.review.done', source: 'agent_request', observed: 90, threshold: 100, unit: 'ratio' },
      diff: { kind: 'plan', summary: 'Mark the task complete', before: 'In review', after: 'Completed', artifactRef: null },
      audit: { raisedByKind: 'agent', raisedById: agentIds[2]!, raisedAt: new Date().toISOString(),
               decidedByKind: null, decidedById: null, decidedByLabel: null, decidedAt: null, note: null },
    });
    const outcome = await commitDecision(db, {
      decisionId: decision!.id, verdict: 'approve', memberId: ownerId, memberLabel: 'You',
    });
    expect(outcome.kind).toBe('ok');

    const moved = await transitionTask(db, {
      companyId, taskId: inReview.id, to: 'done',
      actor: { kind: 'member', id: ownerId }, decisionId: decision!.id,
    });
    expect(moved!.stage).toBe('done');
    expect(moved!.approvedByMemberId).toBe(ownerId);
    expect(moved!.progress).toBe(100);
  });

  it('rejects a decision used twice (idempotent commit)', async () => {
    const decisions = await openDecisions(db, companyId);
    const pending = decisions[0]!;
    const first = await commitDecision(db, { decisionId: pending.id, verdict: 'approve', memberId: ownerId, memberLabel: 'You' });
    const second = await commitDecision(db, { decisionId: pending.id, verdict: 'reject', memberId: ownerId, memberLabel: 'You' });
    expect(first.kind).toBe('ok');
    expect(second.kind).toBe('already_decided');
    expect(second.kind === 'already_decided' && second.status).toBe('approved');
  });

  it('never advances a done task again', async () => {
    const rows = await db.select().from(schema.tasks);
    const done = rows.find((r) => r.stage === 'done')!;
    await expect(
      transitionTask(db, { companyId, taskId: done.id, to: 'progress', actor: { kind: 'member', id: ownerId } }),
    ).rejects.toThrow(/not allowed/);
  });
});

describe('the budget cap', () => {
  it('reads spend from the ledger, not from a counter', async () => {
    const before = await monthSpendCents(db, agentIds[0]!);
    await recordRun(db, {
      companyId, agentId: agentIds[0]!, modelId: modelIds.strong!.id, requestedModelId: modelIds.strong!.id,
      status: 'succeeded', promptTokens: 1_000_000, completionTokens: 0, costCents: 250,
    });
    const after = await monthSpendCents(db, agentIds[0]!);
    expect(after - before).toBe(250);
  });

  it('marks an agent over its cap exactly when spend reaches the limit', async () => {
    const agentId = agentIds[1]!;
    let state = await budgetState(db, agentId);
    expect(state.exceeded).toBe(false);
    await recordRun(db, {
      companyId, agentId, modelId: modelIds.balanced!.id, requestedModelId: modelIds.balanced!.id,
      status: 'succeeded', costCents: state.remainingCents,
    });
    state = await budgetState(db, agentId);
    expect(state.spentCents).toBe(state.limitCents);
    expect(state.exceeded).toBe(true);
  });

  it('treats a zero limit as “no cap”, not as “no money”', async () => {
    const [free] = await db
      .insert(schema.agents)
      .values({ companyId, name: 'Uncapped', role: 'tester', budgetMonthlyCents: 0 })
      .returning();
    const state = await budgetState(db, free!.id);
    expect(state.exceeded).toBe(false);
    expect(state.remainingCents).toBe(0);
  });
});
