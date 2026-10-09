/**
 * The board's behaviour, in a DOM.
 *
 * The point of these tests is the *rule boundary*: the interface must render the moves the rule
 * offered, refuse the ones it refused (with the rule's own words), and never invent a move of
 * its own. Filtering, the layout switch and the statistics are checked because the designer's demo
 * has them and "parity" has to mean something a machine can verify.
 *
 * There is no server any more (REQ-13), so the tests no longer stub `fetch`: they seed the
 * user-side save — the same store the app itself writes — and then assert on what the save holds
 * after the board acts on it.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { TasksView } from '../src/views/TasksView';
import { PORTRAITS } from '../src/lib/avatars.data';
import { useStore, type AgentRow, type TaskRow } from '../src/data/store';
import { api } from '../src/lib/api';

const ANA = 'aria';
const LEO = 'leo';

/** Stored rows only: the façade attaches the owner and the offered moves when it reads. */
const task = (over: Partial<TaskRow> & { n?: number }): TaskRow => ({
  id: `tsk-${String(over.n ?? 1)}`,
  shortRef: `TSK-1${41 + (over.n ?? 1)}`,
  title: 'A task',
  titleAr: 'مهمة',
  description: null, descriptionAr: null,
  stage: 'backlog', priority: 'medium', progress: 0,
  dueDate: '2026-10-05T00:00:00.000Z',
  ownerAgentId: ANA,
  ...over,
  n: undefined,
} as TaskRow);

// Two tasks: one that can move forward, one waiting at the review gate.
const tasks: TaskRow[] = [
  task({ n: 1, shortRef: 'TSK-142', title: 'Refine the streaming pipeline', titleAr: 'تحسين المسار',
    stage: 'progress', priority: 'high', progress: 65 }),
  task({ n: 2, shortRef: 'TSK-155', title: 'Rehearse the migration', titleAr: 'التدرب على النقل',
    stage: 'review', priority: 'medium', progress: 85, ownerAgentId: LEO }),
];

const agents: AgentRow[] = [
  { id: ANA, name: 'Aria', nameAr: 'آريا', role: 'Lead engineer', roleAr: null, department: null,
    focus: null, focusAr: null, avatar: 3, status: 'working', capabilities: [], managerId: null, model: null },
  { id: LEO, name: 'Leo', nameAr: 'ليو', role: 'Software engineer', roleAr: null, department: null,
    focus: null, focusAr: null, avatar: 2, status: 'working', capabilities: [], managerId: ANA, model: null },
];

/** A named control in the form, typed. `namedItem` returns an element *or* a RadioNodeList. */
const field = (form: HTMLFormElement, name: string) =>
  form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
  useStore.getState().load({ agents, tasks, operator: { name: 'Vanil', role: 'owner' } });
});

afterEach(() => {
  cleanup();
});

describe('the board shows what the demo shows', () => {
  it('counts the four statistics from the real rows', async () => {
    const { container } = render(<TasksView lang="en" />);
    await screen.findByText('Refine the streaming pipeline');
    const stats = within(container.querySelector('.stats') as HTMLElement);
    expect(stats.getByText('Open tasks').nextSibling?.textContent).toBe('2');
    // "In review" appears twice on purpose — once as the statistic, once as the column head.
    expect(stats.getByText('In review').nextSibling?.textContent).toBe('1');
    expect(stats.getByText('Completed').nextSibling?.textContent).toBe('0');
    expect(stats.getByText('In progress').nextSibling?.textContent).toBe('1');
  });

  it('shows a person’s name in the language being read, as the demo does', async () => {
    render(<TasksView lang="ar" />);
    await screen.findByText('TSK-142'); // the fixture gives both rows the same Arabic title
    // the demo prints `tr(agent.name)` everywhere a person is named — the card, the dialog, the form
    expect(screen.getAllByText('آريا').length).toBeGreaterThan(0);
    expect(screen.queryByText('Aria')).toBeNull();
  });

  it('lists the roster in Arabic in the form’s Owner select', async () => {
    render(<TasksView lang="ar" />);
    fireEvent.click(await screen.findByRole('button', { name: 'مهمة جديدة' }));
    const owner = field(document.querySelector('#task-form') as HTMLFormElement, 'owner') as HTMLSelectElement;
    expect([...owner.options].map((option) => option.text)).toEqual(['آريا', 'ليو']);
  });

  it('shows each task’s reference, owner, portrait and progress', async () => {
    const { container } = render(<TasksView lang="en" />);
    await screen.findByText('Refine the streaming pipeline');
    expect(screen.getByText('TSK-142')).toBeTruthy();
    expect(screen.getAllByText('Leo').length).toBeGreaterThan(0);
    expect(screen.getByText('65%')).toBeTruthy();
    // the owner comes with a portrait index and the card draws that portrait (the designer's own art)
    const portrait = container.querySelector(`[data-task="${task({ n: 1 }).id}"] .avatar`);
    expect(portrait?.getAttribute('data-avatar')).toBe('3');
    expect(portrait?.querySelector('svg path')?.getAttribute('d')).toBe(PORTRAITS[3]!.path);
  });

  it('filters by priority, by owner and by search text', async () => {
    render(<TasksView lang="en" />);
    await screen.findByText('Refine the streaming pipeline');

    fireEvent.change(screen.getByLabelText('All priorities'), { target: { value: 'medium' } });
    await waitFor(() => expect(screen.queryByText('Refine the streaming pipeline')).toBeNull());
    expect(screen.getByText('Rehearse the migration')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('All priorities'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('All owners'), { target: { value: ANA } });
    await waitFor(() => expect(screen.queryByText('Rehearse the migration')).toBeNull());

    fireEvent.change(screen.getByLabelText('All owners'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Search tasks…'), { target: { value: 'TSK-155' } });
    await waitFor(() => expect(screen.queryByText('Refine the streaming pipeline')).toBeNull());
    expect(screen.getByText('Rehearse the migration')).toBeTruthy();
  });

  it('says nothing matches rather than pretending the board is empty', async () => {
    render(<TasksView lang="en" />);
    await screen.findByText('Refine the streaming pipeline');
    fireEvent.change(screen.getByLabelText('Search tasks…'), { target: { value: 'zzz' } });
    await screen.findByText('Nothing matches');
    expect(screen.queryByText('No tasks here')).toBeNull();
  });

  it('switches between the board and the list, keeping the same rows', async () => {
    render(<TasksView lang="en" />);
    await screen.findByText('Refine the streaming pipeline');
    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    await screen.findByRole('table');
    expect(within(screen.getByRole('table')).getByText('Rehearse the migration')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Board' }));
    await screen.findByRole('button', { name: /Refine the streaming pipeline/ });
  });
});

describe('the task form, on real state', () => {
  it('opens an empty form from the head’s New task button, with the demo’s six fields', async () => {
    render(<TasksView lang="en" />);
    fireEvent.click(await screen.findByRole('button', { name: 'New task' }));
    const form = document.querySelector('#task-form') as HTMLFormElement;
    expect(form).toBeTruthy();
    // the demo's fields, by their names: title, owner, priority, due, stage, description
    expect([...form.elements].map((el) => (el as HTMLInputElement).name).filter(Boolean))
      .toEqual(['title', 'owner', 'priority', 'due', 'stage', 'description']);
    expect((form.elements.namedItem('title') as HTMLInputElement).value).toBe('');
    // the roster fills the Owner select — the real agents, not a hard-coded list
    expect([...(form.elements.namedItem('owner') as HTMLSelectElement).options].map((o) => o.text))
      .toEqual(['Aria', 'Leo']);
    // the date is required, so it starts filled — an empty required field silently blocks the save
    const due = (form.elements.namedItem('due') as HTMLInputElement);
    expect(due.required).toBe(true);
    expect(due.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('adds a new task to the save and shows it on the board', async () => {
    render(<TasksView lang="en" />);
    fireEvent.click(await screen.findByRole('button', { name: 'New task' }));
    const form = document.querySelector('#task-form') as HTMLFormElement;
    fireEvent.change(field(form, 'title'), { target: { value: 'Draft the November plan' } });
    fireEvent.change(field(form, 'stage'), { target: { value: 'progress' } });
    fireEvent.change(field(form, 'priority'), { target: { value: 'high' } });
    fireEvent.change(field(form, 'due'), { target: { value: '2026-11-03' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }));

    // the save holds the row, exactly as the form described it
    await waitFor(() => expect(useStore.getState().tasks.some((t) => t.title === 'Draft the November plan')).toBe(true));
    const stored = useStore.getState().tasks.find((t) => t.title === 'Draft the November plan')!;
    expect(stored).toMatchObject({ stage: 'progress', priority: 'high', dueDate: '2026-11-03', ownerAgentId: ANA });
    expect(stored.shortRef).toMatch(/^TSK-\d+$/);
    await screen.findByText('Task added.');
    await screen.findByText('Draft the November plan');
  });

  it('writes a new task’s text into the language being read', async () => {
    render(<TasksView lang="ar" />);
    fireEvent.click(await screen.findByRole('button', { name: 'مهمة جديدة' }));
    const form = document.querySelector('#task-form') as HTMLFormElement;
    fireEvent.change(field(form, 'title'), { target: { value: 'خطة نوفمبر' } });
    fireEvent.click(screen.getByRole('button', { name: 'إضافة المهمة' }));
    await waitFor(() => expect(useStore.getState().tasks.some((t) => t.titleAr === 'خطة نوفمبر')).toBe(true));
    const stored = useStore.getState().tasks.find((t) => t.titleAr === 'خطة نوفمبر')!;
    // Arabic goes into the Arabic column, and into the stored title too: the row needs one, and an
    // Arabic reader must see Arabic. (On an *edit* the other column is left alone — tested below.)
    expect(stored.title).toBe('خطة نوفمبر');
  });

  it('leaves the other language’s column alone when editing', async () => {
    render(<TasksView lang="ar" />);
    // the fixture's Arabic title for the first task is the same 'مهمة' for both rows; the ref tells them apart
    fireEvent.click(await screen.findByRole('button', { name: /TSK-142/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'تعديل المهمة' }));
    expect(document.querySelector('#task-form')).toBeTruthy();
    fireEvent.change(document.querySelector('#task-form')!.querySelector('[name=title]')!, {
      target: { value: 'تحسين المسار أكثر' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }));
    await waitFor(() => expect(useStore.getState().tasks.find((t) => t.id === 'tsk-1')!.titleAr).toBe('تحسين المسار أكثر'));
    // the English column is untouched: an Arabic edit must not overwrite it
    expect(useStore.getState().tasks.find((t) => t.id === 'tsk-1')!.title).toBe('Refine the streaming pipeline');
  });

  it('edits an existing task through the same form', async () => {
    render(<TasksView lang="en" />);
    fireEvent.click(await screen.findByRole('button', { name: /Refine the streaming pipeline/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit task' }));
    const form = document.querySelector('#task-form') as HTMLFormElement;
    // the form arrives filled with the task's own values
    expect((form.elements.namedItem('title') as HTMLInputElement).value).toBe('Refine the streaming pipeline');
    expect((form.elements.namedItem('stage') as HTMLSelectElement).value).toBe('progress');
    fireEvent.change(field(form, 'title'), { target: { value: 'Refine the pipeline further' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(useStore.getState().tasks.find((t) => t.id === 'tsk-1')!.title).toBe('Refine the pipeline further'));
    await screen.findByText('Task updated.');
  });

  it('shows the rule’s refusal when the form tries an illegal move', async () => {
    render(<TasksView lang="en" />);
    fireEvent.click(await screen.findByRole('button', { name: /Refine the streaming pipeline/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit task' }));
    fireEvent.change(document.querySelector('#task-form')!.querySelector('[name=stage]')!, { target: { value: 'done' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    // the rule's own sentence, not a generic failure — and the form stays open so the work is not lost
    await screen.findByText('That move is not offered.');
    expect(document.querySelector('#task-form')).toBeTruthy();
    // and the save never changed behind the refusal
    expect(useStore.getState().tasks.find((t) => t.id === 'tsk-1')!.stage).toBe('progress');
  });
});

describe('moving a task follows the rule, shown honestly', () => {
  it('offers the moves the rule allows, and disables the one it refuses with its reason', async () => {
    render(<TasksView lang="en" />);
    fireEvent.click(await screen.findByRole('button', { name: /Rehearse the migration/ }));

    // review → done is the review gate: no approved decision, so the rule says no — in its own words.
    const finish = await screen.findByRole('button', { name: 'Move to Completed' });
    expect(finish.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Waiting for the approval that lets this finish.')).toBeTruthy();

    const back = screen.getByRole('button', { name: 'Move to In progress' });
    expect(back.hasAttribute('disabled')).toBe(false);
  });

  it('writes the chosen move into the save and reloads the board', async () => {
    render(<TasksView lang="en" />);
    fireEvent.click(await screen.findByRole('button', { name: /Refine the streaming pipeline/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Move to In review' }));

    // the save holds the new stage — this is the write the server used to do
    await waitFor(() => expect(useStore.getState().tasks.find((t) => t.id === 'tsk-1')!.stage).toBe('review'));
    // and the board re-reads afterwards, so what is shown is what the save holds
    await waitFor(() => expect(screen.getByRole('button', { name: /Refine the streaming pipeline/ })).toBeTruthy());
  });

  it('refuses a move the rule does not offer, in the rule’s own words', () => {
    // the façade is the rule now: calling it directly shows the same refusal the button shows
    expect(() => api.moveTask('tsk-2', 'done')).toThrow('Waiting for the approval that lets this finish.');
    expect(useStore.getState().tasks.find((t) => t.id === 'tsk-2')!.stage).toBe('review');
  });
});
