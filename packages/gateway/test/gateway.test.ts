/**
 * Gateway tests — the budget cap and the decision loop, proved with a spy provider.
 *
 * The important assertions here:
 *   · when an agent is at its cap, the provider is **never called** (the call count is the proof);
 *   · a blocked call still leaves a `blocked` run and an inbox decision;
 *   · approving that decision raises the cap and the next call goes through;
 *   · an unavailable model falls back, and the run records both models.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPgliteDb, schema, seed, type Db } from '@company/company';
import { commitDecision, applyApprovedDecision, openDecisions, budgetState } from '@company/company';
import { createGateway, dbRegistry, mockAdapter, type ProviderAdapter } from '../src/index.js';

let db: Db;
let close: () => Promise<void>;
let companyId: string;
let ownerId: string;
let agentIds: string[];
let strongModelId: string;

beforeAll(async () => {
  const created = await createPgliteDb();
  db = created.db;
  close = created.close;
  const s = await seed(db);
  companyId = s.companyId;
  ownerId = s.ownerId;
  agentIds = s.agentIds;
  const models = await db.select().from(schema.models);
  strongModelId = models.find((m) => m.lane === 'strong')!.id;
});

afterAll(async () => {
  await close?.();
});

function makeGateway(adapter: ProviderAdapter & { calls: unknown[] }) {
  return createGateway({
    db,
    registry: dbRegistry(db),
    adapters: new Map([['openai', adapter], ['anthropic', adapter], ['open', adapter]]),
  });
}

describe('the hard cap, in the request path', () => {
  it('refuses the call, never touches the provider, and raises one decision', async () => {
    const adapter = mockAdapter();
    const spy = vi.spyOn(adapter, 'call');
    const gateway = makeGateway(adapter);

    // Spend the agent to its cap first.
    const state = await budgetState(db, agentIds[0]!);
    const { recordRun } = await import('@company/company');
    await recordRun(db, {
      companyId, agentId: agentIds[0]!, modelId: strongModelId, requestedModelId: strongModelId,
      status: 'succeeded', costCents: state.remainingCents,
    });
    expect((await budgetState(db, agentIds[0]!)).exceeded).toBe(true);

    const outcome = await gateway.callModel({
      companyId, agentId: agentIds[0]!, messages: [{ role: 'user', content: 'hello' }],
    });

    expect(outcome.status).toBe('blocked');
    expect(spy).not.toHaveBeenCalled();          // the point of an in-path cap
    if (outcome.status !== 'blocked') throw new Error('unreachable');

    const runs = await db.select().from(schema.runs);
    const blockedRun = runs.find((r) => r.id === outcome.runId)!;
    expect(blockedRun.status).toBe('blocked');
    expect(blockedRun.blockedByDecisionId).toBe(outcome.decisionId);
    expect(blockedRun.costCents).toBe(0);

    const decisions = await openDecisions(db, companyId);
    const raised = decisions.find((d) => d.id === outcome.decisionId)!;
    expect(raised.kind).toBe('budget');
    expect((raised.rule as { unit: string }).unit).toBe('cents');
    expect(raised.audit).toMatchObject({ raisedByKind: 'system' });
  });

  it('raising the cap through a decision lets the very next call through', async () => {
    const adapter = mockAdapter();
    const gateway = makeGateway(adapter);
    const decisions = await openDecisions(db, companyId);
    const budgetDecision = decisions.find((d) => d.kind === 'budget')!;

    const committed = await commitDecision(db, {
      decisionId: budgetDecision.id, verdict: 'approve', memberId: ownerId, memberLabel: 'You',
    });
    expect(committed.kind).toBe('ok');
    const applied = await applyApprovedDecision(db, budgetDecision.id);
    expect(applied.applied).toBe(true);
    expect(applied.outcome).toMatch(/Budget raised by/);

    expect((await budgetState(db, agentIds[0]!)).exceeded).toBe(false);
    const outcome = await gateway.callModel({
      companyId, agentId: agentIds[0]!, messages: [{ role: 'user', content: 'continue the work' }],
    });
    expect(outcome.status).toBe('succeeded');
    if (outcome.status !== 'succeeded') throw new Error('unreachable');
    expect(outcome.costCents).toBeGreaterThan(0);
    expect(adapter.calls.length).toBe(1);
  });
});

describe('calls, cost and fallback', () => {
  it('records the run and a ledger row in integer cents', async () => {
    const adapter = mockAdapter();
    const gateway = makeGateway(adapter);
    const before = await budgetState(db, agentIds[1]!);

    const outcome = await gateway.callModel({
      companyId, agentId: agentIds[1]!, messages: [{ role: 'user', content: 'draft the tests' }],
    });
    expect(outcome.status).toBe('succeeded');

    const after = await budgetState(db, agentIds[1]!);
    expect(after.spentCents - before.spentCents).toBe(outcome.status === 'succeeded' ? outcome.costCents : -1);
    expect(Number.isInteger(after.spentCents)).toBe(true);

    const ledgerRows = await db.select().from(schema.ledger);
    const row = ledgerRows.find((l) => l.runId === outcome.runId);
    expect(row?.promptTokens).toBeGreaterThan(0);
    expect(row?.kind).toBe('model_call');
  });

  it('falls back to the next model and records both requested and resolved', async () => {
    const adapter = mockAdapter({ failFor: ['gpt-5.2'] });
    const gateway = makeGateway(adapter);
    const outcome = await gateway.callModel({
      companyId, agentId: agentIds[0]!, messages: [{ role: 'user', content: 'try the strong one' }],
    });
    expect(outcome.status).toBe('succeeded');
    if (outcome.status !== 'succeeded') throw new Error('unreachable');
    expect(outcome.requestedModelId).toBe(strongModelId);
    expect(outcome.modelId).not.toBe(strongModelId);
    expect(adapter.calls.length).toBe(2); // one failure, one success — the chain worked
  });

  it('fails cleanly when every model in the chain is down', async () => {
    const adapter = mockAdapter({ failFor: ['gpt-5.2', 'claude-sonnet-4.6', 'qwen3-coder:30b'] });
    const gateway = makeGateway(adapter);
    const outcome = await gateway.callModel({
      companyId, agentId: agentIds[0]!, messages: [{ role: 'user', content: 'anything' }],
    });
    expect(outcome.status).toBe('failed');
    if (outcome.status !== 'failed') throw new Error('unreachable');
    const runs = await db.select().from(schema.runs);
    expect(runs.find((r) => r.id === outcome.runId)?.status).toBe('failed');
  });

  it('a model with an unknown provider is a failed run, not a crash', async () => {
    const adapter = mockAdapter();
    const gateway = createGateway({
      db,
      registry: {
        get: async () => ({ id: strongModelId, providerModel: 'ghost', provider: 'openai', lane: 'strong', inputCentsPerMTok: 1, outputCentsPerMTok: 1 }),
        fallbacksOf: async () => [],
        modelForAgent: async () => strongModelId,
      },
      adapters: new Map(), // no adapters at all
    });
    const outcome = await gateway.callModel({ companyId, agentId: agentIds[2]!, messages: [] });
    expect(outcome.status).toBe('failed');
    expect(outcome.status === 'failed' && outcome.reason).toMatch(/no adapter/);
    expect(adapter.calls.length).toBe(0);
  });
});
