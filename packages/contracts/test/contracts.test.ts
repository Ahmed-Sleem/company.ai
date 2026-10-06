/**
 * Contracts tests — and the GUI-fidelity test, which is the important one.
 *
 * `gui-fidelity` reads `design/designer-demo/ai-company-os.html` (never edited, byte-verified)
 * and fails if this product's navigation ids, task stages, priorities or state names stop
 * matching the locked design. That is how "works with the GUI" is enforced rather than hoped for.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  VIEW_IDS,
  VIEWS,
  DATA_STATES,
  TASK_STAGES,
  STAGE_LABELS,
  TASK_PRIORITIES,
  PRIORITY_LABELS,
  AGENT_STATUS,
  AGENT,
  TASK,
  DECISION,
  MODEL,
  MESSAGE,
  RUN,
  canTransition,
  offeredTransitions,
  requiresHumanApproval,
  TRANSITION_REASONS,
  decideInitialStatus,
  costCents,
} from '../src/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const DEMO = readFileSync(
  join(here, '..', '..', '..', 'design/designer-demo/ai-company-os.html'),
  'utf8',
);
const OWNER_DEMO = join(here, '..', '..', '..', 'design/owner-demo/acme-studio-os.html');

describe('GUI fidelity — the contracts match the designer’s demo', () => {
  it('sidebar views are exactly the demo’s NAV array, in order', () => {
    const nav = /const NAV=\[\[(.*?)\]\]/.exec(DEMO);
    expect(nav, 'NAV array not found in the demo').toBeTruthy();
    const whole = /const NAV=\[\[[\s\S]*?\]\]/.exec(DEMO)![0];
    const demoIds = [...whole.matchAll(/'([a-z]+)','([^']+)','[a-z]+'\]/g)].map((m) => m[1]);
    expect(demoIds).toHaveLength(6);
    // Changed 2026-10-06, and observed failing first: `world` is the owner's seventh view, not
    // the designer's, so the designer's six must still match our leading six exactly and in
    // order — and the seventh is checked against the owner's demo in the test below.
    expect(demoIds).toEqual([...VIEW_IDS].slice(0, 6));
  });

  it('the seventh view is the owner’s, and it is in the owner’s demo’s NAV', () => {
    const ownerDemo = readFileSync(OWNER_DEMO, 'utf8');
    expect(ownerDemo).toContain("['world','World Map'");
    expect([...VIEW_IDS].slice(6)).toEqual(['world']);
    expect(VIEWS.find((v) => v.id === 'world')?.label).toBe('World Map');
  });

  it('the demo labels its fifth view “Conversations”, as we do', () => {
    expect(DEMO).toContain("['comms','Conversations','chat']");
    expect(VIEWS.find((v) => v.id === 'comms')?.label).toBe('Conversations');
  });

  it('task stage ids and their EN/AR labels exist verbatim in the demo', () => {
    for (const stage of TASK_STAGES) {
      expect(DEMO, `stage id ${stage}`).toContain(`stage:'${stage}'`);
      expect(DEMO, `EN label for ${stage}`).toContain(STAGE_LABELS[stage].en);
      expect(DEMO, `AR label for ${stage}`).toContain(STAGE_LABELS[stage].ar);
    }
    // and no fifth stage sneaked in
    const stagesInDemo = new Set([...DEMO.matchAll(/stage:'([a-z]+)'/g)].map((m) => m[1]));
    expect([...stagesInDemo].sort()).toEqual(['backlog', 'done', 'progress', 'review']);
  });

  it('priority ids and labels exist verbatim in the demo', () => {
    for (const p of TASK_PRIORITIES) {
      expect(DEMO).toContain(`priority:'${p}'`);
      expect(DEMO).toContain(PRIORITY_LABELS[p].en);
      expect(DEMO).toContain(PRIORITY_LABELS[p].ar);
    }
  });

  it('the five data states are exactly the demo’s state-preview list', () => {
    const literal = /\['default','loading','empty','error','restricted'\]/.exec(DEMO);
    expect(literal, 'state list not found in the demo').toBeTruthy();
    expect([...DATA_STATES]).toEqual(['default', 'loading', 'empty', 'error', 'restricted']);
  });
});

describe('schema behaviour', () => {
  const agent = {
    id: '11111111-1111-4111-8111-111111111111',
    companyId: '22222222-2222-4222-8222-222222222222',
    name: 'Aria',
    role: 'engineer',
    title: 'Staff Engineer',
    status: 'idle',
    reportsTo: null,
    capabilities: [],
    budgetMonthlyCents: 50_000,
    spentMonthlyCents: 0,
    pauseReason: null,
    errorReason: null,
    lastHeartbeatAt: null,
    createdAt: '2026-10-03T00:00:00+00:00',
    updatedAt: '2026-10-03T00:00:00+00:00',
  };

  it('accepts a valid agent and applies the donor defaults', () => {
    const parsed = AGENT.parse(agent);
    expect(parsed.status).toBe('idle');
    expect(parsed.spentMonthlyCents).toBe(0);
    expect(AGENT_STATUS).toContain(parsed.status);
  });

  it('rejects a malformed id, a negative budget, and an unknown key', () => {
    expect(AGENT.safeParse({ ...agent, id: 'agent-1' }).success).toBe(false);
    expect(AGENT.safeParse({ ...agent, budgetMonthlyCents: -1 }).success).toBe(false);
    expect(AGENT.safeParse({ ...agent, secret: 'x' }).success).toBe(false);
  });

  it('task transitions are bounded and the review gate needs a human', () => {
    expect(canTransition('backlog', 'progress')).toBe(true);
    expect(canTransition('backlog', 'done')).toBe(false);
    expect(canTransition('done', 'progress')).toBe(false);
    expect(requiresHumanApproval('review', 'done')).toBe(true);
    expect(requiresHumanApproval('progress', 'review')).toBe(false);
  });

  it('rejects an out-of-range task progress', () => {
    const base = {
      id: '33333333-3333-4333-8333-333333333333', companyId: '22222222-2222-4222-8222-222222222222', goalId: null, title: 'Ship it',
      ownerAgentId: '11111111-1111-4111-8111-111111111111', stage: 'progress', priority: 'high', progress: 101,
      dueDate: null, reviewRequestedByRunId: null, approvedByMemberId: null,
      createdAt: '2026-10-03T00:00:00+00:00', updatedAt: '2026-10-03T00:00:00+00:00',
    };
    expect(TASK.safeParse(base).success).toBe(false);
    expect(TASK.safeParse({ ...base, progress: 100 }).success).toBe(true);
  });

  it('decision precedence: budget blocks and asks, policy denies, otherwise pending', () => {
    expect(decideInitialStatus({ budgetExceeded: { limitCents: 1000, spentCents: 1001 }, policyAllows: true }).status)
      .toBe('pending');
    expect(decideInitialStatus({ budgetExceeded: null, policyAllows: false }).status).toBe('rejected');
    expect(decideInitialStatus({ budgetExceeded: null, policyAllows: true }).status).toBe('approved');
    expect(decideInitialStatus({ budgetExceeded: null, policyAllows: null }).status).toBe('pending');
  });

  it('a decision keeps rule, diff and audit together (all three are mandatory)', () => {
    const d = {
      id: '44444444-4444-4444-8444-444444444444', companyId: '22222222-2222-4222-8222-222222222222', kind: 'budget', status: 'pending',
      taskId: null, runId: null, agentId: '11111111-1111-4111-8111-111111111111', title: 'Budget reached',
      rule: { id: 'budget.monthly', source: 'budget', observed: 50001, threshold: 50000, unit: 'cents' },
      diff: { kind: 'spend', summary: 'One more call would exceed the monthly cap', before: null, after: null, artifactRef: null },
      audit: {
        raisedByKind: 'system', raisedById: 'policy:budget', raisedAt: '2026-10-03T00:00:00+00:00',
        decidedByKind: null, decidedById: null, decidedByLabel: null, decidedAt: null, note: null,
      },
      outcome: null, outcomeAt: null,
    };
    expect(DECISION.safeParse(d).success).toBe(true);
    expect(DECISION.safeParse({ ...d, rule: undefined }).success).toBe(false);
    expect(DECISION.safeParse({ ...d, audit: { ...d.audit, decidedById: 'Someone Name' } }).success).toBe(true);
  });

  it('model cost is integer cents, rounded up, and registry fields are required', () => {
    const model = MODEL.parse({
      id: '55555555-5555-4555-8555-555555555555', providerModel: 'gpt-5.2', provider: 'openai', lane: 'strong',
      displayName: 'GPT-5.2', inputCentsPerMTok: 250, outputCentsPerMTok: 1000,
      contextWindow: 400_000, maxOutputTokens: 128_000, lifecycle: 'ga', lifecycleChangedAt: null,
      supports: {},
    });
    expect(costCents(model, 1_000_000, 0)).toBe(250);
    expect(costCents(model, 1, 1)).toBe(1); // rounded up, never zero-cost
    expect(MODEL.safeParse({ ...model, contextWindow: -1 }).success).toBe(false);
  });

  it('message parts model an approval the way the donor does', () => {
    const message = {
      id: '66666666-6666-4666-8666-666666666666', threadId: '77777777-7777-4777-8777-777777777777', companyId: '22222222-2222-4222-8222-222222222222',
      authorKind: 'agent', authorId: '11111111-1111-4111-8111-111111111111',
      parts: [{ type: 'tool', name: 'email.send', approval: { id: 'ap_1', approved: null }, result: null }],
      runId: '88888888-8888-4888-8888-888888888888', modelId: '55555555-5555-4555-8555-555555555555', createdAt: '2026-10-03T00:00:00+00:00',
    };
    const parsed = MESSAGE.parse(message);
    const part = parsed.parts[0];
    expect(part && part.type === 'tool' ? part.approval?.approved : 'missing').toBeNull();
    expect(MESSAGE.safeParse({ ...message, parts: [{ type: 'nope' }] }).success).toBe(false);
  });

  it('a run records the resolved model as well as the requested one', () => {
    const run = RUN.parse({
      id: '88888888-8888-4888-8888-888888888888', companyId: '22222222-2222-4222-8222-222222222222', agentId: '11111111-1111-4111-8111-111111111111',
      taskId: null, modelId: '99999999-9999-4999-8999-999999999999', requestedModelId: '55555555-5555-4555-8555-555555555555',
      status: 'running', blockedByDecisionId: null, promptTokens: 0, completionTokens: 0,
      costCents: 0, traceId: null, error: null, startedAt: '2026-10-03T00:00:00+00:00', endedAt: null,
    });
    expect(run.modelId).not.toBe(run.requestedModelId);
  });
});

describe('the offers the server makes are the rule, not a guess', () => {
  it('offers only the edges of the state machine', () => {
    expect(offeredTransitions('backlog', { hasApprovedDecision: false }).map((o) => o.to)).toEqual(['progress']);
    expect(offeredTransitions('progress', { hasApprovedDecision: false }).map((o) => o.to)).toEqual(['review', 'backlog']);
    expect(offeredTransitions('done', { hasApprovedDecision: false })).toEqual([]);
  });

  it('refuses review → done until a person has decided, and says why', () => {
    const blocked = offeredTransitions('review', { hasApprovedDecision: false });
    const finish = blocked.find((offer) => offer.to === 'done');
    expect(finish?.ok).toBe(false);
    expect(finish?.reason?.en).toBe(TRANSITION_REASONS.needs_approval.en);
    expect(finish?.reason?.ar).toBe(TRANSITION_REASONS.needs_approval.ar);

    const allowed = offeredTransitions('review', { hasApprovedDecision: true });
    expect(allowed.find((offer) => offer.to === 'done')?.ok).toBe(true);
  });

  it('never offers a move that the state machine forbids', () => {
    for (const from of TASK_STAGES) {
      for (const offer of offeredTransitions(from, { hasApprovedDecision: true })) {
        expect(canTransition(from, offer.to), `${from} → ${offer.to}`).toBe(true);
      }
    }
  });
});
