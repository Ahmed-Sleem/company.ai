/**
 * The model registry — the 12 fields from doc `20` §20.1, no more and no fewer.
 * Nothing in the product may name a model by string; everything points here.
 */
import { z } from 'zod';
import { isoDate, modelId } from './company.js';

export const PROVIDERS = ['openai', 'anthropic', 'open'] as const; // 'open' = the cheap self-hostable lane
export type ProviderId = (typeof PROVIDERS)[number];

export const MODEL = z
  .object({
    id: modelId,
    /** Provider-side identifier, e.g. `gpt-5.2` — recorded verbatim on every run. */
    providerModel: z.string().min(1).max(80),
    provider: z.enum(PROVIDERS),
    lane: z.enum(['strong', 'balanced', 'cheap']),
    displayName: z.string().min(1).max(80),
    /** Money in integer cents per 1M tokens, both directions. */
    inputCentsPerMTok: z.number().int().min(0),
    outputCentsPerMTok: z.number().int().min(0),
    contextWindow: z.number().int().positive(),
    maxOutputTokens: z.number().int().positive(),
    /** Lifecycle: what the registry watch is for. */
    lifecycle: z.enum(['ga', 'preview', 'deprecated', 'retired']).default('ga'),
    /** When the lifecycle last changed — drives the "model changed under you" inbox item. */
    lifecycleChangedAt: isoDate.nullable(),
    supports: z
      .object({
        streaming: z.boolean().default(true),
        tools: z.boolean().default(true),
        vision: z.boolean().default(false),
        jsonMode: z.boolean().default(true),
      })
      .strict()
      .default({ streaming: true, tools: true, vision: false, jsonMode: true }),
  })
  .strict();
export type Model = z.infer<typeof MODEL>;

/** The only two fields any cost calculation needs — so callers need not fake a whole Model. */
export interface Pricing {
  inputCentsPerMTok: number;
  outputCentsPerMTok: number;
}

/** Cost of one call, in cents, rounded up so the ledger never under-reports. */
export function costCents(pricing: Pricing, promptTokens: number, completionTokens: number): number {
  const raw =
    (promptTokens * pricing.inputCentsPerMTok + completionTokens * pricing.outputCentsPerMTok) / 1_000_000;
  return Math.ceil(raw);
}
