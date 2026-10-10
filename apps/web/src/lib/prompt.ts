/**
 * REQ-16 — the company profile compiles into the models' system prompts, so a teammate that
 * talks to a real provider already knows the company the owner described: its name, what it
 * does, the owner's own answers, who this person is inside it, and who the colleagues are.
 *
 * REQ-42 + REQ-53 (Phase I): the prompt also teaches the WORKING CONTRACT — the tools the app
 * gives every model, declared in one registry (lib/tools.ts), and the JSON report that stands
 * in when a platform attaches no tools. One contract, one parser, one place each.
 */
import type { AgentRow, SaveState } from '../data/store';
import type { Lang } from './i18n';
import { localized } from './format';
import { APP_TOOLS, integrationToolDefs, toolsPromptSection } from './tools';

export function compileSystemPrompt(save: SaveState, agent: AgentRow, lang: Lang): string {
  const company = save.company;
  const manager = agent.managerId ? (save.agents.find((a: AgentRow) => a.id === agent.managerId) ?? null) : null;
  const name = localized(agent.name, agent.nameAr, lang);
  const role = localized(agent.role, agent.roleAr, lang);
  const managerName = manager ? localized(manager.name, manager.nameAr, lang) : null;

  const lines: string[] = [];
  lines.push(`You work at ${company.name}. Everything below is true of your company — act from it.`);
  if (company.description.trim() !== '') lines.push(`What it does: ${company.description.trim()}`);
  for (const answer of company.answers) {
    if (answer.q.trim() !== '' && answer.a.trim() !== '') lines.push(`${answer.q.trim()} — ${answer.a.trim()}`);
  }
  lines.push('');
  lines.push(IDENTITY(name, role, agent.focus ? localized(agent.focus, agent.focusAr, lang) : '', managerName));
  const colleagues = save.agents.filter((a: AgentRow) => a.id !== agent.id);
  if (colleagues.length > 0) {
    lines.push(
      `Your colleagues: ${colleagues
        .map((c: AgentRow) => `${localized(c.name, c.nameAr, lang)} (${localized(c.role, c.roleAr, lang)})`)
        .join(', ')}.`,
    );
  }
  lines.push('');
  lines.push(toolsPromptSection([...APP_TOOLS, ...integrationToolDefs(save.integrations)]));
  lines.push(STAGES);
  lines.push('');
  lines.push('In chat with a colleague or the owner, answer briefly, in character, as a teammate would.');
  return lines.join('\n');
}

function IDENTITY(name: string, role: string, focus: string, managerName: string | null): string {
  const lines = [
    `You are ${name}, the ${role}.`,
    focus.trim() !== '' ? `Your current focus: ${focus.trim()}` : null,
    managerName
      ? `You report to ${managerName}. Keep them informed; they are the one your progress reaches first.`
      : 'You report directly to the owner of the company.',
  ].filter((line): line is string => line !== null);
  return lines.join('\n');
}

const STAGES = `A task's stage only moves forward: progress -> review -> done. "review" means the
work is finished and waiting for a human look; "done" means accepted and closed.`;
