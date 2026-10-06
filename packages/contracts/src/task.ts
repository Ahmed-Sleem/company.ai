/**
 * Tasks and the review gate.
 *
 * The stage ids are exactly the demo's (`stage:'backlog' | 'progress' | 'review' | 'done'`),
 * and they may not drift: `contracts/test/gui-fidelity.test.ts` reads the designer's file.
 *
 * The gate itself follows the ported rule from `agentkitai/agentgate` (MIT): a task in
 * `review` is decided by a human; nothing reaches `done` without that decision.
 */
import { z } from 'zod';
import { agentId, companyId, decisionId, goalId, id, isoDate, memberId, taskId } from './company.js';

export const TASK_STAGES = ['backlog', 'progress', 'review', 'done'] as const;
export const taskStage = z.enum(TASK_STAGES);
export type TaskStage = z.infer<typeof taskStage>;

/** Human labels, matching the demo's own strings (EN + AR). */
export const STAGE_LABELS: Record<TaskStage, { en: string; ar: string }> = {
  backlog: { en: 'Backlog', ar: 'قائمة الانتظار' },
  progress: { en: 'In progress', ar: 'قيد التنفيذ' },
  review: { en: 'In review', ar: 'قيد المراجعة' },
  done: { en: 'Completed', ar: 'مكتملة' },
};

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export const PRIORITY_LABELS: Record<(typeof TASK_PRIORITIES)[number], { en: string; ar: string }> = {
  low: { en: 'Low', ar: 'منخفضة' },
  medium: { en: 'Medium', ar: 'متوسطة' },
  high: { en: 'High', ar: 'عالية' },
  critical: { en: 'Critical', ar: 'حرجة' },
};

export const TASK = z
  .object({
    id: taskId,
    companyId,
    goalId: goalId.nullable(),
    title: z.string().min(1).max(200),
    ownerAgentId: agentId,
    stage: taskStage.default('backlog'),
    priority: z.enum(TASK_PRIORITIES).default('medium'),
    progress: z.number().int().min(0).max(100).default(0),
    dueDate: z.string().date().nullable(),
    /** Set when the task entered `review`; the gate reads these. */
    reviewRequestedByRunId: id('run').nullable(),
    approvedByMemberId: memberId.nullable(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .strict();
export type Task = z.infer<typeof TASK>;

/** The allowed transitions. Anything else is a bug, not a user error. */
/**
 * The task form — the demo's own six fields (`taskForm()`): title, owner, priority, due date,
 * stage and description. The bounds are the demo's (title maxlength 120, description 2000, a
 * required date), so the interface and the API refuse the same input for the same reason.
 *
 * `stage` is accepted here because the demo's form offers it, but it is not written straight to the
 * row on an edit: `PATCH /api/tasks/:id` routes a stage change through the same `transitionTask`
 * the board's buttons use, so the review gate cannot be stepped around by using the form instead.
 */
export const TASK_CREATE = z
  .object({
    title: z.string().min(1).max(120),
    titleAr: z.string().min(1).max(120).nullable().default(null),
    description: z.string().max(2000).nullable().default(null),
    descriptionAr: z.string().max(2000).nullable().default(null),
    ownerAgentId: agentId,
    stage: taskStage.default('backlog'),
    priority: z.enum(TASK_PRIORITIES).default('medium'),
    progress: z.number().int().min(0).max(100).default(0),
    dueDate: z.string().date().nullable().default(null),
  })
  .strict();
export type TaskCreate = z.infer<typeof TASK_CREATE>;

/** Every field optional: the form sends what it changed. */
export const TASK_UPDATE = TASK_CREATE.partial();
export type TaskUpdate = z.infer<typeof TASK_UPDATE>;

export const TASK_TRANSITIONS: Record<TaskStage, readonly TaskStage[]> = {
  backlog: ['progress'],
  progress: ['review', 'backlog'],
  review: ['done', 'progress'],
  done: [],
};

export function canTransition(from: TaskStage, to: TaskStage): boolean {
  return TASK_TRANSITIONS[from].includes(to);
}

/**
 * Whether a transition needs a human decision first. `review → done` is the review gate:
 * it requires the approving member, and the decision row that produced it.
 */
export function requiresHumanApproval(from: TaskStage, to: TaskStage): boolean {
  return from === 'review' && to === 'done';
}

/**
 * What the product will actually accept right now, with the reason when it will not.
 *
 * `canTransition` answers "is this an allowed edge in the state machine"; this answers
 * "may this task move there, given what is known about its decision" — and it is the single
 * place that answer is produced. The API returns these offers; the interface renders them and
 * does not second-guess them; the write path re-checks through `transitionTask`.
 */
export interface TransitionOffer {
  to: TaskStage;
  ok: boolean;
  /** Why not, when `ok` is false. English and Arabic, like every other string. */
  reason: { en: string; ar: string } | null;
}

export const TRANSITION_REASONS = {
  needs_decision: { en: 'A person has to approve this first.', ar: 'يجب أن يوافق شخص أولًا.' },
  needs_approval: { en: 'Waiting for the approval that lets this finish.', ar: 'بانتظار الموافقة التي تسمح بإتمام هذه المهمة.' },
} as const;

export function offeredTransitions(
  from: TaskStage,
  options: { hasApprovedDecision: boolean },
): TransitionOffer[] {
  return TASK_TRANSITIONS[from].map((to) => {
    if (!requiresHumanApproval(from, to)) return { to, ok: true, reason: null };
    // review → done is the gate: it needs the decision row that a person produced.
    return options.hasApprovedDecision
      ? { to, ok: true, reason: null }
      : { to, ok: false, reason: TRANSITION_REASONS.needs_approval };
  });
}

export const TASK_TRANSITION = z
  .object({
    taskId,
    to: taskStage,
    actor: z.union([z.object({ kind: z.literal('agent'), id: agentId }),
                     z.object({ kind: z.literal('member'), id: memberId })]),
    decisionId: decisionId.nullable().default(null),
    note: z.string().max(500).nullable().default(null),
  })
  .strict();
export type TaskTransition = z.infer<typeof TASK_TRANSITION>;
