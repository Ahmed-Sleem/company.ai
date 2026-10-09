/**
 * The engine, one tick at a time (Phase F): work moves while the studio is at work — on the
 * schedule the owner set, or by hand from Settings. A tick picks an open task, moves its
 * progress, and when a stage completes the person says so in their thread. Randomness picks
 * *values* (which task, how much) — never ids, which the namespace lock keeps numbered.
 */
import { useStore } from '../data/store';
import { t, type Lang } from './i18n';
import { isWorkTime } from './schedule';
import { localized } from './format';

export function runTick(lang: Lang, manual = false): string | null {
  if (!manual && !isWorkTime()) return null;
  const state = useStore.getState();
  const open = state.tasks.filter((task) => task.stage !== 'done' && task.ownerAgentId);
  if (open.length === 0) return null;
  const task = open[Math.floor(Math.random() * open.length)];
  if (!task) return null;
  const owner = state.agents.find((a) => a.id === task.ownerAgentId) ?? null;
  const title = localized(task.title, task.titleAr, lang);

  const announce = (text: string) => {
    if (!owner) return;
    let thread = state.threads.find((th) => th.agentId === owner.id);
    if (!thread) {
      state.startThread(owner.id, localized(owner.name, owner.nameAr, lang));
      thread = useStore.getState().threads.find((th) => th.agentId === owner.id);
    }
    if (thread) useStore.getState().addMessage(thread.id, owner.id, text);
  };

  const progress = Math.min(100, task.progress + 7 + Math.floor(Math.random() * 9));
  if (progress >= 100 && task.stage === 'progress') {
    state.patchTask(task.id, { progress: 100, stage: 'review' });
    announce(t('liveSentReview', lang).replace('{title}', title));
    return `review:${task.shortRef}`;
  }
  if (progress >= 100 && task.stage === 'review') {
    state.patchTask(task.id, { progress: 100, stage: 'done' });
    announce(t('liveDone', lang).replace('{title}', title));
    return `done:${task.shortRef}`;
  }
  state.patchTask(task.id, { progress });
  return `work:${task.shortRef}`;
}
