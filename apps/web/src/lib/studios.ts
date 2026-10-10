/**
 * Studios on this device (R8, owner eighth round): "when I open the landing page I should see
 * all the created companies I have on this device, and the option to create a new one."
 *
 * The save (`company.ai.save.v1`) stays exactly what it is — the ACTIVE studio. This module
 * keeps a small index beside it plus one archived copy per studio:
 *
 *   company.ai.studios.v1          { active: id, list: [{ id, name, at }] }
 *   company.ai.studio.<id>         a full copy of the save as it was when we left that studio
 *
 * Switching = archive the active save under its id, put the chosen studio's copy in the save
 * key, reload. Creating new = archive, clear the save key, reload — the app boots fresh and
 * the wizard (which lives behind introDone) is there again. No clock, no dice: ids are
 * numbered from the index, the way the save numbers everything else.
 */

const INDEX_KEY = 'company.ai.studios.v1';
const PENDING_NEW_KEY = 'company.ai.studio.pending-new';
const SAVE_KEY = 'company.ai.save.v1';
const studioKey = (id: string) => `company.ai.studio.${id}`;

export interface StudioMeta {
  id: string;
  name: string;
  /** ISO stamp of the last time this studio was left or recorded. */
  at: string;
}

interface Index {
  active: string;
  list: StudioMeta[];
}

function readIndex(): Index {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Index;
      if (parsed && Array.isArray(parsed.list)) return parsed;
    }
  } catch {
    /* a broken index means: start one */
  }
  return { active: 'studio-1', list: [] };
}

function writeIndex(index: Index): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

/** The id of the studio the save currently belongs to. */
export function activeStudioId(): string {
  return readIndex().active;
}

/** Every studio recorded on this device, most recently touched first. */
export function listStudios(): StudioMeta[] {
  return readIndex().list.slice().sort((a, b) => (a.at < b.at ? 1 : -1));
}

/**
 * Record the studio the app is currently running: keep its name fresh in the index and make
 * sure the active id points at it. Called on boot and whenever the company is renamed.
 */
export function rememberStudio(name: string): void {
  const index = readIndex();
  const at = new Date().toISOString();
  const existing = index.list.find((s) => s.id === index.active);
  if (existing) {
    existing.name = name;
    existing.at = at;
  } else {
    index.list.push({ id: index.active, name, at });
  }
  writeIndex(index);
}

/** Copy the live save into the active studio's archive slot. */
function archiveActive(): void {
  const index = readIndex();
  const save = localStorage.getItem(SAVE_KEY);
  if (save) localStorage.setItem(studioKey(index.active), save);
}

/** Open another studio: archive this one, swap the save, reboot. */
export function openStudio(id: string): void {
  const index = readIndex();
  if (id === index.active) return;
  archiveActive();
  const copy = localStorage.getItem(studioKey(id));
  if (copy) localStorage.setItem(SAVE_KEY, copy);
  else localStorage.removeItem(SAVE_KEY);
  index.active = id;
  writeIndex(index);
  location.reload();
}

function nextId(index: Index): string {
  let max = 0;
  for (const s of index.list) {
    const m = /^studio-(\d+)$/.exec(s.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  max = Math.max(max, Number(/^studio-(\d+)$/.exec(index.active)?.[1] ?? 1));
  return `studio-${max + 1}`;
}

/**
 * Start a brand-new company: archive the current one, clear the save, and take a fresh
 * numbered id. The reload boots an empty save — introDone is false, so the wizard is there.
 */
export function newStudio(): void {
  const index = readIndex();
  archiveActive();
  index.active = nextId(index);
  writeIndex(index);
  localStorage.removeItem(SAVE_KEY);
  // After the reboot the landing must open the wizard straight away — "New company" means
  // new company, not the picker again.
  localStorage.setItem(PENDING_NEW_KEY, '1');
  location.reload();
}

/** Read-and-clear the pending-new flag: true once, on the boot right after "New company". */
export function consumePendingNew(): boolean {
  if (localStorage.getItem(PENDING_NEW_KEY) !== '1') return false;
  localStorage.removeItem(PENDING_NEW_KEY);
  return true;
}

/**
 * Delete a created company (round fifteen, owner): its archive slot and its index entry go.
 * Deleting the ACTIVE one also drops the live save — the device forgets it completely — and
 * hands the next numbered id to whatever comes next. The demo is not in the index at all, so
 * there is simply no way to delete it. Returns whether the page must reboot.
 */
export function deleteStudio(id: string): { reload: boolean } {
  const index = readIndex();
  index.list = index.list.filter((s) => s.id !== id);
  try { localStorage.removeItem(studioKey(id)); } catch { /* a blocked box forgets on its own */ }
  if (id === index.active) {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* nothing to drop */ }
    index.active = nextId(index);
    writeIndex(index);
    return { reload: true };
  }
  writeIndex(index);
  return { reload: false };
}

/**
 * Load a company from a save file (round fifteen, owner): the file must pass the same
 * `parseSave` gate Settings uses. The current studio is archived first, then the imported
 * company takes a fresh numbered id and becomes the live save. `apply` is the store's own
 * loader, handed in so this module never imports the store itself.
 */
export function importStudio(
  text: string,
  apply: (data: Record<string, unknown>) => void,
): { ok: true; name: string } | { ok: false } {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { ok: false };
  }
  if (!data || typeof data !== 'object' || !('company' in data)
    || !Array.isArray((data as { agents?: unknown }).agents)) {
    return { ok: false };
  }
  const index = readIndex();
  archiveActive();
  const freshId = nextId(index);
  index.active = freshId;
  writeIndex(index);
  // The store's own loader swaps the state in; its persist middleware then writes the proper
  // envelope into the save key, and THAT is what the archive slot must hold (openStudio copies
  // slots back verbatim on a later switch).
  apply(data);
  let envelope: string | null = null;
  try { envelope = localStorage.getItem(SAVE_KEY); } catch { /* a blocked box keeps it in memory */ }
  if (!envelope) return { ok: false };
  try {
    localStorage.setItem(studioKey(freshId), envelope);
  } catch {
    return { ok: false };
  }
  const company = (data as { company?: { name?: unknown } }).company;
  const name = typeof company?.name === 'string' && company.name.trim() !== '' ? company.name : 'Imported company';
  return { ok: true, name };
}
