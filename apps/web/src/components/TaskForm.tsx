/**
 * The task form — the demo's `taskForm()`, in product form.
 *
 * The designer's dialog holds six fields: Title, Owner, Priority, Due date, Stage, Description, and
 * two buttons (Cancel, and Add task / Save changes). Same fields, same order, same words. It is one
 * component for both directions: creating and editing differ only in what it is handed and which
 * call it makes on submit.
 *
 * The form does not decide what is legal. The stage select offers the four stages, and if the choice
 * is refused the server's own sentence is shown beside the form — the review gate is checked by
 * `transitionTask` on the server, never here.
 */
import { useState } from 'react';
import { Dialog } from './Dialog';
import { STAGE_LABELS, PRIORITY_LABELS, TASK_PRIORITIES, TASK_STAGES, type TaskStage } from '@company/contracts';
import { t, type Lang } from '../lib/i18n';
import { localized } from '../lib/format';
import type { TaskRow } from '../lib/api';

/**
 * What the form collects. The demo has a single Title and a single Description field, shown in the
 * language being read (`tr(...)` in its source); the product stores both languages side by side, so
 * the field writes the column for the language on screen and leaves the other column as it was —
 * an Arabic edit never overwrites the English title with Arabic text or the other way round.
 */
export interface TaskFormValues {
  title: string;
  description: string | null;
  ownerAgentId: string;
  stage: TaskStage;
  priority: TaskRow['priority'];
  dueDate: string | null;
}

/**
 * The date a new task starts with: two days out, in UTC — the same distance the demo leaves between
 * its own today and its pre-filled date. Computed when the form opens, never stored as a constant.
 */
function defaultDueDate(): string {
  return new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function TaskForm({
  open, lang, task, agents, onSubmit, onClose,
}: {
  open: boolean;
  lang: Lang;
  /** The task being edited, or nothing for a new one. */
  task: TaskRow | null;
  agents: Array<{ id: string; name: string; nameAr?: string | null }>;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onClose: () => void;
}) {
  const [values, setValues] = useState<TaskFormValues | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  // The form is filled once per opening, from whatever it was opened with. Held in the component
  // rather than derived on every render, so typing is not undone by a board refresh behind it.
  const [filledFor, setFilledFor] = useState<string | null>(null);
  const key = task?.id ?? 'new';
  if (open && filledFor !== key) {
    setFilledFor(key);
    setValues({
      title: task ? localized(task.title, task.titleAr, lang) : '',
      description: task ? (localized(task.description, task.descriptionAr, lang) || null) : null,
      ownerAgentId: task?.ownerAgentId ?? agents[0]?.id ?? '',
      stage: task?.stage ?? 'backlog',
      priority: task?.priority ?? 'medium',
      // A new task arrives with a date already chosen, as the demo's form does (its field is
      // `required` and pre-filled) — a required field that starts empty blocks the save button
      // without saying why, which reads as a broken form rather than a question.
      dueDate: task ? (task.dueDate?.slice(0, 10) ?? null) : defaultDueDate(),
    });
  }
  if (!open && filledFor !== null) {
    setFilledFor(null);
    setFailed(null);
  }
  if (!values) return null;

  const edit = (patch: Partial<TaskFormValues>) => setValues((current) => ({ ...current!, ...patch }));

  const submit = async () => {
    setBusy(true);
    setFailed(null);
    try {
      await onSubmit(values);
      onClose();
    } catch (error) {
      // The server's words, not a generic failure: a refused stage is a rule talking, not a bug.
      const apiError = (error as { apiError?: { message: string } }).apiError;
      setFailed(apiError?.message ?? t('saveFailed', lang));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      lang={lang}
      title={task ? t('saveChanges', lang) : t('newTask', lang)}
      eyebrow={t('tasks', lang)}
      actions={
        <>
          <button type="button" className="btn" onClick={onClose}>{t('cancel', lang)}</button>
          <button type="submit" form="task-form" className="btn primary" disabled={busy || values.title.trim() === ''}>
            {task ? t('saveChanges', lang) : t('addTask', lang)}
          </button>
        </>
      }
    >
      <form
        id="task-form"
        className="form-grid"
        onSubmit={(event) => { event.preventDefault(); void submit(); }}
      >
        <label className="field full">
          {t('title', lang)}
          <input
            name="title"
            required
            maxLength={120}
            autoFocus
            value={values.title}
            onChange={(event) => edit({ title: event.target.value })}
          />
        </label>
        <label className="field">
          {t('owner', lang)}
          <select
            name="owner"
            value={values.ownerAgentId}
            onChange={(event) => edit({ ownerAgentId: event.target.value })}
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>{localized(agent.name, agent.nameAr, lang)}</option>
            ))}
          </select>
        </label>
        <label className="field">
          {t('priority', lang)}
          <select
            name="priority"
            value={values.priority}
            onChange={(event) => edit({ priority: event.target.value as TaskRow['priority'] })}
          >
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>{PRIORITY_LABELS[priority][lang]}</option>
            ))}
          </select>
        </label>
        <label className="field">
          {t('dueDate', lang)}
          <input
            name="due"
            type="date"
            required
            value={values.dueDate ?? ''}
            onChange={(event) => edit({ dueDate: event.target.value || null })}
          />
        </label>
        <label className="field">
          {t('stage', lang)}
          <select
            name="stage"
            value={values.stage}
            onChange={(event) => edit({ stage: event.target.value as TaskStage })}
          >
            {TASK_STAGES.map((stage) => (
              <option key={stage} value={stage}>{STAGE_LABELS[stage][lang]}</option>
            ))}
          </select>
        </label>
        <label className="field full">
          {t('description', lang)}
          <textarea
            name="description"
            maxLength={2000}
            rows={3}
            value={values.description ?? ''}
            onChange={(event) => edit({ description: event.target.value || null })}
          />
        </label>
      </form>
      {failed ? <p role="alert" className="reason">{failed}</p> : null}
    </Dialog>
  );
}
