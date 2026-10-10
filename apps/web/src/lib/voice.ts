/**
 * The local teammate voice: what a person says when no provider key is configured yet. Pure —
 * handed the person and their open tasks, it answers in character in the current language.
 * Lives here (not in the view) because the messenger's turn scheduler (REQ-56) in the store
 * uses the very same voice when the provider is silent.
 */
import { t, type Lang } from './i18n';
import { localized } from './format';
import type { AgentRow, TaskRow } from '../data/store';

export const localVoice = (agent: AgentRow, tasks: TaskRow[], lang: Lang): string => {
  const open = tasks.filter((task) => task.ownerAgentId === agent.id && task.stage !== 'done');
  const first = open[0];
  if (agent.status === 'error') return t('replyBlocked', lang);
  if (agent.status === 'paused') return t('replyPaused', lang);
  if (agent.status === 'working' && first) {
    return t('replyWorking', lang).replace('{title}', localized(first.title, first.titleAr, lang))
      .replace('{n}', String(first.progress));
  }
  return t('replyIdle', lang);
};
