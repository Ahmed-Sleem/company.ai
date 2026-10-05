/**
 * Parity: the product's database must hold the designer's company, not a similar one.
 *
 * This test reads `design/designer-demo/ai-company-os.html` — the locked source, never edited —
 * and compares it with what the seed produced. If someone changes a role, a budget, a task title
 * or an Arabic string in either place, this fails and says exactly which field disagrees.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPgliteDb, budgetState, schema, seed, type Db } from '../src/index.js';
import { demo } from './demo-fixture.js';

let db: Db;
let close: () => Promise<void>;
let ownerId: string;

beforeAll(async () => {
  const created = await createPgliteDb();
  db = created.db;
  close = created.close;
  ownerId = (await seed(db)).ownerId;
});
afterAll(async () => {
  await close();
});

describe('the designer’s company is the company in the database', () => {
  it('holds every employee the demo draws, field by field', async () => {
    const rows = await db.select().from(schema.agents);
    const expected = demo.agents();
    expect(rows).toHaveLength(expected.length);
    for (const person of expected) {
      const row = rows.find((candidate) => candidate.name === person.name);
      expect(row, `employee ${person.name} is missing`).toBeTruthy();
      expect(row!.nameAr, `${person.name} Arabic name`).toBe(person.nameAr);
      expect(row!.role, `${person.name} role`).toBe(person.role);
      expect(row!.roleAr, `${person.name} Arabic role`).toBe(person.roleAr);
      expect(row!.department, `${person.name} department`).toBe(person.department);
      expect(row!.status, `${person.name} status`).toBe(person.status);
      expect(row!.avatar, `${person.name} portrait`).toBe(person.avatar);
      expect(row!.focus, `${person.name} focus line`).toBe(person.focus);
      expect(row!.focusAr, `${person.name} Arabic focus line`).toBe(person.focusAr);
      expect(row!.budgetMonthlyCents, `${person.name} budget`).toBe(person.budgetCents);
      expect([...(row!.capabilities ?? [])].sort(), `${person.name} skills`).toEqual([...person.skills].sort());
    }
  });

  it('shows the demo’s spend, out of the ledger', async () => {
    const rows = await db.select().from(schema.agents);
    for (const person of demo.agents()) {
      const row = rows.find((candidate) => candidate.name === person.name)!;
      const state = await budgetState(db, row.id);
      expect(state.spentCents, `${person.name} ledger spend`).toBe(person.spentCents);
      expect(row.spentMonthlyCents, `${person.name} cached counter`).toBe(person.spentCents);
    }
  });

  it('reports to the same manager the demo names', async () => {
    const rows = await db.select().from(schema.agents);
    const byName = new Map(rows.map((row) => [row.name, row]));
    const byKey = new Map(demo.agents().map((person) => [person.key, byName.get(person.name)!]));
    for (const person of demo.agents()) {
      if (person.manager === 'you') {
        expect(byKey.get(person.key)!.reportsTo, `${person.name} reports to the human`).toBeNull();
      } else {
        expect(byKey.get(person.key)!.reportsTo, `${person.name} reports to ${person.manager}`)
          .toBe(byKey.get(person.manager)!.id);
      }
    }
  });

  it('holds the demo’s ten tasks, including their ids and Arabic titles', async () => {
    const rows = await db.select().from(schema.tasks);
    const expected = demo.tasks();
    expect(rows.map((row) => row.shortRef).sort()).toEqual(expected.map((task) => task.ref).sort());
    const agents = await db.select().from(schema.agents);
    for (const card of expected) {
      const row = rows.find((candidate) => candidate.shortRef === card.ref)!;
      expect(row.title, `${card.ref} title`).toBe(card.title);
      expect(row.titleAr, `${card.ref} Arabic title`).toBe(card.titleAr);
      expect(row.stage, `${card.ref} stage`).toBe(card.stage);
      expect(row.priority, `${card.ref} priority`).toBe(card.priority);
      expect(row.progress, `${card.ref} progress`).toBe(card.progress);
      expect(row.dueDate?.slice(0, 10), `${card.ref} due date`).toBe(card.due);
      expect(row.description ?? null, `${card.ref} description`).toBe(card.description);
      expect(row.descriptionAr ?? null, `${card.ref} Arabic description`).toBe(card.descriptionAr);
      if (card.owner !== 'you') {
        const owner = agents.find((agent) => agent.name.toLowerCase() === card.owner)!;
        expect(row.ownerAgentId, `${card.ref} owner`).toBe(owner.id);
      }
    }
  });

  it('holds the demo’s three decisions with their risk, cost and ask', async () => {
    const rows = await db.select().from(schema.decisions);
    const expected = demo.decisions();
    expect(rows.map((row) => row.shortRef).sort()).toEqual(expected.map((d) => d.ref).sort());
    const agents = await db.select().from(schema.agents);
    for (const decision of expected) {
      const row = rows.find((candidate) => candidate.shortRef === decision.ref)!;
      expect(row.title, `${decision.ref} title`).toBe(decision.title);
      expect(row.titleAr, `${decision.ref} Arabic title`).toBe(decision.titleAr);
      expect(row.risk, `${decision.ref} risk`).toBe(decision.risk);
      expect(row.costCents, `${decision.ref} cost`).toBe(decision.costCents);
      expect(String((row.diff as { summary?: string }).summary), `${decision.ref} ask`).toBe(decision.ask);
      expect(String((row.diff as { summaryAr?: string }).summaryAr), `${decision.ref} Arabic ask`).toBe(decision.askAr);
      const raiser = agents.find((agent) => agent.name.toLowerCase() === decision.from)!;
      expect(row.agentId, `${decision.ref} raised by`).toBe(raiser.id);
    }
  });

  it('names the human the demo names', async () => {
    const members = await db.select().from(schema.members);
    expect(members.find((member) => member.id === ownerId)?.name).toBe(demo.operator());
  });
});
