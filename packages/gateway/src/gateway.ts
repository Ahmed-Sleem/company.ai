/**
 * Our gateway — the only door between the product and any model provider.
 *
 * Order of operations for every call (this order is the product's promise):
 *   1. resolve the agent's model and its fallback chain from the registry;
 *   2. ask the budget: over cap → **refuse**, write a `blocked` run, and raise a decision.
 *      Money that is not there is never spent and the owner is asked, not surprised;
 *   3. call the provider, falling back on failure (recording both the requested and the
 *      resolved model — the donor LibreChat lesson);
 *   4. write the run and the ledger row, in integer cents, rounded up.
 */
import { costCents } from '@company/contracts';
import { budgetState, linkRunBlockedBy, raiseDecision, recordRun } from '@company/company';
import type { CallOutcome, GatewayDeps, ModelCallRequest } from './types.js';

export function createGateway(deps: GatewayDeps) {
  const now = deps.now ?? (() => new Date());

  async function callModel(input: {
    companyId: string;
    agentId: string;
    taskId?: string | null;
    messages: import('./types.js').ChatMessage[];
    /** Overrides the agent's default model — used by tests and by the owner in Settings. */
    modelId?: string;
    maxOutputTokens?: number | null;
    temperature?: number;
    traceId?: string;
  }): Promise<CallOutcome> {
    const requestedModelId = input.modelId ?? (await deps.registry.modelForAgent(input.agentId));
    if (!requestedModelId) {
      throw new Error(`agent ${input.agentId} has no model assigned`);
    }

    /* 1 + 2 — the cap, checked before anything is spent. */
    const budget = await budgetState(deps.db, input.agentId, now());
    if (budget.exceeded) {
      const run = await recordRun(deps.db, {
        companyId: input.companyId, agentId: input.agentId, taskId: input.taskId ?? null,
        modelId: requestedModelId, requestedModelId, status: 'blocked',
        traceId: input.traceId ?? null,
        error: `Monthly budget reached (${budget.spentCents}/${budget.limitCents} cents)`,
        now: now(),
      });
      const decision = await raiseDecision(deps.db, {
        companyId: input.companyId,
        kind: 'budget',
        title: `${(await deps.registry.get(requestedModelId))?.lane ?? 'model'} call blocked by the monthly budget`,
        rule: {
          id: 'budget.monthly.cap', source: 'budget',
          observed: budget.spentCents, threshold: budget.limitCents, unit: 'cents',
          // Approving this decision raises the cap by this much (owner's C5 choice: hard caps,
          // with the way forward being an explicit decision rather than a silent overrun).
          increaseCents: budget.limitCents,
        },
        diff: {
          kind: 'spend',
          summary: `The agent has spent its whole monthly budget. Approving raises the cap; rejecting keeps it.`,
          before: `${budget.limitCents} cents`, after: `${budget.limitCents + budget.limitCents} cents`,
          artifactRef: null,
        },
        audit: {
          raisedByKind: 'system', raisedById: 'policy:budget', raisedAt: now().toISOString(),
          decidedByKind: null, decidedById: null, decidedByLabel: null, decidedAt: null, note: null,
        },
        runId: run.id, agentId: input.agentId,
      });
      if (!decision) throw new Error('the budget decision could not be raised');
      await linkRunBlockedBy(deps.db, run.id, decision.id);
      return {
        status: 'blocked', runId: run.id, decisionId: decision.id,
        reason: `Monthly budget reached: ${budget.spentCents}/${budget.limitCents} cents`,
      };
    }

    /* 3 — the call, with the fallback chain. */
    const chain = [requestedModelId, ...(await deps.registry.fallbacksOf(input.agentId))];
    let lastError: string | null = null;

    for (const modelId of chain) {
      const model = await deps.registry.get(modelId);
      if (!model) {
        lastError = `model ${modelId} is not in the registry`;
        continue;
      }
      const adapter = deps.adapters.get(model.provider);
      if (!adapter) {
        lastError = `no adapter for provider ${model.provider}`;
        continue;
      }
      const request: ModelCallRequest = {
        providerModel: model.providerModel,
        provider: model.provider,
        messages: input.messages,
        temperature: input.temperature ?? 0.2,
        maxOutputTokens: input.maxOutputTokens ?? null,
        ...(input.traceId ? { traceId: input.traceId } : {}),
      };
      try {
        const result = await adapter.call(request);
        const cents = costCents(
          { inputCentsPerMTok: model.inputCentsPerMTok, outputCentsPerMTok: model.outputCentsPerMTok },
          result.promptTokens,
          result.completionTokens,
        );
        const run = await recordRun(deps.db, {
          companyId: input.companyId, agentId: input.agentId, taskId: input.taskId ?? null,
          modelId: model.id, requestedModelId, status: 'succeeded',
          promptTokens: result.promptTokens, completionTokens: result.completionTokens,
          costCents: cents, traceId: input.traceId ?? result.providerRequestId ?? null,
          now: now(),
        });
        deps.onRun?.({ id: run.id, traceId: run.traceId, costCents: cents });
        return {
          status: 'succeeded', text: result.text, runId: run.id,
          modelId: model.id, requestedModelId,
          promptTokens: result.promptTokens, completionTokens: result.completionTokens,
          costCents: cents,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    const run = await recordRun(deps.db, {
      companyId: input.companyId, agentId: input.agentId, taskId: input.taskId ?? null,
      modelId: requestedModelId, requestedModelId, status: 'failed',
      error: lastError ?? 'all models in the chain failed', traceId: input.traceId ?? null, now: now(),
    });
    return { status: 'failed', runId: run.id, reason: lastError ?? 'all models in the chain failed' };
  }

  return { callModel };
}

export type Gateway = ReturnType<typeof createGateway>;
