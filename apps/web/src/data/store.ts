/**
 * The user-side store — every fact the product shows lives here and in the visitor's own
 * localStorage (REQ-10). There is no server: this module *is* the database now.
 *
 * The shape is the save file's shape (REQ-11): one key, one JSON, versioned so a future schema
 * can migrate. A brand-new visitor starts from the labelled demo company below; the intro
 * (phase D) will replace that first-run behaviour with the wizard.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import demo from './demo.json';
import type { ModelConnection } from '../lib/providers';
import type { Plan as WorldPlan } from '../world/layout.data';

export type { WorldPlan };

export interface AgentRow {
  id: string;
  name: string;
  nameAr: string | null;
  role: string;
  roleAr: string | null;
  department: string | null;
  focus: string | null;
  focusAr: string | null;
  avatar: number | null;
  status: 'working' | 'idle' | 'error' | 'paused' | string;
  capabilities: string[];
  managerId: string | null;
  errorReason?: string | null;
  pauseReason?: string | null;
  /** The person's own model connection (REQ-18): provider, model, key — in the visitor's save. */
  model: ModelConnection | null;
}

export type Stage = 'backlog' | 'progress' | 'review' | 'done';

export interface TaskRow {
  id: string;
  shortRef: string;
  title: string;
  titleAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  stage: Stage;
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number;
  dueDate: string | null;
  ownerAgentId: string;
}

export interface DecisionRow {
  id: string;
  shortRef: string;
  kind: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  risk: string;
  agentId: string | null;
  title: string;
  titleAr: string | null;
  rule: { id: string; observed: number; threshold: number; unit: string };
  diff: { kind: string; summary: string; summaryAr?: string | null; before: string | null; after: string | null };
  audit: { raisedAt: string; decidedByLabel: string | null; decidedAt: string | null };
  /**
   * REQ-46 (owner, seventh round): a model's ask arrives as a letter in the mailbox. `body` is
   * the full text behind "read more"; `options` are the MCQ buttons (null = free-text reply);
   * `reply` is what the owner answered. Rule decisions simply leave all three empty.
   */
  body?: string | null;
  options?: string[] | null;
  reply?: string | null;
}

export interface MessageRow {
  id: string;
  /** 'you' is the owner; anything else is an agent id. */
  from: string;
  text: string;
  at: string;
}

export interface ThreadRow {
  id: string;
  title: string;
  internal: boolean;
  /** The teammate this thread is with, when it is a one-to-one chat. */
  agentId: string | null;
  lastMessage: { text: string; authorKind: string } | null;
  messages: MessageRow[];
}

export interface ModelRow {
  id: string;
  provider: string;
  providerModel: string;
  lane: string;
  displayName: string;
}

/** The company profile (REQ-14a/16): the name, the description, and the owner's own answers. */
export interface CompanyProfile {
  name: string;
  description: string;
  answers: { q: string; a: string }[];
}

/** One employee while the intro wizard is still drafting them (REQ-14b). */
export interface DraftEmployee {
  /** Draft ids number from the draft's own rows: `d-N`. Real ids arrive at finish. */
  id: string;
  /** The agent this draft row edits, when it edits one — finish keeps their id so the work
      they own stays theirs. New people arrive with `null` and get save-numbered ids. */
  sourceId?: string | null;
  name: string;
  nameAr: string | null;
  role: string;
  roleAr: string | null;
  focus: string | null;
  avatar: number;
  /** Another draft id, or null for "reports to the owner". */
  managerId: string | null;
}

/** The intro wizard's draft — it lives in the save, so closing the tab loses nothing (REQ-15). */
export interface IntroDraft {
  /** 'fresh' starts a company from scratch; 'edit' reopens the wizard over the current one. */
  mode: 'fresh' | 'edit';
  step: number;
  operatorName: string;
  company: CompanyProfile;
  employees: DraftEmployee[];
  options: { theme: string; fx: boolean };
}

interface SaveState {
  company: CompanyProfile;
  /** False until the intro is finished or the demo company is chosen (REQ-33). */
  introDone: boolean;
  /** REQ-41: has the landing door been passed THIS session? In memory only — deliberately not
      persisted (see partialize), so every fresh load meets the front door again. */
  doorPassed: boolean;
  passDoor: () => void;
  introDraft: IntroDraft | null;
  /** When the save last changed, for the status bar. Not part of the save file itself. */
  savedAt: string | null;
  operator: { name: string; role: string };
  agents: AgentRow[];
  tasks: TaskRow[];
  decisions: DecisionRow[];
  threads: ThreadRow[];
  models: ModelRow[];
  /** The floor plan, once build mode has changed it. */
  worldPlan: WorldPlan | null;
  /** Replace any collection (tests, import, the future wizard). */
  load: (data: Partial<Omit<SaveState, 'load' | 'reset'>>) => void;
  /** Back to the labelled demo company. */
  reset: () => void;
  patchTask: (id: string, patch: Partial<TaskRow>) => TaskRow | null;
  patchAgent: (id: string, patch: Partial<AgentRow>) => AgentRow | null;
  /** A person the owner typed in themselves (REQ-17). The save numbers them: `p-new-N`. */
  addAgent: (input: {
    name: string; nameAr: string | null; role: string; roleAr: string | null;
    focus: string | null; focusAr: string | null; avatar: number; managerId: string | null;
    model: ModelConnection | null;
  }) => AgentRow;
  addTask: (task: TaskRow) => void;
  addMessage: (threadId: string, from: string, text: string) => void;
  startThread: (agentId: string, title: string) => void;
  setWorldPlan: (plan: WorldPlan | null) => void;
  patchDecision: (id: string, patch: Partial<DecisionRow>) => DecisionRow | null;
  /** REQ-46: file a model's ask in the mailbox — numbered from the rows that exist, no dice. */
  raiseAsk: (input: { agentId: string | null; shortRef: string; title: string; body: string; options: string[] | null }) => void;
  /** The wizard writes its draft here on every change; the save carries it across reloads. */
  setIntroDraft: (draft: IntroDraft | null) => void;
  /** Finish the intro: the draft becomes the company (REQ-14). Everything stays editable later. */
  finishIntro: () => void;
  /** Skip the intro with the labelled demo company (the landing page's second door). */
  chooseDemo: () => void;
  /** Settings' door back to the front door (owner C33): the wizard reopens OVER the current
      company in edit mode, so the owner can see — and redo — the intro without losing work. */
  reopenIntro: () => void;
}

const fixture = () => ({
  savedAt: null as string | null,
  company: { description: '', answers: [] as { q: string; a: string }[], ...demo.company } as CompanyProfile,
  introDone: false,
  doorPassed: false,
  introDraft: null as IntroDraft | null,
  operator: { ...demo.operator },
  agents: demo.agents.map((a) => ({ model: null, ...a })) as AgentRow[],
  tasks: demo.tasks.map((t) => ({ ...t })) as TaskRow[],
  decisions: demo.decisions.map((d) => ({ ...d })) as DecisionRow[],
  threads: demo.threads.map((t) => ({ ...t, messages: t.messages.map((m) => ({ ...m })) })) as ThreadRow[],
  models: demo.models.map((m) => ({ ...m })) as ModelRow[],
  worldPlan: null,
});

export const useStore = create<SaveState>()(
  persist(
    (set, get) => ({
      ...fixture(),
      load: (data) => set((state) => ({ ...state, ...data, savedAt: new Date().toISOString() })),
      passDoor: () => set({ doorPassed: true }),
      reset: () => set(() => ({ ...fixture(), introDone: true, doorPassed: true, savedAt: new Date().toISOString() })),
      patchTask: (id, patch) => {
        let out: TaskRow | null = null;
        set((state) => ({
          savedAt: new Date().toISOString(),
          tasks: state.tasks.map((task) => {
            if (task.id !== id) return task;
            out = { ...task, ...patch };
            return out;
          }),
        }));
        return out;
      },
      patchAgent: (id, patch) => {
        let out: AgentRow | null = null;
        set((state) => ({
          savedAt: new Date().toISOString(),
          agents: state.agents.map((agent) => {
            if (agent.id !== id) return agent;
            out = { ...agent, ...patch };
            return out;
          }),
        }));
        return out;
      },
      addAgent: (input) => {
        // The save is the database, so it numbers the person from what it already holds —
        // no clock, no dice (namespace lock).
        const max = get().agents.reduce((m, a) => {
          const n = a.id.startsWith('p-new-') ? Number(a.id.slice(6)) : 0;
          return Number.isFinite(n) && n > m ? n : m;
        }, 0);
        const row: AgentRow = {
          id: `p-new-${max + 1}`,
          name: input.name, nameAr: input.nameAr, role: input.role, roleAr: input.roleAr,
          department: null, focus: input.focus, focusAr: input.focusAr,
          avatar: input.avatar, status: 'idle', capabilities: [], managerId: input.managerId,
          model: input.model,
        };
        set((state) => ({ savedAt: new Date().toISOString(), agents: [...state.agents, row] }));
        return row;
      },
      setIntroDraft: (draft) => set(() => ({ introDraft: draft })),
      finishIntro: () => set((state) => {
        const draft = state.introDraft;
        if (!draft) return { introDone: true, introDraft: null };
        // Draft people become real ones; the save numbers them the way it numbers everyone
        // it did not ship with (`p-new-N`) — no clock, no dice (namespace lock).
        const max = state.agents.reduce((m, a) => {
          const n = a.id.startsWith('p-new-') ? Number(a.id.slice(6)) : 0;
          return Number.isFinite(n) && n > m ? n : m;
        }, 0);
        const realId = new Map<string, string>();
        draft.employees.forEach((e, i) => realId.set(e.id, `p-new-${max + i + 1}`));
        const agents: AgentRow[] = draft.employees.map((e) => ({
          id: realId.get(e.id) ?? e.id,
          name: e.name, nameAr: e.nameAr, role: e.role, roleAr: e.roleAr,
          department: null, focus: e.focus, focusAr: null,
          avatar: e.avatar, status: 'idle', capabilities: [],
          managerId: e.managerId ? realId.get(e.managerId) ?? null : null,
          model: null,
        }));
        if (draft.mode === 'edit') {
          // Reopened over an existing company (REQ-15): people keep their ids, and everything
          // the company already has — tasks, decisions, threads, the floor plan — stays put.
          const agents: AgentRow[] = draft.employees.map((e) => {
            const base = e.sourceId ? state.agents.find((a) => a.id === e.sourceId) : null;
            return {
              ...(base ?? { status: 'idle', capabilities: [], department: null, focusAr: null, model: null }),
              id: e.sourceId ?? realId.get(e.id) ?? e.id,
              name: e.name, nameAr: e.nameAr, role: e.role, roleAr: e.roleAr,
              focus: e.focus, avatar: e.avatar,
              managerId: e.managerId ? realId.get(e.managerId) ?? e.managerId : null,
            };
          });
          return {
            savedAt: new Date().toISOString(),
            company: draft.company,
            operator: { name: draft.operatorName.trim() === '' ? state.operator.name : draft.operatorName.trim(), role: state.operator.role },
            agents,
            introDone: true,
            introDraft: null,
          };
        }
        return {
          savedAt: new Date().toISOString(),
          company: draft.company,
          operator: { name: draft.operatorName.trim() === '' ? state.operator.name : draft.operatorName.trim(), role: state.operator.role },
          // A company from scratch starts with its own empty board — no demo work attached.
          agents, tasks: [], decisions: [], threads: [], models: [],
          worldPlan: null,
          introDone: true,
          introDraft: null,
        };
      }),
      chooseDemo: () => set((state) => ({ ...state, introDone: true, introDraft: null, savedAt: new Date().toISOString() })),
      reopenIntro: () => set((state) => {
        const draftId = new Map<string, string>();
        state.agents.forEach((a, i) => draftId.set(a.id, `d-${i + 1}`));
        return {
          introDone: false,
          introDraft: {
            mode: 'edit',
            step: 0,
            operatorName: state.operator.name,
            company: { ...state.company, answers: state.company.answers.map((a) => ({ ...a })) },
            employees: state.agents.map((a, i) => ({
              id: draftId.get(a.id) ?? `d-${i + 1}`,
              sourceId: a.id,
              name: a.name, nameAr: a.nameAr, role: a.role, roleAr: a.roleAr,
              focus: a.focus, avatar: a.avatar ?? 0,
              managerId: a.managerId ? draftId.get(a.managerId) ?? null : null,
            })),
            options: { theme: 'dark', fx: true },
          },
        };
      }),
      addTask: (task) => set((state) => ({ savedAt: new Date().toISOString(), tasks: [task, ...state.tasks] })),
      addMessage: (threadId, from, text) => set((state) => {
        const at = new Date().toISOString();
        const threadNow = state.threads.find((th) => th.id === threadId);
        // The save is this app's database, so it numbers the message within its thread —
        // no clock, no dice (namespace lock).
        const message: MessageRow = { id: `msg-${threadId}-${(threadNow?.messages.length ?? 0) + 1}`, from, text, at };
        return {
          savedAt: at,
          threads: state.threads.map((thread) => thread.id === threadId
            ? { ...thread, messages: [...thread.messages, message], lastMessage: { text, authorKind: from === 'you' ? 'owner' : 'agent' } }
            : thread),
        };
      }),
      startThread: (agentId, title) => set((state) => {
        // Numbered from the threads that exist, the way the save numbers everything else.
        let max = 0;
        for (const th of state.threads) {
          const m = /^thr-(\d+)$/.exec(th.id);
          if (m) max = Math.max(max, Number(m[1]));
        }
        const thread: ThreadRow = {
          id: `thr-${max + 1}`, title, internal: true, agentId, lastMessage: null, messages: [],
        };
        return { savedAt: new Date().toISOString(), threads: [thread, ...state.threads] };
      }),
      setWorldPlan: (plan) => set({ worldPlan: plan, savedAt: new Date().toISOString() }),
      raiseAsk: (input) => set((state) => {
        // Numbered from the asks that exist, the way the save numbers everything else.
        let max = 0;
        for (const d of state.decisions) {
          const m = /^ask-(\d+)$/.exec(d.id);
          if (m) max = Math.max(max, Number(m[1]));
        }
        const row: DecisionRow = {
          id: `ask-${max + 1}`,
          shortRef: input.shortRef,
          kind: 'ask',
          status: 'pending',
          risk: '',
          agentId: input.agentId,
          title: input.title,
          titleAr: null,
          rule: { id: 'ask', observed: 0, threshold: 0, unit: '' },
          diff: { kind: 'ask', summary: input.body.slice(0, 140), summaryAr: null, before: null, after: null },
          audit: { raisedAt: new Date().toISOString(), decidedByLabel: null, decidedAt: null },
          body: input.body,
          options: input.options,
          reply: null,
        };
        return { savedAt: new Date().toISOString(), decisions: [row, ...state.decisions] };
      }),
      patchDecision: (id, patch) => {
        let out: DecisionRow | null = null;
        set((state) => ({
          savedAt: new Date().toISOString(),
          decisions: state.decisions.map((decision) => {
            if (decision.id !== id) return decision;
            out = { ...decision, ...patch, audit: { ...decision.audit, ...patch.audit } };
            return out;
          }),
        }));
        return out;
      },
    }),
    {
      name: 'company.ai.save.v1',
      version: 3,
      storage: createJSONStorage(() => localStorage),
      // v1 → v2: the company grew a profile, and the intro arrived. Anyone who already has a
      // save has been through the front door the long way — let them in without the wizard.
      // v2 → v3: every person grew a model connection slot (REQ-18); old saves get an empty one.
      migrate: (persisted, version) => {
        type Old = { company?: { name?: string }; agents?: unknown[] };
        let old = persisted as Old;
        if (version < 2) {
          old = {
            ...old,
            company: { description: '', answers: [], ...(old.company ?? { name: 'Acme Studio' }) },
            introDone: true,
            introDraft: null,
          } as Old;
        }
        if (version < 3) {
          old = { ...old, agents: (old.agents ?? []).map((a) => ({ model: null, ...(a as object) })) };
        }
        return old;
      },
      partialize: (state) => ({
        company: state.company,
        introDone: state.introDone,
        introDraft: state.introDraft,
        operator: state.operator,
        agents: state.agents,
        tasks: state.tasks,
        decisions: state.decisions,
        threads: state.threads,
        worldPlan: state.worldPlan,
        models: state.models,
      }),
    },
  ),
);

// First run used to write the demo save on first paint. It does not anymore (REQ-33): a
// brand-new visitor has no save at all, which is exactly how the shell knows to show the
// landing page instead. The save file appears the moment they choose a door — their own
// company through the wizard, or the labelled demo company.
