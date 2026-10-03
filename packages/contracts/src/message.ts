/**
 * Threads and messages — one conversation store for humans *and* agents, with the model
 * that produced each message recorded on the message itself (doc `20` §20.2).
 *
 * `parts` follows the verified donor `assistant-ui` (MIT): a message is a list of parts,
 * and an approval is a part of a tool call, not a separate object.
 */
import { z } from 'zod';
import { agentId, companyId, isoDate, memberId, messageId, modelId, runId, threadId } from './company.js';

export const THREAD = z
  .object({
    id: threadId,
    companyId,
    title: z.string().min(1).max(200),
    /** Who is in the conversation. A thread is always at least two participants. */
    participantAgentIds: z.array(agentId).min(1).max(24),
    participantMemberIds: z.array(memberId).max(24).default([]),
    /** Agent↔agent threads are hidden from the main list and surfaced by digest (D1 answer). */
    internal: z.boolean().default(false),
    lastMessageAt: isoDate.nullable(),
    createdAt: isoDate,
  })
  .strict();
export type Thread = z.infer<typeof THREAD>;

export const MESSAGE_PART = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string().max(40_000) }).strict(),
  z
    .object({
      type: z.literal('tool'),
      name: z.string().max(80),
      /** The donor's approval shape: ``approval`` absent = nothing to approve. */
      approval: z
        .object({ id: z.string().max(80), approved: z.boolean().nullable() })
        .strict()
        .nullable()
        .default(null),
      result: z.string().max(20_000).nullable(),
    })
    .strict(),
  z.object({ type: z.literal('file'), name: z.string().max(200), url: z.string().max(600) }).strict(),
]);
export type MessagePart = z.infer<typeof MESSAGE_PART>;

export const MESSAGE = z
  .object({
    id: messageId,
    threadId,
    companyId,
    authorKind: z.enum(['agent', 'member', 'system']),
    authorId: z.string().min(1).max(40),
    parts: z.array(MESSAGE_PART).max(200),
    /** Provenance: which run and model produced this message (null for human messages). */
    runId: runId.nullable(),
    modelId: modelId.nullable(),
    createdAt: isoDate,
  })
  .strict();
export type Message = z.infer<typeof MESSAGE>;
