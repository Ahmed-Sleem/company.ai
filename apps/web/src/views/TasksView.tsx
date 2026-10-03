/**
 * Tasks — the board, with the four stages exactly as the demo names them.
 * The review column is where the gate is visible: a card in review is waiting for a person.
 */
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { t, type Lang } from '../lib/i18n';
import { Panel } from '../components/Panel';
import { DataState, type DataStateKind } from '../components/DataState';

const STAGES = [
  { id: 'backlog', en: 'Backlog', ar: 'قائمة الانتظار' },
  { id: 'progress', en: 'In progress', ar: 'قيد التنفيذ' },
  { id: 'review', en: 'In review', ar: 'قيد المراجعة' },
  { id: 'done', en: 'Completed', ar: 'مكتملة' },
] as const;

export function TasksView({ lang, forcedState }: { lang: Lang; forcedState?: DataStateKind }) {
  const [tasks, setTasks] = useState<Awaited<ReturnType<typeof api.tasks>>['tasks'] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (forcedState && forcedState !== 'default') return;
    api.tasks().then((r) => setTasks(r.tasks)).catch(() => setError(true));
  }, [forcedState]);

  const state: DataStateKind = forcedState && forcedState !== 'default'
    ? forcedState
    : error ? 'error' : tasks ? 'default' : 'loading';

  return (
    <Panel title={t('tasks', lang)} note={t('tasksNote', lang)}>
      <DataState state={state} lang={lang} onRetry={() => location.reload()}>
        <div className="board">
          {STAGES.map((stage) => {
            const inStage = tasks?.filter((task) => task.stage === stage.id) ?? [];
            return (
              <section className="column" key={stage.id} aria-label={lang === 'ar' ? stage.ar : stage.en}>
                <header className="column-head">
                  <span>{lang === 'ar' ? stage.ar : stage.en}</span>
                  <span>{inStage.length}</span>
                </header>
                {inStage.map((task) => (
                  <article className="card" key={task.id}>
                    <h3>{task.title}</h3>
                    <div className="meta">
                      <span className={`tag ${task.priority}`}>{task.priority}</span>
                      <span>{task.progress}%</span>
                    </div>
                    <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100}
                         aria-valuenow={task.progress} aria-label={task.title}>
                      <span style={{ inlineSize: `${task.progress}%` }} />
                    </div>
                  </article>
                ))}
                {inStage.length === 0 && <p className="role">{t('emptyTitle', lang)}</p>}
              </section>
            );
          })}
        </div>
      </DataState>
    </Panel>
  );
}
