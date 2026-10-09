/**
 * The one-file save, both directions (REQ-11) — defined once and used by the workspace menu
 * and the Settings screen alike, so the two can never drift apart.
 */
import { useStore } from '../data/store';

export const SAVE_PRODUCT = 'company.ai';
export const SAVE_VERSION = 1;
export const SAVE_FILENAME = 'company.ai-save.json';

export function savePayload() {
  const { company, operator, agents, tasks, decisions, threads, models } = useStore.getState();
  return {
    product: SAVE_PRODUCT,
    version: SAVE_VERSION,
    exportedAt: new Date().toISOString(),
    company, operator, agents, tasks, decisions, threads, models,
  };
}

export function downloadSave() {
  const blob = new Blob([JSON.stringify(savePayload(), null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = SAVE_FILENAME;
  link.click();
  URL.revokeObjectURL(link.href);
}

/** Throws unless the file really is a company.ai save — the caller turns that into a message. */
export function parseSave(text: string): Record<string, unknown> {
  const data = JSON.parse(text) as Record<string, unknown>;
  if (!data || typeof data !== 'object' || !('company' in data) || !Array.isArray((data as { agents?: unknown }).agents)) {
    throw new Error('not a company.ai save');
  }
  return data;
}

export function resetSave() {
  useStore.getState().reset();
}
