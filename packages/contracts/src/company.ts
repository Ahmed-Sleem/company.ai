/**
 * Company, people and agents — the nouns the whole product is built from.
 *
 * Shape follows the verified donor `paperclipai/paperclip` (MIT),
 * `packages/db/src/schema/agents.ts`, with this product's names and one addition:
 * the model assignment lives in `agentModels`, not inside the agent row.
 */
import { z } from 'zod';

/**
 * Identifiers are UUIDs (the database generates them, following the donor), wrapped in
 * branded types so an agent id can never be passed where a task id is expected — a class of
 * bug the compiler catches for free. Human-readable references (`TSK-142`, as the demo shows)
 * are a *display* concern and arrive with the first product screens.
 */
const uuid = () => z.string().uuid();

export const companyId = uuid().brand<'companyId'>();
export const agentId = uuid().brand<'agentId'>();
export const memberId = uuid().brand<'memberId'>();
export const goalId = uuid().brand<'goalId'>();
export const taskId = uuid().brand<'taskId'>();
export const runId = uuid().brand<'runId'>();
export const decisionId = uuid().brand<'decisionId'>();
export const threadId = uuid().brand<'threadId'>();
export const messageId = uuid().brand<'messageId'>();
export const modelId = uuid().brand<'modelId'>();
export const edgeId = uuid().brand<'edgeId'>();

/** Kept for call sites that need a raw uuid schema (e.g. path params). */
export const id = (_prefix?: string) => uuid();

export const isoDate = z.string().datetime({ offset: true });

export const COMPANY = z
  .object({
    id: companyId,
    name: z.string().min(1).max(120),
    createdAt: isoDate,
  })
  .strict();
export type Company = z.infer<typeof COMPANY>;

/** A human in the company. Kept separate from agents on purpose: different capabilities. */
export const MEMBER = z
  .object({
    id: memberId,
    companyId,
    name: z.string().min(1).max(120),
    email: z.string().email().nullable(),
    role: z.enum(['owner', 'admin', 'member', 'viewer']),
    createdAt: isoDate,
  })
  .strict();
export type Member = z.infer<typeof MEMBER>;

/**
 * An AI employee. `status` mirrors the demo's employee states and the donor's lifecycle;
 * `budgetMonthlyCents` / `spentMonthlyCents` are the donor's proven budget pair — money is
 * integer cents, never floats.
 */
export const AGENT_STATUS = ['idle', 'working', 'waiting', 'paused', 'error'] as const;
export const agentStatus = z.enum(AGENT_STATUS);

export const AGENT = z
  .object({
    id: agentId,
    companyId,
    name: z.string().min(1).max(120),
    role: z.string().min(1).max(80),
    title: z.string().max(120).nullable(),
    status: agentStatus.default('idle'),
    reportsTo: agentId.nullable(),
    capabilities: z.array(z.string().max(60)).max(24).default([]),
    budgetMonthlyCents: z.number().int().min(0).default(0),
    spentMonthlyCents: z.number().int().min(0).default(0),
    pauseReason: z.string().max(240).nullable(),
    errorReason: z.string().max(240).nullable(),
    lastHeartbeatAt: isoDate.nullable(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .strict();
export type Agent = z.infer<typeof AGENT>;

/** Which model an agent runs on, and how it may fall back. One row per agent. */
export const AGENT_MODEL = z
  .object({
    agentId,
    modelId,
    fallbackModelIds: z.array(modelId).max(4).default([]),
    temperature: z.number().min(0).max(2).default(0.2),
    maxOutputTokens: z.number().int().min(1).max(200_000).nullable(),
  })
  .strict();
export type AgentModel = z.infer<typeof AGENT_MODEL>;

/** Goal — what the company is trying to achieve; tasks and runs point back at it. */
export const GOAL = z
  .object({
    id: goalId,
    companyId,
    title: z.string().min(1).max(200),
    ownerAgentId: agentId.nullable(),
    targetDate: z.string().date().nullable(),
    status: z.enum(['active', 'achieved', 'dropped']).default('active'),
    createdAt: isoDate,
  })
  .strict();
export type Goal = z.infer<typeof GOAL>;

/** A relationship in the org graph (the network view draws these). */
export const EDGE_KIND = ['reports_to', 'collaborates_with', 'delegates_to', 'reviews'] as const;
export const EDGE = z
  .object({
    id: edgeId,
    companyId,
    fromAgentId: agentId,
    toAgentId: agentId,
    kind: z.enum(EDGE_KIND),
  })
  .strict();
export type Edge = z.infer<typeof EDGE>;
