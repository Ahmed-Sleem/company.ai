/**
 * The data façade. The views talk to this; this talks to the user-side store (data/store.ts).
 *
 * It keeps the old client's exact surface — same method names, same row shapes, same error
 * shape — so the screens never had to change when the server retired (REQ-13): what was a
 * network call is now a read or a write on the visitor's own save file. The one visible
 * difference is speed: everything resolves on the next microtask.
 */
import { offeredTransitions } from '@company/contracts';
import { useStore, type AgentRow, type DecisionRow, type ModelRow, type Stage, type TaskRow as StoredTask } from '../data/store';

export interface ApiError {
  code: string;
  message: string;
  fields?: string[];
}

function fail(code: string, message: string): never {
  throw Object.assign(new Error(message), { apiError: { code, message } satisfies ApiError });
}

export interface TransitionOffer {
  to: Stage;
  ok: boolean;
  reason: { en: string; ar: string } | null;
}

export interface TaskRow extends StoredTask {
  owner: { id: string; name: string; nameAr?: string | null; role: string; avatar?: number | null } | null;
  offers: TransitionOffer[];
  createdAt: string;
  updatedAt: string;
}

/**
 * The board's movement rules, now client-side. Work flows forward one column at a time; review
 * may send work back to progress; nothing skips review and nothing reopens done. Each refusal
 * carries its own reason in both languages — the interface prints the rule's words, as before.
 */
export function offersFor(stage: Stage): TransitionOffer[] {
  // The shared state machine in @company/contracts decides — same table, same reasons the
  // retired server used (REQ-13: one implementation, now running in the browser).
  return offeredTransitions(stage, { hasApprovedDecision: false });
}

function withOwnerAndOffers(task: StoredTask): TaskRow {
  const agent = useStore.getState().agents.find((a) => a.id === task.ownerAgentId) ?? null;
  return {
    ...task,
    owner: agent ? { id: agent.id, name: agent.name, nameAr: agent.nameAr, role: agent.role, avatar: agent.avatar } : null,
    offers: offersFor(task.stage),
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  };
}

const next = <T,>(value: T): Promise<T> => Promise.resolve(value);

let taskCounter = 171;

export const api = {
  health: () => next({ ok: true, version: '0.2.0', company: useStore.getState().company.name }),
  company: () => next({ company: { id: 'company', name: useStore.getState().company.name } }),
  agents: (): Promise<{ agents: AgentRow[] }> => next({ agents: useStore.getState().agents }),
  tasks: (): Promise<{ tasks: TaskRow[] }> => next({ tasks: useStore.getState().tasks.map(withOwnerAndOffers) }),
  threads: (): Promise<{ threads: unknown[] }> => next({ threads: useStore.getState().threads }),
  session: () => {
    const { operator } = useStore.getState();
    return next({ member: { id: 'you', name: operator.name, role: operator.role } });
  },
  moveTask: (taskId: string, to: Stage) => {
    const state = useStore.getState();
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) fail('not_found', 'No such task.');
    const offer = offersFor(task!.stage).find((o) => o.to === to);
    if (!offer?.ok) fail('rule', offer?.reason?.en ?? 'That move is not offered.');
    const moved = state.patchTask(taskId, { stage: to, progress: to === 'done' ? 100 : task!.progress });
    return next({ task: { id: taskId, stage: moved?.stage ?? to } });
  },
  createTask: (input: {
    title: string; titleAr?: string | null; description?: string | null; descriptionAr?: string | null;
    ownerAgentId: string; stage: Stage; priority: TaskRow['priority']; progress?: number; dueDate?: string | null;
  }) => {
    const state = useStore.getState();
    const task: StoredTask = {
      id: `tsk-${taskCounter}`,
      shortRef: `TSK-${taskCounter++}`,
      title: input.title,
      titleAr: input.titleAr ?? null,
      description: input.description ?? null,
      descriptionAr: input.descriptionAr ?? null,
      stage: input.stage,
      priority: input.priority,
      progress: input.progress ?? 0,
      dueDate: input.dueDate ?? null,
      ownerAgentId: input.ownerAgentId,
    };
    state.addTask(task);
    return next({ task: withOwnerAndOffers(task) });
  },
  updateTask: (taskId: string, patch: Partial<StoredTask>) => {
    const state = useStore.getState();
    // A stage change through the form goes through the same gate as the board's move buttons —
    // the review gate cannot be stepped around by editing instead of moving.
    const storedBefore = state.tasks.find((t) => t.id === taskId);
    if (storedBefore && patch.stage && patch.stage !== storedBefore.stage) {
      const offer = offersFor(storedBefore.stage).find((o) => o.to === patch.stage);
      if (!offer?.ok) fail('rule', offer?.reason?.en ?? 'That move is not offered.');
    }
    const stored = state.patchTask(taskId, patch);
    if (!stored) fail('not_found', 'No such task.');
    return next({ task: withOwnerAndOffers(stored!) });
  },
  decisions: (status?: string): Promise<{ decisions: DecisionRow[] }> => {
    const all = useStore.getState().decisions;
    return next({ decisions: status ? all.filter((d) => d.status === status) : all });
  },
  /**
   * REQ-46: answer a letter in the mailbox — one of its options, or the owner's own words.
   * The answer is stored on the row, posted back into the asker's thread, and the letter closes.
   */
  answerDecision: (decisionId: string, answer: string) => {
    const state = useStore.getState();
    const existing = state.decisions.find((d) => d.id === decisionId);
    if (!existing) fail('not_found', 'No such message.');
    if (existing!.status !== 'pending') fail('already_decided', 'This message was already answered.');
    state.patchDecision(decisionId, {
      status: 'answered',
      reply: answer,
      audit: { raisedAt: existing!.audit.raisedAt, decidedByLabel: `${state.operator.name} (owner)`, decidedAt: new Date().toISOString() },
    });
    // The answer travels back along the same wire the question came in on.
    if (existing!.agentId) {
      let thread = state.threads.find((th) => th.agentId === existing!.agentId);
      if (!thread) {
        const asker = state.agents.find((a) => a.id === existing!.agentId);
        if (asker) {
          state.startThread(asker.id, asker.name);
          thread = useStore.getState().threads.find((th) => th.agentId === asker.id);
        }
      }
      if (thread) useStore.getState().addMessage(thread.id, 'you', answer);
    }
    return next({ ok: true });
  },
  decide: (decisionId: string, verdict: 'approve' | 'reject') => {
    const state = useStore.getState();
    const existing = state.decisions.find((d) => d.id === decisionId);
    if (!existing) fail('not_found', 'No such decision.');
    if (existing!.status !== 'pending') fail('already_decided', 'This decision was already decided.');
    const decided = state.patchDecision(decisionId, {
      status: verdict === 'approve' ? 'approved' : 'rejected',
      audit: { raisedAt: existing!.audit.raisedAt, decidedByLabel: `${state.operator.name} (owner)`, decidedAt: new Date().toISOString() },
    });
    return next({ outcome: { kind: verdict }, applied: { outcome: `${verdict === 'approve' ? 'Approved' : 'Rejected'}: ${decided?.title ?? ''}` } });
  },
  models: (): Promise<{ models: ModelRow[] }> => next({ models: useStore.getState().models }),
};
