/**
 * Formatting — one implementation per convention (rules §6.1).
 *
 * Money is integer cents everywhere in the product; only this file turns cents into text.
 * Dates come from the database as ISO strings; only this file turns them into what a person
 * reads, using the document's language so Arabic gets Arabic numerals and its own layout.
 */
import type { Lang } from './i18n';

/**
 * The demo's own locales — and it uses two of them on purpose: dates in `en-GB` (day before month,
 * "5 Oct") and money and plain numbers in `en-US` ("$12.50"). Arabic uses `ar-EG` for both, which is
 * what puts Arabic-Indic numerals and Arabic month names on an Arabic screen.
 */
const DATE_LOCALE: Record<Lang, string> = { en: 'en-GB', ar: 'ar-EG' };
const NUMBER_LOCALE: Record<Lang, string> = { en: 'en-US', ar: 'ar-EG' };

/** `1250` → `$12.50`. Cents are the unit of record; never a float. */
export function money(cents: number, lang: Lang = 'en'): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[lang], {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * A date a person reads — the demo's shape: the day and a short month, no year ("5 Oct", "٥ أكتوبر").
 * Formatted in UTC so a task due at 23:30 does not read as the following day for a reader east of
 * Greenwich, which is how the demo avoids the same drift.
 */
export function date(value: string | null | undefined, lang: Lang = 'en'): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat(DATE_LOCALE[lang], { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(parsed);
}

/** A date and a time, for audit lines. */
export function dateTime(value: string | null | undefined, lang: Lang = 'en'): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat(DATE_LOCALE[lang], {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'UTC',
  }).format(parsed);
}

/** Counts. */
export function num(value: number, lang: Lang = 'en'): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[lang]).format(value);
}

/**
 * Pick the language's version of a field. The demo carries both languages on every record, so
 * the interface never falls back to English inside an Arabic screen — except when the Arabic
 * text genuinely does not exist, and then the English is better than an empty row.
 */
export function localized(english: string | null | undefined, arabic: string | null | undefined, lang: Lang): string {
  if (lang === 'ar') return arabic ?? english ?? '';
  return english ?? arabic ?? '';
}

/** `65` → `65%`. */
export function percent(value: number, lang: Lang = 'en'): string {
  return `${num(value, lang)}%`;
}
