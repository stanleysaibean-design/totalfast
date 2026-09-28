import type { DietCalendar } from './types.ts';

const DAY = 86_400_000;

/** Western (Gregorian) Easter Sunday, UTC midnight. Anonymous Gregorian algorithm. */
export function westernEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/** Calendar date only (the user's local date), as UTC midnight. */
function dayOf(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Named days for Western Lent: "lent" for every day from Ash Wednesday to
 * Holy Saturday, plus "ash-wednesday", "lent-friday" and "good-friday".
 * Ash Wednesday and the Fridays of Lent are the days of abstinence from meat.
 */
export const westernLent: DietCalendar = (date) => {
  const today = dayOf(date);
  const easter = westernEaster(date.getFullYear()).getTime();
  const ashWednesday = easter - 46 * DAY;
  const holySaturday = easter - 1 * DAY;
  if (today < ashWednesday || today > holySaturday) return [];
  const days = ['lent'];
  if (today === ashWednesday) days.push('ash-wednesday');
  if (new Date(today).getUTCDay() === 5) days.push('lent-friday');
  if (today === easter - 2 * DAY) days.push('good-friday');
  return days;
};

export const CALENDARS: Record<string, DietCalendar> = {
  'western-lent': westernLent,
};
