/**
 * The studio's day (Phase F): work hours the owner sets, read by the clock, the live bubbles
 * and the engine. Stored like every other preference — in the visitor's own browser.
 */
import { safeGet, safeSet } from './prefs';

export interface WorkHours {
  /** Hour the workday starts (0-23). */
  start: number;
  /** Hour it ends (exclusive). */
  end: number;
}

const START_KEY = 'company-os.work-start';
const END_KEY = 'company-os.work-end';

const hour = (raw: string | null, fallback: number) => {
  const n = raw === null ? NaN : Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : fallback;
};

export function readWorkHours(): WorkHours {
  return { start: hour(safeGet(START_KEY), 9), end: hour(safeGet(END_KEY), 17) };
}

export function saveWorkHours(hours: WorkHours) {
  safeSet(START_KEY, String(hours.start));
  safeSet(END_KEY, String(hours.end));
}

/** Are we inside the workday right now? */
export function isWorkTime(now = new Date(), hours = readWorkHours()): boolean {
  const t = now.getHours();
  return hours.start < hours.end ? t >= hours.start && t < hours.end : t >= hours.start || t < hours.end;
}
