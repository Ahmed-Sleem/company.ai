/**
 * The formatting conventions, pinned to the demo's own.
 *
 * These are small functions with large consequences: every date, every amount of money and every
 * percentage in the product passes through here, and the demo decides what they look like. The
 * expected strings below are the demo's — `{day:'numeric', month:'short', timeZone:'UTC'}` — so a
 * change in either direction is visible as a failure rather than as a slowly drifting screen.
 */
import { describe, expect, it } from 'vitest';
import { date, dateTime, money, num, percent } from '../src/lib/format';

describe('dates, the demo’s way', () => {
  it('reads as a day and a short month, with no year', () => {
    expect(date('2026-10-05T00:00:00.000Z', 'en')).toBe('5 Oct');
    expect(date('2026-10-02T00:00:00.000Z', 'en')).toBe('2 Oct');
  });

  it('keeps Arabic numerals and Arabic month names for Arabic', () => {
    expect(date('2026-10-05T00:00:00.000Z', 'ar')).toBe('٥ أكتوبر');
  });

  it('does not drift by a day when the timestamp carries a time zone', () => {
    // The demo formats at noon UTC for exactly this reason; a date stored late in the day must
    // still read as the day it was written, not the day before.
    expect(date('2026-10-05T23:30:00.000Z', 'en')).toBe('5 Oct');
    expect(date('2026-10-05T00:30:00.000Z', 'en')).toBe('5 Oct');
  });

  it('shows a dash rather than “Invalid Date” when there is nothing to show', () => {
    expect(date(null, 'en')).toBe('—');
    expect(date('not a date', 'en')).toBe('—');
  });

  it('keeps the full timestamp for audit lines', () => {
    expect(dateTime('2026-10-05T13:45:00.000Z', 'en')).toContain('2026');
    expect(dateTime('2026-10-05T13:45:00.000Z', 'en')).toContain('13:45');
  });
});

describe('numbers and money', () => {
  it('formats cents as dollars, never floats', () => {
    expect(money(1250, 'en')).toBe('$12.50');
    expect(money(0, 'en')).toBe('$0.00');
  });

  it('writes percentages the demo’s way — the number, then the sign', () => {
    expect(percent(65, 'en')).toBe('65%');
    expect(num(1250, 'en')).toBe('1,250');
  });
});
