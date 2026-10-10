/**
 * Executing the tools (REQ-53, Phase I) — the other half of the registry. lib/tools.ts declares
 * what a model may ask for; this file is what the studio DOES with the ask, and every answer it
 * returns goes back to the model verbatim, so a mistake is told to the model in words rather
 * than swallowed. Three capabilities, three cases, one place to add the fourth.
 *
 * It is its own module (not folded into engine.ts) so the wiring can be proven without a
 * browser or a network: hand it a ToolCall and a studio, read back what happened.
 */
import { useStore } from '../data/store';
import type { AgentRow, MailAttachment, SaveState, TaskRow } from '../data/store';
import type { Lang } from './i18n';
import { localized } from './format';
import type { ToolCall } from './tools';
import { callIntegrationTool } from './integrations';

/** Everything a tool call may need to know about the studio it lands in. */
export interface ToolContext {
  state: SaveState;
  /** The employee whose model made the call. */
  caller: AgentRow;
  /** The task the current cycle is about. */
  task: TaskRow;
  lang: Lang;
  /** How the caller's progress report is written — the engine's own writer, so the tool path
      and the JSON-contract path land in exactly the same place. */
  report: (input: { progress: number; stage: string; note: string }) => void;
}

/** Phase K (REQ-55): integration calls are network-shaped, so the engine awaits this one —
    app tools fall straight through to the synchronous registry. */
export async function runToolAsync(call: ToolCall, ctx: ToolContext): Promise<string> {
  if (call.name.startsWith('ix__')) {
    const parts = call.name.split('__');
    const row = ctx.state.integrations.find((r) => r.id === parts[1]);
    if (!row) return 'That integration is not connected anymore.';
    try {
      return await callIntegrationTool(row, parts.slice(2).join('__'), call.args);
    } catch (err) {
      return `The integration could not run the tool: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
  return runTool(call, ctx);
}

/** One tool call, executed. Returns the words the model sees as the tool's result. */
export function runTool(call: ToolCall, ctx: ToolContext): string {
  switch (call.name) {
    case 'update_progress':
      return updateProgress(call, ctx);
    case 'message_employee':
      return messageEmployee(call, ctx);
    case 'ask_owner':
      return askOwner(call, ctx);
    case 'send_mail':
      return sendMail(call, ctx);
    default:
      return `There is no tool called "${call.name}". Use update_progress, message_employee or ask_owner.`;
  }
}

function updateProgress(call: ToolCall, ctx: ToolContext): string {
  const progress = Number(call.args.progress);
  const stage = typeof call.args.stage === 'string' ? call.args.stage : '';
  const note = typeof call.args.note === 'string' ? call.args.note : '';
  if (!Number.isFinite(progress)) return 'progress must be a number from 0 to 100.';
  if (stage !== 'progress' && stage !== 'review' && stage !== 'done') {
    return 'stage must be "progress", "review" or "done".';
  }
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  ctx.report({ progress: clamped, stage, note });
  return `Recorded: ${clamped}% (${stage}).`;
}

function messageEmployee(call: ToolCall, ctx: ToolContext): string {
  const wanted = typeof call.args.to === 'string' ? call.args.to.trim() : '';
  const text = typeof call.args.text === 'string' ? call.args.text.trim() : '';
  if (wanted === '' || text === '') return 'Say who to message, and what to say.';
  const colleagues = ctx.state.agents.filter((a) => a.id !== ctx.caller.id);
  const target = colleagues.find((a) => matches(a, wanted, ctx.lang));
  if (!target) {
    const names = colleagues.map((a) => localized(a.name, a.nameAr, ctx.lang));
    return `There is no colleague called "${wanted}". Your colleagues: ${names.join(', ') || 'none'}.`;
  }
  // Reuse the thread with that person when one exists; open one when this is the first word.
  const existing = ctx.state.threads.find((th) => th.agentId === target.id);
  if (existing) {
    useStore.getState().addMessage(existing.id, ctx.caller.id, text);
    return `Delivered to ${localized(target.name, target.nameAr, ctx.lang)}.`;
  }
  useStore.getState().startThread(target.id, localized(target.name, target.nameAr, ctx.lang));
  const opened = useStore.getState().threads.find((th) => th.agentId === target.id);
  if (!opened) return 'The message could not be delivered.';
  useStore.getState().addMessage(opened.id, ctx.caller.id, text);
  return `Delivered to ${localized(target.name, target.nameAr, ctx.lang)}.`;
}

/** REQ-54: one open letter per employee — the lock, answered in words to the model. */
function lockedOut(ctx: ToolContext): boolean {
  return ctx.state.decisions.some((d) => d.agentId === ctx.caller.id && (d.status === 'pending' || d.status === 'answered') && (d.kind === 'ask' || d.kind === 'mail'));
}

function sendMail(call: ToolCall, ctx: ToolContext): string {
  if (lockedOut(ctx)) return 'You already have an open letter with the owner — wait for the reply before sending another.';
  const subject = typeof call.args.subject === 'string' ? call.args.subject.trim() : '';
  const body = typeof call.args.body === 'string' ? call.args.body.trim() : '';
  if (subject === '' || body === '') return 'A letter needs a subject and a body.';
  const raw = Array.isArray(call.args.attachments) ? call.args.attachments : [];
  if (raw.length > 3) return 'At most three attachments ride with a letter.';
  const attachments: MailAttachment[] = [];
  for (const item of raw) {
    const row = item as { name?: unknown; kind?: unknown; content?: unknown };
    const name = typeof row.name === 'string' ? row.name.trim() : '';
    const kind = row.kind === 'text' || row.kind === 'md' ? row.kind : '';
    const content = typeof row.content === 'string' ? row.content : '';
    if (name === '' || kind === '' || content === '') return 'Every attachment needs a name, a kind (text or md) and content.';
    attachments.push({ name, kind, content });
  }
  const id = useStore.getState().raiseMail({
    agentId: ctx.caller.id, shortRef: ctx.task.shortRef, subject, body,
    attachments: attachments.length > 0 ? attachments : null,
  });
  if (!id) return 'You already have an open letter with the owner — wait for the reply before sending another.';
  return `Filed in the owner’s mailbox (${id}).`;
}

function askOwner(call: ToolCall, ctx: ToolContext): string {
  if (lockedOut(ctx)) return 'You already have an open letter with the owner — wait for the reply before sending another.';
  const question = typeof call.args.question === 'string' ? call.args.question.trim() : '';
  const options = (Array.isArray(call.args.options) ? call.args.options : [])
    .map((option) => String(option).trim())
    .filter((option) => option !== '')
    .slice(0, 5);
  if (question === '' || options.length < 2) return 'A letter needs one question and two to five options.';
  const id = useStore.getState().raiseAsk({
    agentId: ctx.caller.id,
    shortRef: ctx.task.shortRef,
    title: question,
    body: question,
    options,
  });
  if (!id) return 'You already have an open letter with the owner — wait for the reply before sending another.';
  return `Filed in the owner’s mailbox (${id}).`;
}

/** Names are matched the way a colleague would say them — either language, either case. */
function matches(agent: AgentRow, wanted: string, lang: Lang): boolean {
  const ask = wanted.toLowerCase();
  return [localized(agent.name, agent.nameAr, lang), agent.name, agent.nameAr ?? '']
    .some((name) => name.toLowerCase() === ask);
}
