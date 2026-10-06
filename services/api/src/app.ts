/**
 * The API. One Hono app, injected dependencies, no global state — so tests run it in-process
 * against a real PostgreSQL (PGlite) and production runs the same code over node-postgres.
 *
 * Everything the GUI shows comes from here: the shell's company, the board's tasks, the
 * inbox's decisions. Errors are answered in the product's vocabulary (RuleViolation → 409
 * with the rule's code), never as raw database text (rules §16: no internal identifiers).
 */
import { Hono } from 'hono';
import { zValidator as zv } from '@hono/zod-validator';
import { z } from 'zod';
import {
  DECISION_VERDICT,
  offeredTransitions,
  taskStage,
  viewStateQuery,
  TASK_TRANSITION,
  VIEW_IDS,
  type ViewId,
} from '@company/contracts';
import {
  RuleViolation,
  applyApprovedDecision,
  budgetState,
  commitDecision,
  firstCompany,
  getAgent,
  getCompany,
  actingMember,
  listAgents,
  listDecisions,
  listModels,
  listRuns,
  listTasks,
  listThreads,
  openDecisions,
  transitionTask,
} from '@company/company';
import type { Db } from '@company/company';
import type { Gateway } from '@company/gateway';

export interface AppDeps {
  db: Db;
  gateway: Gateway;
  version?: string;
  /** Demo member used when a route needs "who is deciding" and no auth exists yet (P0). */
  defaultMemberId?: string;
  defaultMemberLabel?: string;
}

export function createApp(deps: AppDeps) {
  const app = new Hono();

  /** One answer for every invalid payload: 422 with the offending paths, in product language. */
  const zValidator = ((target: never, schema: never) =>
    zv(target as never, schema as never, (result, c) => {
      if (!result.success) {
        const issues = (result as { error?: { issues?: Array<{ path: Array<string | number> }> } }).error?.issues ?? [];
        return c.json(
          {
            error: {
              code: 'invalid_request',
              message: 'Some fields need attention.',
              fields: [...new Set(issues.map((issue) => issue.path.join('.')))],
            },
          },
          422,
        );
      }
      return undefined;
    })) as typeof zv;
  const version = deps.version ?? '0.1.0-p0';

  app.onError((error, c) => {
    if (error instanceof RuleViolation) {
      return c.json({ error: { code: error.code, message: error.message } }, 409);
    }
    // Never leak internals to the client; the server log keeps the detail.
    console.error('[api] unhandled', error);
    return c.json({ error: { code: 'internal', message: 'Something went wrong on our side.' } }, 500);
  });

  const companyOf = async () => {
    const company = await firstCompany(deps.db);
    if (!company) throw new RuleViolation('no_company', 'No company has been created yet');
    return company;
  };

  /* ── shell ─────────────────────────────────────────────────────────────── */

  app.get('/api/health', async (c) => {
    const company = await firstCompany(deps.db);
    return c.json({ ok: true, version, database: 'up', company: company?.name ?? null });
  });

  app.get('/api/company', async (c) => {
    const company = await companyOf();
    const withDetail = await getCompany(deps.db, company.id);
    return c.json({ company: withDetail });
  });

  /**
   * Who is acting. The interface reads this instead of inventing a member id: it once sent
   * `{ kind: 'member', id: 'owner' }`, the schema rejected it (ids are opaque uuids), and every
   * move on the board failed behind a message that blamed the rule rather than the guess.
   */
  app.get('/api/session', async (c) => {
    const company = await companyOf();
    const member = await actingMember(deps.db, company.id);
    return c.json({ member });
  });

  /** The shell's state-preview hook: returns the same shape whatever the state is. */
  app.get('/api/views/:view', zValidator('param', z.object({ view: z.enum(VIEW_IDS) })), async (c) => {
    const view = c.req.param('view') as ViewId;
    const { state } = viewStateQuery.parse(c.req.query());
    if (state !== 'default') return c.json({ view, state, items: [] });
    return c.json({ view, state: 'default', items: [] });
  });

  /* ── team, tasks, models ──────────────────────────────────────────────── */

  app.get('/api/agents', async (c) => {
    const company = await companyOf();
    const agents = await listAgents(deps.db, company.id);
    const withBudget = await Promise.all(
      agents.map(async (a) => ({ ...a, budget: await budgetState(deps.db, a.id) })),
    );
    return c.json({ agents: withBudget });
  });

  app.get('/api/agents/:id', async (c) => {
    const company = await companyOf();
    const agent = await getAgent(deps.db, company.id, c.req.param('id'));
    if (!agent) return c.json({ error: { code: 'agent_not_found', message: 'No such agent' } }, 404);
    return c.json({ agent, budget: await budgetState(deps.db, agent.id) });
  });

  /**
   * The board's data: every task, who owns it, and — the important part — which moves this
   * server will actually accept right now, each with its reason when it will not.
   * The interface renders these offers; it never decides for itself what is allowed, because
   * a second copy of the rule is a second answer waiting to disagree with the first.
   */
  app.get('/api/tasks', async (c) => {
    const company = await companyOf();
    const tasks = await listTasks(deps.db, company.id);
    const agents = await listAgents(deps.db, company.id);
    const approved = await listDecisions(deps.db, company.id, 'approved');
    const approvedTaskIds = new Set(approved.map((row) => row.taskId).filter(Boolean) as string[]);
    return c.json({
      tasks: tasks.map((task) => {
        const owner = agents.find((agent) => agent.id === task.ownerAgentId);
        return {
          ...task,
          owner: owner ? { id: owner.id, name: owner.name, role: owner.role, avatar: owner.avatar } : null,
          // The stored stage is parsed through the contract, so a value the database should
          // never hold fails here — loudly, at the boundary — instead of reaching the board.
          offers: offeredTransitions(taskStage.parse(task.stage), { hasApprovedDecision: approvedTaskIds.has(task.id) }),
        };
      }),
    });
  });

  app.post(
    '/api/tasks/:id/transition',
    zValidator('json', TASK_TRANSITION.omit({ taskId: true })),
    async (c) => {
      const company = await companyOf();
      const body = c.req.valid('json');
      const task = await transitionTask(deps.db, {
        companyId: company.id,
        taskId: c.req.param('id'),
        to: body.to,
        actor: { kind: body.actor.kind, id: body.actor.id },
        decisionId: body.decisionId,
      });
      return c.json({ task });
    },
  );

  app.get('/api/models', async (c) => c.json({ models: await listModels(deps.db) }));

  app.get('/api/threads', async (c) => {
    const company = await companyOf();
    return c.json({ threads: await listThreads(deps.db, company.id) });
  });
  app.get('/api/runs', async (c) => {
    const company = await companyOf();
    return c.json({ runs: await listRuns(deps.db, company.id) });
  });

  /* ── the inbox ────────────────────────────────────────────────────────── */

  app.get('/api/decisions', async (c) => {
    const company = await companyOf();
    const status = c.req.query('status');
    const decisions = status === 'pending'
      ? await openDecisions(deps.db, company.id)
      : await listDecisions(deps.db, company.id, status);
    return c.json({ decisions });
  });

  app.post(
    '/api/decisions/:id/decide',
    zValidator('json', DECISION_VERDICT.partial({ memberId: true })),
    async (c) => {
      const body = c.req.valid('json');
      const company = await companyOf();
      const member = await actingMember(deps.db, company.id);
      const outcome = await commitDecision(deps.db, {
        decisionId: c.req.param('id'),
        verdict: body.verdict,
        // The named member if the caller sent one, then the configured default, then the company's
        // own owner — never a fabricated id (the placeholder used to be `mem_000…`, which could
        // not exist in this database at all).
        memberId: (body.memberId ?? deps.defaultMemberId ?? member?.id ?? '') as string,
        memberLabel: deps.defaultMemberLabel ?? member?.name ?? 'You',
        note: body.note,
      });
      if (outcome.kind === 'not_found') {
        return c.json({ error: { code: 'decision_not_found', message: 'No such decision' } }, 404);
      }
      if (outcome.kind === 'already_decided') return c.json({ outcome }, 409);
      const applied = await applyApprovedDecision(deps.db, outcome.decisionId);
      return c.json({ outcome, applied });
    },
  );

  /* ── one model call, through the gateway (the demo/harness route) ─────── */

  app.post(
    '/api/agents/:id/call',
    zValidator('json', z.object({ prompt: z.string().min(1).max(4000), taskId: z.string().uuid().nullish() })),
    async (c) => {
      const company = await companyOf();
      const { prompt, taskId } = c.req.valid('json');
      const outcome = await deps.gateway.callModel({
        companyId: company.id,
        agentId: c.req.param('id'),
        taskId: taskId ?? null,
        messages: [{ role: 'user', content: prompt }],
      });
      return c.json({ outcome });
    },
  );

  return app;
}

export type App = ReturnType<typeof createApp>;
