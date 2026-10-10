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
import type { AgentRow, SaveState, TaskRow } from '../data/store';
import type { Lang } from './i18n';
import { localized } from './format';
import type { ToolCall } from './tools';

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

/** One tool call, executed. Returns the words the model sees as the tool's result. */
export function runTool(call: ToolCall, ctx: ToolContext): string {
  switch (call.name) {
    case 'update_progress':
      return updateProgress(call, ctx);
    case 'message_employee':
      return messageEmployee(call, ctx);
    case 'ask_owner':
      return askOwner(call, ctx);
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

function askOwner(call: ToolCall, ctx: ToolContext): string {
  const question = typeof call.args.question === 'string' ? call.args.question.trim() : '';
  const options = (Array.isArray(call.args.options) ? call.args.options : [])
    .map((option) => String(option).trim())
    .filter((option) => option !== '')
    .slice(0, 5);
  if (question === '' || options.length < 2) return 'A letter needs one question and two to five options.';
  useStore.getState().raiseAsk({
    agentId: ctx.caller.id,
    shortRef: ctx.task.shortRef,
    title: question,
    body: question,
    options,
  });
  return 'Filed in the owner’s mailbox.';
}

/** Names are matched the way a colleague would say them — either language, either case. */
function matches(agent: AgentRow, wanted: string, lang: Lang): boolean {
  const ask = wanted.toLowerCase();
  return [localized(agent.name, agent.nameAr, lang), agent.name, agent.nameAr ?? '']
    .some((name) => name.toLowerCase() === ask);
}
