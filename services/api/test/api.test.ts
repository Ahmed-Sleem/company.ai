/**
 * API tests — the whole surface the GUI talks to, run in-process against real PostgreSQL.
 *
 * Each test asserts product behaviour, not implementation: a second click cannot decide
 * twice, an agent cannot approve its own work, a blocked call answers with a decision id.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPgliteDb, schema, seed, recordRun, type Db } from '@company/company';
import { createGateway, dbRegistry, mockAdapter } from '@company/gateway';
import { createApp, type App } from '../src/index.js';

let db: Db;
let close: () => Promise<void>;
let app: App;
let companyId: string;
let ownerId: string;
let agentIds: string[];
let decisionIds: string[];
let modelIds: string[];

beforeAll(async () => {
  const created = await createPgliteDb();
  db = created.db;
  close = created.close;
  const s = await seed(db);
  companyId = s.companyId;
  ownerId = s.ownerId;
  agentIds = s.agentIds;
  const models = await db.select().from(schema.models);
  const decisions = await db.select().from(schema.decisions);
  decisionIds = decisions.map((d) => d.id);
  modelIds = models.map((m) => m.id);

  const mock = mockAdapter();
  const gateway = createGateway({
    db, registry: dbRegistry(db),
    adapters: new Map([['openai', mock], ['anthropic', mock], ['open', mock]]),
  });
  app = createApp({ db, gateway, defaultMemberId: ownerId, defaultMemberLabel: 'You' });
});

afterAll(async () => {
  await close?.();
});

const get = (path: string) => app.request(path);
const post = (path: string, body: unknown) =>
  app.request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

describe('shell', () => {
  it('/api/health reports the database and the company', async () => {
    const res = await get('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, database: 'up', company: 'Acme Studio' });
  });

  it('/api/views/:view honours the demo’s data states', async () => {
    const ok = await (await get('/api/views/tasks?state=default')).json();
    expect(ok).toMatchObject({ view: 'tasks', state: 'default' });
    const empty = await (await get('/api/views/inbox?state=empty')).json();
    expect(empty.state).toBe('empty');
    const bad = await get('/api/views/nope');
    expect(bad.status).toBe(422);
  });
});

describe('team and budget', () => {
  it('lists the demo’s agents with their budget state', async () => {
    const body = await (await get('/api/agents')).json();
    expect(body.agents).toHaveLength(8); // the designer's roster, not a sample
    const aria = body.agents.find((a: { name: string }) => a.name === 'Aria');
    expect(aria.budget.limitCents).toBe(4000);
    expect(aria.budget.spentCents).toBe(1250);
    expect(aria.budget.exceeded).toBe(false);
    expect(body.agents.find((a: { name: string }) => a.name === 'Chloe').role).toBe('Content designer');
  });
});

describe('who is acting', () => {
  /**
   * The interface has to be told who the human is. It used to guess (`actor: { kind: 'member',
   * id: 'owner' }`), and every move on the board failed with a 422 that the board then blamed on
   * the rule — the server was right, the guess was wrong, and nothing said so. These two tests
   * keep the guessing fixed: the acting member comes from the database, and only that id moves work.
   */
  it('publishes the acting member instead of leaving the interface to invent one', async () => {
    const res = await get('/api/session');
    expect(res.status).toBe(200);
    const { member } = await res.json();
    expect(member.id).toBe(ownerId);
    expect(member.name).toBe('Vanil');
    expect(member.role).toBe('owner');
  });

  it('accepts that member and refuses an invented one', async () => {
    const tasks = await db.select().from(schema.tasks);
    const inProgress = tasks.find((t) => t.stage === 'progress')!;
    const { member } = await (await get('/api/session')).json();

    const refused = await post(`/api/tasks/${inProgress.id}/transition`, {
      to: 'review', actor: { kind: 'member', id: 'owner' },
    });
    expect(refused.status).toBe(422);
    expect((await refused.json()).error.fields).toContain('actor.id');

    const accepted = await post(`/api/tasks/${inProgress.id}/transition`, {
      to: 'review', actor: { kind: 'member', id: member.id },
    });
    expect(accepted.status).toBe(200);
    const rows = await db.select().from(schema.tasks);
    expect(rows.find((t) => t.id === inProgress.id)!.stage).toBe('review');
  });
});

describe('the review gate over HTTP', () => {
  it('refuses an agent approval, then accepts a member approval that carries a decision', async () => {
    const tasks = await db.select().from(schema.tasks);
    const inReview = tasks.find((t) => t.stage === 'review')!;

    const refused = await post(`/api/tasks/${inReview.id}/transition`, {
      to: 'done', actor: { kind: 'agent', id: agentIds[0] },
    });
    expect(refused.status).toBe(409);
    expect((await refused.json()).error.code).toBe('review_gate_needs_human');

    // Raise + approve a review decision through the API, then move the task.
    const raised = await (await post(`/api/decisions/${decisionIds[0]}/decide`, { verdict: 'approve' })).json();
    expect(raised.outcome.kind).toBe('ok');

    const decision = await db.select().from(schema.decisions);
    const approved = decision.find((d) => d.id === decisionIds[0])!;
    expect(approved.status).toBe('approved');
  });

  it('a decision cannot be decided twice (409 with the reason)', async () => {
    const res = await post(`/api/decisions/${decisionIds[0]}/decide`, { verdict: 'reject' });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.outcome.kind).toBe('already_decided');
    expect(body.outcome.status).toBe('approved');
  });
});

describe('the gateway over HTTP', () => {
  it('answers a normal call with a run and a cost', async () => {
    const res = await post(`/api/agents/${agentIds[1]}/call`, { prompt: 'summarise the sprint' });
    expect(res.status).toBe(200);
    const { outcome } = await res.json();
    expect(outcome.status).toBe('succeeded');
    expect(outcome.costCents).toBeGreaterThanOrEqual(0);
  });

  it('answers a blocked call with a decision id instead of an error', async () => {
    // Push agent 3 over its cap.
    const state = await (await get(`/api/agents/${agentIds[2]}`)).json();
    const remaining = state.budget.remainingCents;
    await recordRun(db, {
      companyId, agentId: agentIds[2]!, modelId: modelIds[2]!, requestedModelId: modelIds[2]!,
      status: 'succeeded', costCents: remaining,
    });

    const res = await post(`/api/agents/${agentIds[2]}/call`, { prompt: 'one more analysis' });
    expect(res.status).toBe(200);
    const { outcome } = await res.json();
    expect(outcome.status).toBe('blocked');
    expect(outcome.decisionId).toMatch(/^[0-9a-f-]{36}$/);

    const open = await (await get('/api/decisions?status=pending')).json();
    expect(open.decisions.some((d: { id: string }) => d.id === outcome.decisionId)).toBe(true);
  });
});

describe('the four data states exist for every list the GUI draws', () => {
  it('empty, error and restricted are simulated by the API, not faked in the UI', async () => {
    for (const state of ['loading', 'empty', 'error', 'restricted']) {
      const body = await (await get(`/api/views/team?state=${state}`)).json();
      expect(body).toMatchObject({ view: 'team', state, items: [] });
    }
  });
});
