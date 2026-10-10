/**
 * Phase M (REQ-57): the per-employee transcript. Every model call the studio makes for a
 * person — the exact system prompt, the exact inputs (user words or the whole tool round),
 * the tool calls the model made, and its exact output — lands in an IndexedDB store on the
 * owner's device (Dexie, Apache-2.0). Bigger than localStorage, private by design, and the
 * demo showroom never writes to it: history is the owner's, not a visitor's.
 */
import Dexie, { type EntityTable } from 'dexie';

/** The store flips this off while the demo showroom runs — history is the owner's diary. */
let demoMode = false;
export const setHistoryDemoMode = (value: boolean): void => { demoMode = value; };

export interface HistoryRow {
  id?: number;
  agentId: string;
  at: string;
  /** 'chat' — a conversation turn; 'cycle' — a work cycle through the tool loop. */
  purpose: 'chat' | 'cycle';
  provider: string;
  model: string;
  /** The exact system prompt the call carried. */
  system: string;
  /** The exact inputs: the owner's words, or the cycle's rounds, as sent. */
  input: string;
  /** The tool calls the model made, as JSON — [] when it only spoke. */
  toolCalls: string;
  /** The model's exact output text. */
  output: string;
}

type HistoryDb = Dexie & { calls: EntityTable<HistoryRow, 'id'> };

let db: HistoryDb | null = null;

export function historyDb(): HistoryDb {
  if (!db) {
    db = new Dexie('company.ai-history') as HistoryDb;
    db.version(1).stores({ calls: '++id, agentId, at' });
  }
  return db;
}

/** Record one call. The demo showroom records nothing; a blocked box records nothing. */
export async function recordCall(row: Omit<HistoryRow, 'id'>): Promise<void> {
  if (demoMode) return;
  try {
    await historyDb().calls.add(row as HistoryRow);
  } catch {
    /* history is a diary, not a load-bearing wall */
  }
}

/** One employee's transcript, newest first. */
export async function callsFor(agentId: string): Promise<HistoryRow[]> {
  try {
    const rows = await historyDb().calls.where('agentId').equals(agentId).toArray();
    return rows.sort((a, b) => (a.id ?? 0) - (b.id ?? 0)).reverse();
  } catch {
    return [];
  }
}
