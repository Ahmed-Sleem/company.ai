/**
 * The engine, one tick at a time (Phase F, upgraded by REQ-42): work moves while the studio is
 * at work — on the schedule the owner set, or by hand from Settings.
 *
 * A tick picks an open task and moves it. HOW it moves depends on the person who owns it:
 *
 *  · an agent wired to a real model gets a real cycle: the model is asked for its progress in
 *    the ONE structured form its system prompt defined (the contract in lib/prompt.ts), the
 *    answer is parsed here, clamped, checked against the shared transition table, written to
 *    the task — and the model's own note is posted in its thread;
 *  · a malformed answer gets one format-retry; a second failure falls back to the local
 *    heartbeat for that cycle (and a persistently failing loop is the pause-and-ask case of
 *    REQ-35, surfaced through the agent's error status);
 *  · an agent without a provider keeps the local heartbeat: honest simulated progress, so the
 *    studio is alive with no keys at all.
 *
 * Randomness picks *values* (which task, how much) — never ids, which the namespace lock
 * keeps numbered.
 */
import { useStore } from '../data/store';
import { t, type Lang } from './i18n';
import { isWorkTime } from './schedule';
import { localized } from './format';
import { compileSystemPrompt } from './prompt';
import { chatCompletion, type ModelConnection } from './providers';
import { canTransition, type TaskStage } from '@company/contracts';

/** The parsed shape of the contract — the only form a work report may take. */
export interface WorkReport {
  progress: number;
  stage: 'progress' | 'review' | 'done';
  note: string;
}

/**
 * Parse one work report. Strict on purpose: the contract asks for a single JSON object; a
 * fenced block is tolerated (models love fences), anything else is malformed and earns the
 * one format-retry. Numbers are clamped, the stage must be one of the three legal words.
 */
export function parseReport(text: string): WorkReport | null {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.progress !== 'number' || !Number.isFinite(r.progress)) return null;
  if (r.stage !== 'progress' && r.stage !== 'review' && r.stage !== 'done') return null;
  return {
    progress: Math.max(0, Math.min(100, Math.round(r.progress))),
    stage: r.stage,
    note: typeof r.note === 'string' ? r.note.trim() : '',
  };
}

export function runTick(lang: Lang, manual = false): string | null {
  if (!manual && !isWorkTime()) return null;
  const state = useStore.getState();
  const open = state.tasks.filter((task) => task.stage !== 'done' && task.ownerAgentId);
  if (open.length === 0) return null;
  const task = open[Math.floor(Math.random() * open.length)];
  if (!task) return null;
  const owner = state.agents.find((a) => a.id === task.ownerAgentId) ?? null;

  const conn: ModelConnection | null = owner?.model ?? null;
  if (owner && conn && conn.key.trim() !== '' && conn.model.trim() !== '') {
    // A real model does the reporting (REQ-42). Fired, not awaited: the studio keeps moving
    // while the provider thinks; the report lands in the store when it arrives.
    void providerCycle(task.id, owner.id, conn, lang);
    return `asked:${task.shortRef}`;
  }
  return localHeartbeat(task.id, lang);
}

/** The local heartbeat: honest simulated progress for agents without a provider. */
export function localHeartbeat(taskId: string, lang: Lang): string | null {
  const state = useStore.getState();
  const task = state.tasks.find((x) => x.id === taskId);
  if (!task || task.stage === 'done') return null;
  const title = localized(task.title, task.titleAr, lang);
  const progress = Math.min(100, task.progress + 7 + Math.floor(Math.random() * 9));
  if (progress >= 100 && task.stage === 'progress') {
    state.patchTask(task.id, { progress: 100, stage: 'review' });
    announce(task.ownerAgentId, t('liveSentReview', lang).replace('{title}', title), lang);
    return `review:${task.shortRef}`;
  }
  if (progress >= 100 && task.stage === 'review') {
    state.patchTask(task.id, { progress: 100, stage: 'done' });
    announce(task.ownerAgentId, t('liveDone', lang).replace('{title}', title), lang);
    return `done:${task.shortRef}`;
  }
  state.patchTask(task.id, { progress });
  return `work:${task.shortRef}`;
}

/** One real cycle: ask the model, parse the contract, retry once, then fall back (REQ-42). */
async function providerCycle(taskId: string, agentId: string, conn: ModelConnection, lang: Lang): Promise<void> {
  const state = useStore.getState();
  const task = state.tasks.find((x) => x.id === taskId);
  const owner = state.agents.find((a) => a.id === agentId);
  if (!task || !owner) return;
  const manager = state.agents.find((a) => a.id === owner.managerId) ?? null;
  const system = compileSystemPrompt(state.company, owner, manager ? localized(manager.name, manager.nameAr, lang) : null);
  const ask = [
    `Progress report for ${task.shortRef} — "${localized(task.title, task.titleAr, lang)}".`,
    `Right now the studio shows: stage ${task.stage}, ${task.progress}%.`,
    'Reply with your progress report in the exact JSON form your instructions define.',
  ].join('\n');

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const reply = await chatCompletion(conn, system, attempt === 0 ? ask : `${ask}\n\nRemember: one JSON object only, no markdown, no commentary.`);
      const report = parseReport(reply);
      if (report) {
        applyReport(taskId, report, lang);
        return;
      }
    } catch {
      // A provider error counts as a failed attempt; the retry asks once more.
    }
  }
  // Two failures: this cycle falls back to the heartbeat so work never stalls silently.
  localHeartbeat(taskId, lang);
}

/** Write a parsed report: clamp it, keep the stage legal, post the model's own note. */
function applyReport(taskId: string, report: WorkReport, lang: Lang): void {
  const state = useStore.getState();
  const task = state.tasks.find((x) => x.id === taskId);
  if (!task || task.stage === 'done') return;
  const stage = report.stage !== task.stage && canTransition(task.stage, report.stage as TaskStage)
    ? (report.stage as TaskStage)
    : task.stage;
  state.patchTask(task.id, { progress: report.progress, stage });
  const title = localized(task.title, task.titleAr, lang);
  const words = report.note !== ''
    ? report.note
    : stage !== task.stage
      ? (stage === 'done' ? t('liveDone', lang) : t('liveSentReview', lang)).replace('{title}', title)
      : `${report.progress}%`;
  announce(task.ownerAgentId, words, lang);
}

/** Say it in the person's thread — creating the thread the first time, as before. */
function announce(agentId: string | null, text: string, lang: Lang): void {
  if (!agentId) return;
  const state = useStore.getState();
  const owner = state.agents.find((a) => a.id === agentId);
  if (!owner) return;
  let thread = state.threads.find((th) => th.agentId === owner.id);
  if (!thread) {
    state.startThread(owner.id, localized(owner.name, owner.nameAr, lang));
    thread = useStore.getState().threads.find((th) => th.agentId === owner.id);
  }
  if (thread) useStore.getState().addMessage(thread.id, owner.id, text);
}
