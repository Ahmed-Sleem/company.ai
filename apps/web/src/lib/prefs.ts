/**
 * The preferences the owner asked for, all three living in Settings → Appearance.
 *
 * Each one is applied to the document as a single attribute and read back once on boot, so no
 * screen has to know a preference exists. Two of them default to **on**, per the owner's
 * instruction: the screen effect and the collapsed rail.
 *
 * Nothing here invents a value: a preference that is missing or unreadable falls back to its
 * default, and storage being unavailable (private mode) is not an error — it only means the
 * choice does not survive a reload.
 */
export type AttrPref = { key: string; attribute: string; storageKey: string };

/**
 * Storage, guarded once.
 *
 * `localStorage` is not merely absent in some contexts — a sandboxed frame (the demo file, for
 * instance) throws on *access*. Every preference in the product goes through these two, so a
 * preference can always be read and written without a try/catch at each call site.
 */
export function safeGet(key: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** The screen effect: the pixel overlay the demos draw over the whole product. Default on. */
export const FX: AttrPref = { key: 'fx', attribute: 'data-fx', storageKey: 'company-os.fx' };

/** The collapsed rail: the sidebar starts as a narrow rail. Default on. */
export const RAIL: AttrPref = { key: 'rail', attribute: 'data-collapsed', storageKey: 'company-os.rail' };

function read(pref: AttrPref, fallback: boolean): boolean {
  const stored = safeGet(pref.storageKey);
  if (stored === 'on') return true;
  if (stored === 'off') return false;
  return fallback;
}

function write(pref: AttrPref, on: boolean) {
  safeSet(pref.storageKey, on ? 'on' : 'off'); // private mode / sandboxed frame: it just does not persist
}

/** Apply a preference to the root element. `true` sets the attribute, `false` removes it. */
export function applyAttr(pref: AttrPref, on: boolean) {
  const root = document.documentElement;
  if (on) root.setAttribute(pref.attribute, 'true');
  else root.removeAttribute(pref.attribute);
  return on;
}

export function saveAttr(pref: AttrPref, on: boolean) {
  applyAttr(pref, on);
  write(pref, on);
  // The shell and the Settings panel are separate components; a preference changed in one has to
  // reach the other without either owning the other. One event, no state library.
  try {
    dispatchEvent(new CustomEvent(PREF_EVENT, { detail: { attribute: pref.attribute, on } }));
  } catch {
    /* no window (a test's own environment) — applyAttr already did the visible part */
  }
  return on;
}

export const PREF_EVENT = 'company-os:pref';

/** Subscribe to preference changes. Returns the unsubscribe function. */
export function onPrefsChange(listener: () => void) {
  addEventListener(PREF_EVENT, listener);
  return () => removeEventListener(PREF_EVENT, listener);
}

export const readFx = () => read(FX, true);
export const readRail = () => read(RAIL, true);
export const setFx = (on: boolean) => saveAttr(FX, on);
export const setRail = (on: boolean) => saveAttr(RAIL, on);

/* The language lives here too, so the Settings screen can change it and the shell can listen. */
export const LANG_KEY = 'company-os.lang';
export const LANG_EVENT = 'company-os:lang';
export const setLangPref = (lang: 'en' | 'ar') => {
  safeSet(LANG_KEY, lang);
  window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: lang }));
};
