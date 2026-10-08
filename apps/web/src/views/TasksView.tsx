/**
 * Tasks — the demo's board, on the product's real state.
 *
 * The words for stages and priorities come from `@company/contracts` (the same table the API and
 * the designer's demo agree on); the moves a task may take come from the server with each task,
 * already carrying the reason when a move is refused. The interface therefore never decides what
 * is allowed — it shows what it was told and sends the move the person chose.
 */
import { useEffect, useMemo, useState } from 'react';
import { PRIORITY_LABELS, STAGE_LABELS, TASK_PRIORITIES, TASK_STAGES, type TaskStage } from '@company/contracts';
import { api, type TaskRow, type TransitionOffer } from '../lib/api';
import { t, type Lang } from '../lib/i18n';
import { date, localized, percent } from '../lib/format';
import { ScreenHead } from '../components/ScreenHead';
import { DataState, type DataStateKind } from '../components/DataState';
import { Stat } from '../components/Stat';
import { SearchField, Segmented, Select } from '../components/Controls';
import { Badge, toneOf } from '../components/Badge';
import { Dialog } from '../components/Dialog';
import { TaskCard } from '../components/TaskCard';
import { TaskForm, type TaskFormValues } from '../components/TaskForm';

type Layout = 'board' | 'list';

/** One place that turns a client-side filter set into the demo's filtering rule. */
function visible(tasks: TaskRow[], query: string, priority: string, owner: string): TaskRow[] {
  const needle = query.trim().toLowerCase();
  return tasks.filter((task) => {
    if (priority !== 'all' && task.priority !== priority) return false;
    if (owner !== 'all' && task.ownerAgentId !== owner) return false;
    if (!needle) return true;
    const haystack = [task.title, task.titleAr ?? '', task.shortRef, task.owner?.name ?? '']
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function TasksView({ lang, forcedState }: { lang: Lang; forcedState?: DataStateKind }) {
  const [tasks, setTasks] = useState<TaskRow[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState<string>('all');
  const [owner, setOwner] = useState<string>('all');
  const [layout, setLayout] = useState<Layout>('board');
  const [open, setOpen] = useState<TaskRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const [agents, setAgents] = useState<Array<{ id: string; name: string; nameAr: string | null }>>([]);
  /** `undefined` = closed, `null` = a new task, a row = editing that task. */
  const [form, setForm] = useState<TaskRow | null | undefined>(undefined);
  const [note, setNote] = useState<string | null>(null);

  const load = () => {
    setError(false);
    return Promise.all([api.tasks(), api.agents()])
      .then(([result, roster]) => {
        setTasks(result.tasks);
        setAgents(roster.agents.map((agent) => ({ id: agent.id, name: agent.name, nameAr: agent.nameAr })));
      })
      .catch(() => setError(true));
  };

  useEffect(() => {
    if (forcedState && forcedState !== 'default') return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forcedState]);

  const rows = useMemo(
    () => visible(tasks ?? [], query, priority, owner),
    [tasks, query, priority, owner],
  );

  const owners = useMemo(() => {
    const seen = new Map<string, string>();
    for (const task of tasks ?? []) {
      // The demo's All owners filter lists people by `name()`, which is language-aware.
      if (task.owner && !seen.has(task.owner.id)) {
        seen.set(task.owner.id, localized(task.owner.name, task.owner.nameAr, lang));
      }
    }
    return [...seen.entries()].map(([id, name]) => ({ value: id, label: name }));
  }, [tasks, lang]);

  const state: DataStateKind = forcedState && forcedState !== 'default'
    ? forcedState
    : error ? 'error' : tasks ? 'default' : 'loading';

  const label = (stage: TaskStage) => STAGE_LABELS[stage][lang];

  const move = async (task: TaskRow, offer: TransitionOffer) => {
    setBusy(true);
    setRefused(null);
    try {
      await api.moveTask(task.id, offer.to);
      const refreshed = await api.tasks();
      setTasks(refreshed.tasks);
      setOpen((current) => (current ? refreshed.tasks.find((row) => row.id === current.id) ?? null : null));
    } catch (moveError) {
      // The server's own words for why: the rule lives there, and it answers plainly.
      const apiError = (moveError as { apiError?: { message: string } }).apiError;
      setRefused(apiError?.message ?? t('moveFailed', lang));
      void load();
    } finally {
      setBusy(false);
    }
  };

  /**
   * Save the form. The stage is sent with the other fields and the server routes it through the
   * same rule the move buttons use, so the form cannot do anything the board cannot.
   */
  const saveTask = async (values: TaskFormValues) => {
    // Which column the text belongs in follows the language being read — an Arabic edit must not
    // overwrite the English title with Arabic text, nor the other way round.
    const arabic = lang === 'ar';
    const languageFields = {
      ...(arabic ? { titleAr: values.title } : { title: values.title }),
      ...(arabic ? { descriptionAr: values.description } : { description: values.description }),
    };
    const shape = {
      ownerAgentId: values.ownerAgentId,
      stage: values.stage,
      priority: values.priority,
      dueDate: values.dueDate,
      ...languageFields,
    };
    if (form && form.id) {
      await api.updateTask(form.id, shape);
    } else {
      // A new row needs its stored title in *both* readings: the contract requires one, and Arabic
      // readers must see Arabic. So the text goes to the language's column, and the required column
      // carries it too — the same fallback `localized()` applies when reading (`tr()` in the demo).
      await api.createTask({
        ...shape,
        title: values.title,
        ...(arabic ? { titleAr: values.title } : {}),
      });
    }
    await load();
    setNote(t(form ? 'taskUpdated' : 'taskAdded', lang));
  };

  const counts = {
    open: (tasks ?? []).filter((task) => task.stage !== 'done').length,
    progress: (tasks ?? []).filter((task) => task.stage === 'progress').length,
    review: (tasks ?? []).filter((task) => task.stage === 'review').length,
    done: (tasks ?? []).filter((task) => task.stage === 'done').length,
  };

  return (
    <>
      <ScreenHead
        eyebrow={`${t('tasks', lang)} / ${t('overview', lang)}`}
        title={t('tasksTitle', lang)}
        subtitle={t('tasksSubtitle', lang)}
        action={
          <button type="button" className="btn primary" onClick={() => setForm(null)}>
            {t('newTask', lang)}
          </button>
        }
      />
      <div className="pagebody">
      <DataState state={state} lang={lang} onRetry={() => location.reload()}>
        {tasks && tasks.length > 0 && (
          <section className="stats">
            <Stat label={t('openTasks', lang)} value={String(counts.open)} note={t('yourPeople', lang)} />
            <Stat label={STAGE_LABELS.progress[lang]} value={String(counts.progress)} note={t('workingNow', lang)} />
            <Stat label={STAGE_LABELS.review[lang]} value={String(counts.review)} note={t('waitingForYou', lang)} />
            <Stat label={STAGE_LABELS.done[lang]} value={String(counts.done)} note={t('allCaughtUp', lang)} />
          </section>
        )}

        <div className="toolbar">
          <SearchField value={query} onChange={setQuery} placeholder={t('searchTasks', lang)} label={t('searchTasks', lang)} />
          <Select
            value={priority}
            onChange={setPriority}
            label={t('allPriorities', lang)}
            options={[{ value: 'all', label: t('allPriorities', lang) },
              ...TASK_PRIORITIES.map((value) => ({ value, label: PRIORITY_LABELS[value][lang] }))]}
          />
          <Select
            value={owner}
            onChange={setOwner}
            label={t('allOwners', lang)}
            options={[{ value: 'all', label: t('allOwners', lang) }, ...owners]}
          />
          <span className="grow" />
          <Segmented
            value={layout}
            onChange={setLayout}
            label={`${t('board', lang)} / ${t('list', lang)}`}
            options={[{ value: 'board' as Layout, label: t('board', lang) },
              { value: 'list' as Layout, label: t('list', lang) }]}
          />
        </div>

        {tasks && rows.length === 0 ? (
          <DataState state="empty" lang={lang} title={t('noMatchesTitle', lang)} body={t('noMatchesBody', lang)} />
        ) : layout === 'board' ? (
          <div className="board">
            {TASK_STAGES.map((stage) => {
              const inStage = rows.filter((task) => task.stage === stage);
              return (
                <section className="column" key={stage}>
                  <h2 className="column-head">
                    <span className={`dot ${stage === 'progress' ? 'accent' : ''}`} aria-hidden="true" />
                    {/* The demo prints the vocabulary key here (`${t(s)}` with no dictionary
                        entry falls back to the key), which is why its board reads "backlog",
                        "progress" — while the statistics above read "In progress". Same rule
                        here, so the two screens say the same words. */}
                    <span>{stage}</span>
                    <span>{inStage.length}</span>
                  </h2>
                  {inStage.map((task) => (
                    <TaskCard key={task.id} task={task} lang={lang} onOpen={setOpen} />
                  ))}
                  {inStage.length === 0 && <p className="empty-inline">{t('noTasksHere', lang)}</p>}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">{t('task', lang)}</th>
                  <th scope="col">{t('owner', lang)}</th>
                  <th scope="col">{t('stage', lang)}</th>
                  <th scope="col">{t('priority', lang)}</th>
                  <th scope="col">{t('dueDate', lang)}</th>
                  <th scope="col">{t('progress', lang)}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <button type="button" className="textbtn" onClick={() => setOpen(task)}>
                        {localized(task.title, task.titleAr, lang)}
                      </button>
                      <div className="task-id">{task.shortRef}</div>
                    </td>
                    <td>{task.owner?.name ?? ''}</td>
                    <td><Badge tone={toneOf(task.stage)}>{label(task.stage)}</Badge></td>
                    <td><Badge tone={toneOf(task.priority)}>{PRIORITY_LABELS[task.priority][lang]}</Badge></td>
                    <td><bdi>{date(task.dueDate, lang)}</bdi></td>
                    <td><bdi>{percent(task.progress, lang)}</bdi></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataState>

      <Dialog
        open={open !== null}
        onClose={() => { setOpen(null); setRefused(null); }}
        title={open ? localized(open.title, open.titleAr, lang) : ''}
        eyebrow={t('taskDetail', lang)}
        lang={lang}
        actions={open ? [
          <button key="close" type="button" className="btn" onClick={() => { setOpen(null); setRefused(null); }}>
            {t('close', lang)}
          </button>,
          ...open.offers.map((offer) => (
          <span key={offer.to} className="movegroup">
            <button
              type="button"
              className="btn"
              disabled={!offer.ok || busy}
              aria-disabled={!offer.ok || busy}
              title={offer.ok ? undefined : offer.reason?.[lang]}
              onClick={() => move(open, offer)}
            >
              {`${t('moveTo', lang)} ${label(offer.to)}`}
            </button>
            {!offer.ok && offer.reason ? <span className="reason">{offer.reason[lang]}</span> : null}
          </span>
          )),
          <button
            key="edit"
            type="button"
            className="btn primary"
            onClick={() => { setForm(open); setOpen(null); }}
          >
            {t('editTask', lang)}
          </button>,
        ] : null}
      >
        {open && (
          <>
            <div className="row between wrap">
              <span className="task-id">{open.shortRef}</span>
              <Badge tone={toneOf(open.priority)}>{open.priority}</Badge>
            </div>
            <dl className="details">
              <dt>{t('owner', lang)}</dt>
              <dd>{open.owner?.name ?? ''}</dd>
              <dt>{t('stage', lang)}</dt>
              <dd><Badge tone={toneOf(open.stage)}>{label(open.stage)}</Badge></dd>
              <dt>{t('priority', lang)}</dt>
              <dd><Badge tone={toneOf(open.priority)}>{PRIORITY_LABELS[open.priority][lang]}</Badge></dd>
              <dt>{t('dueDate', lang)}</dt>
              <dd><bdi>{date(open.dueDate, lang)}</bdi></dd>
              <dt>{t('progress', lang)}</dt>
              <dd>{percent(open.progress, lang)}</dd>
              <dt>{t('description', lang)}</dt>
              <dd>{localized(open.description, open.descriptionAr, lang) || '—'}</dd>
            </dl>
            {refused ? <p role="alert" className="reason">{refused}</p> : null}
          </>
        )}
      </Dialog>
      <TaskForm
        open={form !== undefined}
        lang={lang}
        task={form ?? null}
        agents={agents}
        onSubmit={saveTask}
        onClose={() => setForm(undefined)}
      />
      {note ? <p role="status" className="note">{note}</p> : null}
      </div>
    </>
  );
}
