/**
 * Seed — the demo's own company, so the real app starts showing the designer's data.
 *
 * Names, roles, budgets, focus lines, tasks and decisions are read from the demo's `data`
 * object by hand and reproduced here (they are content, not tokens). Amounts in the demo are
 * dollars; the database stores integer cents, so $12.50 becomes 1250.
 *
 * Model prices below are **placeholders**: they exist so the ledger and the budget cap can be
 * exercised end to end. They are replaced by the live registry (doc `20` §20.1) at P2.
 */
import type { Db } from './client.js';
import { recordRun } from './repo.js';
import * as t from './schema.js';

const MODELS = [
  { providerModel: 'gpt-5.2', provider: 'openai', lane: 'strong', displayName: 'GPT-5.2',
    inputCentsPerMTok: 250, outputCentsPerMTok: 1000, contextWindow: 400_000, maxOutputTokens: 128_000 },
  { providerModel: 'claude-sonnet-4.6', provider: 'anthropic', lane: 'balanced', displayName: 'Claude Sonnet 4.6',
    inputCentsPerMTok: 300, outputCentsPerMTok: 1500, contextWindow: 200_000, maxOutputTokens: 64_000 },
  { providerModel: 'qwen3-coder:30b', provider: 'open', lane: 'cheap', displayName: 'Qwen3 Coder 30B (local)',
    inputCentsPerMTok: 0, outputCentsPerMTok: 0, contextWindow: 128_000, maxOutputTokens: 32_000 },
] as const;

/** Every insert in the seed expects exactly one row; a missing row means the schema changed. */
async function first<T>(rows: Promise<T[]>, what: string): Promise<T> {
  const [row] = await rows;
  if (!row) throw new Error(`seed: ${what} was not inserted`);
  return row;
}

export async function seed(db: Db) {
  const company = await first(db.insert(t.companies).values({ name: 'Acme Studio' }).returning(), 'company');

  const owner = await first(
    db.insert(t.members).values({ companyId: company.id, name: 'You', email: null, role: 'owner' }).returning(),
    'owner',
  );

  const models = await db.insert(t.models).values([...MODELS]).returning();
  const byLane = Object.fromEntries(models.map((m) => [m.lane, m])) as Record<'strong' | 'balanced' | 'cheap', (typeof models)[number]>;

  // Org: You → Aria → { Leo, Zara }. The demo's `manager` field, made explicit.
  const aria = await first(
    db.insert(t.agents).values({
      companyId: company.id, name: 'Aria', role: 'Lead engineer', title: 'Lead engineer',
      status: 'working', reportsTo: null, capabilities: ['TypeScript', 'System design', 'Testing'],
      budgetMonthlyCents: 4000,
      lastHeartbeatAt: new Date().toISOString(),
    }).returning(),
    'Aria',
  );

  const leo = await first(
    db.insert(t.agents).values({
      companyId: company.id, name: 'Leo', role: 'Software engineer', title: 'Software engineer',
      status: 'working', reportsTo: aria.id, capabilities: ['Node.js', 'Testing', 'APIs'],
      budgetMonthlyCents: 3000,
      lastHeartbeatAt: new Date().toISOString(),
    }).returning(),
    'Leo',
  );

  const zara = await first(
    db.insert(t.agents).values({
      companyId: company.id, name: 'Zara', role: 'Data analyst', title: 'Data analyst',
      status: 'error', reportsTo: aria.id, capabilities: ['SQL', 'Analytics'],
      budgetMonthlyCents: 2500,
      errorReason: 'Waiting for analytics access',
    }).returning(),
    'Zara',
  );

  await db.insert(t.edges).values([
    { companyId: company.id, fromAgentId: aria.id, toAgentId: leo.id, kind: 'reports_to' },
    { companyId: company.id, fromAgentId: aria.id, toAgentId: zara.id, kind: 'reports_to' },
    { companyId: company.id, fromAgentId: aria.id, toAgentId: leo.id, kind: 'delegates_to' },
  ]);

  await db.insert(t.agentModels).values([
    { agentId: aria.id, modelId: byLane.strong.id, fallbackModelIds: [byLane.balanced.id] },
    { agentId: leo.id, modelId: byLane.balanced.id, fallbackModelIds: [byLane.cheap.id] },
    { agentId: zara.id, modelId: byLane.cheap.id, fallbackModelIds: [] },
  ]);

  // The demo's meters read $12.50, $8.20 and $18.90 of spend. Money is recorded the product's
  // way — runs that write ledger entries — so the meter, the ledger and the audit trail agree.
  const spend: Array<[typeof aria, number, number, number]> = [
    [aria, 320_000, 42_000, 900], [aria, 180_000, 21_000, 350],
    [leo, 240_000, 30_000, 620], [leo, 70_000, 9_000, 200],
    [zara, 900_000, 120_000, 1400], [zara, 300_000, 48_000, 490],
  ];
  for (const [agent, promptTokens, completionTokens, costCents] of spend) {
    await recordRun(db, {
      companyId: company.id, agentId: agent.id,
      modelId: byLane.cheap.id, requestedModelId: byLane.cheap.id,
      status: 'succeeded', promptTokens, completionTokens, costCents,
    });
  }

  const goal = await first(
    db.insert(t.goals).values({
      companyId: company.id, title: 'Ship the streaming pipeline', ownerAgentId: aria.id, status: 'active',
    }).returning(),
    'goal',
  );

  await db.insert(t.tasks).values([
    { companyId: company.id, goalId: goal.id, title: 'Refine the streaming pipeline', ownerAgentId: aria.id,
      stage: 'progress', priority: 'high', progress: 65, dueDate: '2026-10-05T00:00:00.000Z' },
    { companyId: company.id, goalId: goal.id, title: 'Billing integration tests', ownerAgentId: leo.id,
      stage: 'progress', priority: 'medium', progress: 40, dueDate: '2026-10-06T00:00:00.000Z' },
    { companyId: company.id, goalId: goal.id, title: 'Understand cohort retention', ownerAgentId: zara.id,
      stage: 'review', priority: 'medium', progress: 90, dueDate: null },
    { companyId: company.id, goalId: goal.id, title: 'Refresh the design tokens', ownerAgentId: aria.id,
      stage: 'backlog', priority: 'low', progress: 0, dueDate: null },
    { companyId: company.id, goalId: goal.id, title: 'Q3 cost report', ownerAgentId: leo.id,
      stage: 'done', priority: 'medium', progress: 100, dueDate: null },
  ]);

  // The demo's two open decisions, in our four-part form (rule + diff + audit + outcome).
  const now = new Date().toISOString();
  await db.insert(t.decisions).values([
    {
      companyId: company.id, kind: 'access', status: 'pending', agentId: zara.id,
      title: 'Analytics read access',
      rule: { id: 'access.analytics.read', source: 'agent_request', observed: 0, threshold: 0, unit: 'count' },
      diff: { kind: 'permission', summary: 'Read-only access to the analytics view, to finish the retention report',
              before: 'No analytics access', after: 'Read-only analytics access', artifactRef: null },
      audit: { raisedByKind: 'agent', raisedById: zara.id, raisedAt: now, decidedByKind: null,
               decidedById: null, decidedByLabel: null, decidedAt: null, note: null },
    },
    {
      companyId: company.id, kind: 'budget', status: 'pending', agentId: aria.id,
      title: 'A little more room for engineering',
      rule: { id: 'budget.monthly.increase', source: 'agent_request', observed: 4000, threshold: 4450, unit: 'cents', increaseCents: 450 },
      diff: { kind: 'spend', summary: 'Increase this month’s engineering budget by $4.50 to finish the streaming work',
              before: '$40.00', after: '$44.50', artifactRef: null },
      audit: { raisedByKind: 'agent', raisedById: aria.id, raisedAt: now, decidedByKind: null,
               decidedById: null, decidedByLabel: null, decidedAt: null, note: null },
    },
  ]);

  const thread = await first(
    db.insert(t.threads).values({
      companyId: company.id, title: 'Streaming pipeline review',
      participantAgentIds: [aria.id], participantMemberIds: [owner.id], internal: false,
      lastMessageAt: now,
    }).returning(),
    'thread',
  );

  await db.insert(t.messages).values([
    {
      companyId: company.id, threadId: thread.id, authorKind: 'agent', authorId: aria.id,
      parts: [{ type: 'text', text: 'The new streaming path passes its tests. Ready for your review when you are.' }],
      createdAt: now,
    },
    {
      companyId: company.id, threadId: thread.id, authorKind: 'member', authorId: owner.id,
      parts: [{ type: 'text', text: 'Good. Keep the old path until the review is signed off.' }],
      createdAt: now,
    },
  ]);

  await recordRun(db, {
    companyId: company.id, agentId: zara.id,
    modelId: byLane.cheap.id, requestedModelId: byLane.cheap.id,
    status: 'failed', error: 'Waiting for analytics access',
  });

  return { companyId: company.id, ownerId: owner.id, agentIds: [aria.id, leo.id, zara.id] };
}
