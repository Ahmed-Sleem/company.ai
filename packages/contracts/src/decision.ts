/**
 * The decision inbox — the product's soul.
 *
 * A decision is four things at once, and all four are mandatory (doc `19`, "decision trust"):
 *   1. the rule that raised it           → `rule`
 *   2. the diff a human judges           → `diff`
 *   3. the audit trail who/when/why      → `audit`
 *   4. the outcome and its consequences  → `status` + `outcome`
 *
 * The precedence used when a decision is raised follows the ported donor
 * `agentkitai/agentgate` (MIT) `lib/request-decision.ts`, narrowed to this product:
 * budget → policy → human. Eval gates arrive with P4.
 */
import { z } from 'zod';
import { agentId, decisionId, id, isoDate, memberId, runId, taskId } from './company.js';

export const DECISION_KINDS = ['budget', 'task_review', 'model_change', 'policy', 'access'] as const;
export const decisionKind = z.enum(DECISION_KINDS);

export const DECISION_STATUS = ['pending', 'approved', 'rejected', 'expired'] as const;
export const decisionStatus = z.enum(DECISION_STATUS);

/** The rule that raised it: which policy, which threshold, the exact value observed. */
export const DECISION_RULE = z
  .object({
    id: z.string().min(1).max(80),
    source: z.enum(['budget', 'policy', 'agent_request', 'system']),
    observed: z.number(),
    threshold: z.number(),
    unit: z.enum(['cents', 'tokens', 'ratio', 'count']),
  })
  .strict();

/** The change a human is approving. `kind` says how to render it in the inbox. */
export const DECISION_DIFF = z
  .object({
    kind: z.enum(['text', 'plan', 'spend', 'model', 'permission']),
    summary: z.string().min(1).max(400),
    before: z.string().max(4000).nullable(),
    after: z.string().max(4000).nullable(),
    artifactRef: z.string().max(400).nullable(),
  })
  .strict();

export const DECISION_AUDIT = z
  .object({
    raisedByKind: z.enum(['agent', 'system', 'member']),
    raisedById: z.string().min(1).max(40),
    raisedAt: isoDate,
    decidedByKind: z.enum(['member', 'policy']).nullable(),
    /** Machine id (`mem_…` / `policy:budget`) — never a display name. */
    decidedById: z.string().max(40).nullable(),
    /** Human label for the audit view (impri's split: machine id vs actor label). */
    decidedByLabel: z.string().max(80).nullable(),
    decidedAt: isoDate.nullable(),
    note: z.string().max(500).nullable(),
  })
  .strict();

export const DECISION = z
  .object({
    id: decisionId,
    companyId: id('cmp'),
    kind: decisionKind,
    status: decisionStatus.default('pending'),
    taskId: taskId.nullable(),
    runId: runId.nullable(),
    agentId: agentId.nullable(),
    title: z.string().min(1).max(200),
    rule: DECISION_RULE,
    diff: DECISION_DIFF,
    audit: DECISION_AUDIT,
    /** What happened after the decision — filled in by the acting system. */
    outcome: z.string().max(500).nullable(),
    outcomeAt: isoDate.nullable(),
  })
  .strict();
export type Decision = z.infer<typeof DECISION>;

/** POST /decisions/:id/decide — the only way a decision changes status. */
export const DECISION_VERDICT = z
  .object({
    verdict: z.enum(['approve', 'reject']),
    memberId,
    note: z.string().max(500).nullable().default(null),
  })
  .strict();
export type DecisionVerdict = z.infer<typeof DECISION_VERDICT>;

/**
 * The precedence rules, ported from the donor and made explicit here so the API, the
 * worker and the tests all read the same function.
 */
export type InitialDecision =
  | { status: 'pending'; decidedBy: null; reason: string }
  | { status: 'approved'; decidedBy: string; reason: string }
  | { status: 'rejected'; decidedBy: string; reason: string };

export function decideInitialStatus(input: {
  budgetExceeded: { limitCents: number; spentCents: number } | null;
  policyAllows: boolean | null; // null = no policy matched
  policyReason?: string | null;
}): InitialDecision {
  const { budgetExceeded, policyAllows } = input;
  if (budgetExceeded) {
    return {
      status: 'pending', // never silently rejected: the owner decides (hard cap = block + ask)
      decidedBy: null,
      reason: `Monthly budget reached: ${budgetExceeded.spentCents} of ${budgetExceeded.limitCents} cents`,
    };
  }
  if (policyAllows === false) {
    return {
      status: 'rejected',
      decidedBy: 'policy',
      reason: input.policyReason ?? 'Blocked by policy',
    };
  }
  if (policyAllows === true) {
    return { status: 'approved', decidedBy: 'policy', reason: input.policyReason ?? 'Allowed by policy' };
  }
  return { status: 'pending', decidedBy: null, reason: 'Waiting for a human decision' };
}
