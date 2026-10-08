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
}

export interface ThreadRow {
  id: string;
  title: string;
  internal: boolean;
  lastMessage: { text: string; authorKind: string } | null;
}

export interface ModelRow {
  id: string;
  provider: string;
  providerModel: string;
  lane: string;
  displayName: string;
}

interface SaveState {
  company: { name: string };
  operator: { name: string; role: string };
  agents: AgentRow[];
  tasks: TaskRow[];
  decisions: DecisionRow[];
  threads: ThreadRow[];
  models: ModelRow[];
  /** Replace any collection (tests, import, the future wizard). */
  load: (data: Partial<Omit<SaveState, 'load' | 'reset'>>) => void;
  /** Back to the labelled demo company. */
  reset: () => void;
  patchTask: (id: string, patch: Partial<TaskRow>) => TaskRow | null;
  addTask: (task: TaskRow) => void;
  patchDecision: (id: string, patch: Partial<DecisionRow>) => DecisionRow | null;
}

const fixture = () => ({
  company: { ...demo.company },
  operator: { ...demo.operator },
  agents: demo.agents.map((a) => ({ ...a })) as AgentRow[],
  tasks: demo.tasks.map((t) => ({ ...t })) as TaskRow[],
  decisions: demo.decisions.map((d) => ({ ...d })) as DecisionRow[],
  threads: demo.threads.map((t) => ({ ...t })) as ThreadRow[],
  models: demo.models.map((m) => ({ ...m })) as ModelRow[],
});

export const useStore = create<SaveState>()(
  persist(
    (set) => ({
      ...fixture(),
      load: (data) => set((state) => ({ ...state, ...data })),
      reset: () => set(() => ({ ...fixture() })),
      patchTask: (id, patch) => {
        let out: TaskRow | null = null;
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== id) return task;
            out = { ...task, ...patch };
            return out;
          }),
        }));
        return out;
      },
      addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
      patchDecision: (id, patch) => {
        let out: DecisionRow | null = null;
        set((state) => ({
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
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        company: state.company,
        operator: state.operator,
        agents: state.agents,
        tasks: state.tasks,
        decisions: state.decisions,
        threads: state.threads,
        models: state.models,
      }),
    },
  ),
);

// First run: localStorage is still empty, and `persist` only writes when the state changes —
// so a visitor who merely looks around would have no save file at all. Writing the demo save
// on first paint makes the file exist from the start: the workspace menu can export it and
// the smoke test can read it without anyone touching a button first.
try {
  if (localStorage.getItem('company.ai.save.v1') === null) {
    useStore.setState((state) => ({ ...state }));
  }
} catch {
  // Storage blocked (private mode, quota): the app still runs in memory for this visit.
}
