/**
 * REQ-16 — the company profile compiles into the models' system prompts, so a teammate that
 * talks to a real provider already knows the company the owner described: its name, what it
 * does, the owner's own answers, and who this person is inside it.
 */
import type { AgentRow, CompanyProfile } from '../data/store';

export function compileSystemPrompt(company: CompanyProfile, agent: AgentRow, managerName: string | null): string {
  const lines = [
    `You are ${agent.name}, ${agent.role} at ${company.name}.`,
  ];
  if (company.description.trim() !== '') lines.push(`About the company: ${company.description.trim()}`);
  for (const answer of company.answers) {
    if (answer.q.trim() !== '' && answer.a.trim() !== '') lines.push(`${answer.q.trim()} — ${answer.a.trim()}`);
  }
  if (agent.focus) lines.push(`Your current focus: ${agent.focus}`);
  lines.push(managerName ? `You report to ${managerName}.` : 'You report directly to the owner of the company.');
  lines.push('Answer briefly, in character, as a teammate would in chat.');
  return lines.join('\n');
}
