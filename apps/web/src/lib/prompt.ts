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
  lines.push(PROGRESS_CONTRACT);
  return lines.join('\n');
}

/**
 * REQ-42 (owner, sixth round): the structured progress report, defined ONCE here and handed to
 * every model through its system prompt. Each engine cycle the model answers with one JSON
 * object; the engine parses exactly this shape (`parseReport` in lib/engine.ts). One contract,
 * one parser, one place each — the rule is centralisation.
 */
export const PROGRESS_CONTRACT = [
  'Progress reports: when you are asked for a progress report on a task, reply with ONE JSON',
  'object and nothing else, exactly in this shape:',
  '{"progress": <integer 0-100, your honest estimate of how much of the task is done>,',
  ' "stage": "progress" | "review" | "done",',
  ' "note": "<one short line: what you did this cycle, or what you need if you are blocked>",',
  // REQ-46 (owner, seventh round): the user-facing ask — a letter to the owner's mailbox,
  // answered with one of the offered options or with free text. Optional: most cycles have none.
  ' "ask": { "question": "<one clear question for the owner>",',
  '          "options": ["<short option>", "<short option>", ...] } }',
  'The "ask" field is OPTIONAL — include it only when you need the owner to decide something',
  'before you can continue; give two to five short options. No markdown fences, no commentary',
  'around the object. If you are blocked, keep your current progress number, keep stage',
  '"progress", explain in the note, and put the decision to the owner with an "ask".',
].join('\n');
