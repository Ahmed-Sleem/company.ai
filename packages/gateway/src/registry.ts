/**
 * Registry access — the gateway's view of the model tables.
 * Kept here (not in the gateway core) so the core stays testable with a stub.
 */
import { and, asc, eq } from 'drizzle-orm';
import { schema, type Db } from '@company/company';
import type { GatewayDeps } from './types.js';

export function dbRegistry(db: Db): GatewayDeps['registry'] {
  return {
    async get(modelId: string) {
      const [row] = await db
        .select({
          id: schema.models.id,
          providerModel: schema.models.providerModel,
          provider: schema.models.provider,
          lane: schema.models.lane,
          inputCentsPerMTok: schema.models.inputCentsPerMTok,
          outputCentsPerMTok: schema.models.outputCentsPerMTok,
          contextWindow: schema.models.contextWindow,
          lifecycle: schema.models.lifecycle,
        })
        .from(schema.models)
        .where(and(eq(schema.models.id, modelId), eq(schema.models.retired, false)))
        .limit(1);
      return (row as Awaited<ReturnType<GatewayDeps['registry']['get']>>) ?? null;
    },
    async fallbacksOf(agentId: string) {
      const [row] = await db
        .select({ fallbackModelIds: schema.agentModels.fallbackModelIds })
        .from(schema.agentModels)
        .where(eq(schema.agentModels.agentId, agentId))
        .limit(1);
      return row?.fallbackModelIds ?? [];
    },
    async modelForAgent(agentId: string) {
      const [row] = await db
        .select({ modelId: schema.agentModels.modelId })
        .from(schema.agentModels)
        .where(eq(schema.agentModels.agentId, agentId))
        .limit(1);
      if (row) return row.modelId;
      // No assignment yet: the cheapest live model is the safe default, never a hard failure.
      const [cheap] = await db
        .select({ id: schema.models.id })
        .from(schema.models)
        .where(eq(schema.models.retired, false))
        .orderBy(asc(schema.models.inputCentsPerMTok))
        .limit(1);
      return cheap?.id ?? null;
    },
  };
}
