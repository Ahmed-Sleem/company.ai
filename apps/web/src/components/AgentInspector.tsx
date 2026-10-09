/**
 * One inspector for one person — the same window everywhere a person can be clicked
 * (owner, third round: "the same inspector should be shared with the world view").
 *
 * The world's desk drawer and the network's node window both render THIS: the portrait, the
 * name and role, the status control that writes straight into the save, and the person's open
 * work with its progress. Extra facts (which room a desk sits in, say) slot in as children,
 * so each view keeps what only it knows without forking the inspector.
 */
import type { ReactNode } from 'react';
import { useStore, type AgentRow, type TaskRow } from '../data/store';
import { t, type Lang } from '../lib/i18n';
import { localized, STATUS_KEY } from '../lib/format';
import { Avatar } from './Avatar';
import { Icon } from './Icon';

export function AgentInspector({ agent, tasks, lang, onClose, closeAttrs, children }: {
  agent: AgentRow;
  /** The person's open tasks, as the calling view already has them. */
  tasks: TaskRow[];
  lang: Lang;
  onClose: () => void;
  /** View-specific hooks for the close button (the world's drawer carries `data-world`). */
  closeAttrs?: Record<string, string>;
  /** Facts only one view knows — e.g. which room the desk sits in. */
  children?: ReactNode;
}) {
  const patchAgent = useStore((s) => s.patchAgent);
  return (
    <>
      <div className="drawer-head">
        <Avatar index={agent.avatar ?? undefined} />
        <div>
          <h3>{localized(agent.name, agent.nameAr, lang)}</h3>
          <p className="muted">
            {localized(agent.role, agent.roleAr, lang)}
            {agent.department ? ` · ${agent.department}` : ''}
          </p>
        </div>
        <button type="button" className="btn small iconbtn" onClick={onClose}
          aria-label={t('close', lang)} {...closeAttrs}>
          <Icon name="close" />
        </button>
      </div>
      <label className="field inspector-status">
        {t('status', lang)}
        <select value={agent.status} onChange={(event) => patchAgent(agent.id, { status: event.target.value })}>
          {['working', 'idle', 'error', 'paused'].map((s) => (
            <option key={s} value={s}>{t(STATUS_KEY[s] ?? 'statusIdle', lang)}</option>
          ))}
        </select>
      </label>
      {children}
      <h4 className="sectionhead-mini">{`${t('tasks', lang)} · ${tasks.length}`}</h4>
      {tasks.length === 0 ? <p className="small dim">{t('teamNoTasks', lang)}</p> : (
        <ul className="drawer-tasks">
          {tasks.map((task) => (
            <li key={task.id}>
              <span className="task-id">{task.shortRef}</span>
              <span>{localized(task.title, task.titleAr, lang)}</span>
              <meter className="progress" value={task.progress} min={0} max={100}
                aria-label={`${t('progress', lang)} ${task.progress}%`} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
