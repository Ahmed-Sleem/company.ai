/**
 * Runs and the ledger — every paid thing the system does is a row.
 *
 * Fields follow the verified donor `danny-avila/LibreChat` (MIT)
 * `packages/data-schemas/src/methods/spendTokens.ts`: token types are `prompt` and
 * `completion` separately, the model is recorded verbatim, and money is integer cents.
 */
import { z } from 'zod';
import { agentId, companyId, decisionId, id, isoDate, modelId, runId, taskId } from './company.js';

export const RUN_STATUS = ['running', 'succeeded', 'failed', 'blocked'] as const;
export const runStatus = z.enum(RUN_STATUS);

export const RUN = z
  .object({
    id: runId,
    companyId,
    agentId,
    taskId: taskId.nullable(),
    /** Resolved model actually used (after fallback), not the requested one. */
    modelId,
    requestedModelId: modelId,
    status: runStatus.default('running'),
    /** Blocked runs name the decision that is holding them. */
    blockedByDecisionId: decisionId.nullable(),
    promptTokens: z.number().int().min(0).default(0),
    completionTokens: z.number().int().min(0).default(0),
    costCents: z.number().int().min(0).default(0),
    /** Provider request id / trace id — the join key to Langfuse. */
    traceId: z.string().max(120).nullable(),
    error: z.string().max(500).nullable(),
    startedAt: isoDate,
    endedAt: isoDate.nullable(),
  })
  .strict();
export type Run = z.infer<typeof RUN>;

export const LEDGER_KIND = ['model_call', 'sandbox', 'storage', 'other'] as const;

/** One spend row. The sum of `amountCents` over a month is what the budget cap reads. */
export const LEDGER_ENTRY = z
  .object({
    id: id('led'),
    companyId,
    agentId,
    runId,
    kind: z.enum(LEDGER_KIND),
    modelId: modelId.nullable(),
    promptTokens: z.number().int().min(0).default(0),
    completionTokens: z.number().int().min(0).default(0),
    amountCents: z.number().int().min(0),
    at: isoDate,
  })
  .strict();
export type LedgerEntry = z.infer<typeof LEDGER_ENTRY>;
