/**
 * "The demo money is real" — its own file, so it gets its own process and its own database.
 *
 * Why this test exists: the product's meters showed $0.00 of $40.00 while the seed claimed
 * $12.50 spent. The seed had written the cached counter and never moved money through the
 * ledger, and the budget check reads the ledger. The demo numbers must come out of the
 * product's own write path, not out of a literal in a fixture.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPgliteDb, schema, seed, budgetState, monthSpendCents, type Db } from '../src/index.js';

let db: Db;
let close: () => Promise<void>;
let agentIds: string[];

beforeAll(async () => {
  const created = await createPgliteDb();
  db = created.db;
  close = created.close;
  agentIds = (await seed(db)).agentIds;
});
afterAll(async () => {
  await close();
});

describe('the demo money is real', () => {
  it('records the demo spend in the ledger, not only in the cached counter', async () => {
    // The demo's meters show $12.50, $8.20 and $18.90.
    const expected = [1250, 820, 1890];
    const rows = await db.select().from(schema.agents);
    for (const [index, id] of agentIds.entries()) {
      const state = await budgetState(db, id);
      expect(state.spentCents, `agent ${index} spend from the ledger`).toBe(expected[index]);
      expect(rows.find((row) => row.id === id)?.spentMonthlyCents, `agent ${index} cached counter`)
        .toBe(expected[index]);
    }
    expect(await monthSpendCents(db, agentIds[0]!)).toBe(1250);
  });

  it('leaves the ledger the only source of the number the meter shows', async () => {
    const entries = await db.select().from(schema.ledger);
    const perAgent = new Map<string, number>();
    for (const entry of entries) {
      perAgent.set(entry.agentId, (perAgent.get(entry.agentId) ?? 0) + entry.amountCents);
    }
    for (const [index, id] of agentIds.entries()) {
      const state = await budgetState(db, id);
      expect(state.spentCents, `agent ${index} ledger total`).toBe(perAgent.get(id) ?? 0);
      expect(state.remainingCents).toBe(state.limitCents - state.spentCents);
    }
  });

  it('keeps the failed run that explains an agent in the error state', async () => {
    const runs = await db.select().from(schema.runs);
    const failed = runs.filter((run) => run.status === 'failed');
    expect(failed).toHaveLength(1);
    expect(failed[0]?.error).toBe('Waiting for analytics access');
  });
});
