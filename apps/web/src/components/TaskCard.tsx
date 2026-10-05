/**
 * A task, as the demo draws it: the id, the priority, the title, who owns it, its date,
 * and how far along it is. It is one button — the whole card opens the task.
 */
import { Badge, toneOf } from './Badge';
import { date, localized, percent } from '../lib/format';
import type { Lang } from '../lib/i18n';
import type { TaskRow } from '../lib/api';

export function TaskCard({ task, lang, onOpen }: { task: TaskRow; lang: Lang; onOpen: (task: TaskRow) => void }) {
  return (
    <button type="button" className="panel task" data-task={task.id} onClick={() => onOpen(task)}>
      <span className="row between">
        <span className="task-id">{task.shortRef}</span>
        <Badge tone={toneOf(task.priority)}>{task.priority}</Badge>
      </span>
      <span className="task-title">{localized(task.title, task.titleAr, lang)}</span>
      <span className="task-meta">
        <span className="initial">{task.owner?.name.slice(0, 1) ?? '—'}</span>
        <span>{task.owner?.name ?? ''}</span>
        <span className="grow" />
        <bdi>{date(task.dueDate, lang)}</bdi>
      </span>
      <span className="row">
        <span className="meter grow" role="meter" aria-valuemin={0} aria-valuemax={100}
              aria-valuenow={task.progress}
              aria-label={`${localized(task.title, task.titleAr, lang)} — ${percent(task.progress, lang)}`}>
          <span style={{ inlineSize: `${task.progress}%` }} />
        </span>
        <span className="task-id">{percent(task.progress, lang)}</span>
      </span>
    </button>
  );
}
