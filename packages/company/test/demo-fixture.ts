/**
 * Reads the designer's demo — the locked visual and content source — so tests can assert against
 * the real thing instead of a copy of it that someone forgot to update.
 *
 * `design/designer-demo/ai-company-os.html` is never edited by this project, which is exactly
 * what makes it usable as a fixture. The parsing is deliberately small: pull the `data` block's
 * array for a kind of record, then read fields out of each row.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEMO_PATH = join(HERE, '../../../design/designer-demo/ai-company-os.html');

const html = readFileSync(DEMO_PATH, 'utf8');

function block(name: string): string {
  const match = new RegExp(`${name}\\s*:\\s*\\[(.*?)\\n\\s*\\],`, 's').exec(html);
  // the demo file must contain this block; a missing one is a fixture error, not a pass
  const body = match?.[1];
  if (body === undefined) throw new Error(`demo fixture: no ${name} block in ${DEMO_PATH}`);
  return body;
}

function rows(name: string): string[] {
  const found = [...block(name).matchAll(/\{([^{}]*)\}/g)].map((match) => match[1]);
  return found.filter((row): row is string => typeof row === 'string');
}

const text = (row: string, key: string): string | null =>
  new RegExp(`${key}\\s*:\\s*'([^']*)'`).exec(row)?.[1] ?? null;

/** `['English','Arabic']` pairs, which the demo uses for user-visible words. */
const pair = (row: string, key: string): [string, string] | null => {
  const match = new RegExp(`${key}\\s*:\\s*\\[\\s*'([^']*)'\\s*,\\s*'([^']*)'\\s*\\]`).exec(row);
  return match ? [match[1]!, match[2]!] : null;
};

const int = (row: string, key: string): number | null => {
  const raw = new RegExp(`${key}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`).exec(row)?.[1];
  return raw === undefined ? null : Number(raw);
};

const list = (row: string, key: string): string[] => {
  const match = new RegExp(`${key}\\s*:\\s*\\[([^\\]]*)\\]`).exec(row);
  return match ? [...match[1]!.matchAll(/'([^']*)'/g)].map((m) => m[1]!) : [];
};

export interface DemoAgent {
  key: string; name: string; nameAr: string; role: string; roleAr: string;
  department: string; status: string; avatar: number; spentCents: number; budgetCents: number;
  focus: string; focusAr: string; skills: string[]; manager: string;
}

export interface DemoTask {
  ref: string; title: string; titleAr: string; owner: string; stage: string;
  priority: string; progress: number; due: string | null; description: string | null; descriptionAr: string | null;
}

export interface DemoDecision {
  ref: string; title: string; titleAr: string; from: string; risk: string; costCents: number;
  ask: string; askAr: string;
}

export const demo = {
  agents: (): DemoAgent[] => rows('agents').map((row) => {
    const name = pair(row, 'name')!;
    const role = pair(row, 'role')!;
    const focus = pair(row, 'focus')!;
    return {
      key: text(row, 'id')!,
      name: name[0], nameAr: name[1],
      role: role[0], roleAr: role[1],
      department: text(row, 'dept')!,
      status: text(row, 'status')!,
      avatar: int(row, 'avatar')!,
      // The demo shows dollars; the product stores cents.
      spentCents: Math.round((int(row, 'spent') ?? 0) * 100),
      budgetCents: Math.round((int(row, 'budget') ?? 0) * 100),
      focus: focus[0], focusAr: focus[1],
      skills: list(row, 'skills'),
      manager: text(row, 'manager')!,
    };
  }),

  tasks: (): DemoTask[] => rows('tasks').map((row) => {
    const title = pair(row, 'title')!;
    const description = pair(row, 'description');
    return {
      ref: text(row, 'id')!,
      title: title[0], titleAr: title[1],
      owner: text(row, 'owner')!,
      stage: text(row, 'stage')!,
      priority: text(row, 'priority')!,
      progress: int(row, 'progress')!,
      due: text(row, 'due'),
      description: description?.[0] ?? null,
      descriptionAr: description?.[1] ?? null,
    };
  }),

  decisions: (): DemoDecision[] => rows('decisions').map((row) => {
    const title = pair(row, 'title')!;
    const ask = pair(row, 'ask')!;
    return {
      ref: text(row, 'id')!,
      title: title[0], titleAr: title[1],
      from: text(row, 'from')!,
      risk: text(row, 'risk')!,
      costCents: Math.round((int(row, 'cost') ?? 0) * 100),
      ask: ask[0], askAr: ask[1],
    };
  }),

  operator: (): string => /operator\s*:\s*'([^']*)'/.exec(html)![1]!,
};
