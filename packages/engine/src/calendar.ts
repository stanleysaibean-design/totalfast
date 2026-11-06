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

// ---------------------------------------------------------------------------
// Orthodox church calendar
// ---------------------------------------------------------------------------

/**
 * Which calendar a parish keeps for its fixed feasts. Pascha is the same for
 * both; fixed dates (Christmas, the Nativity and Dormition fasts) differ by
 * 13 days.
 * - `revised-julian`: the "New Calendar" (for example Greek, Antiochian, Romanian, Bulgarian, OCA parishes).
 * - `julian`: the "Old Calendar" (for example Russian, Serbian, Georgian, Jerusalem, Mount Athos).
 */
export type ChurchCalendarStyle = 'revised-julian' | 'julian';

/**
 * How strict a fast day is, from lightest to strictest. Each level allows
 * everything the stricter ones do.
 * - `none`: no fast.
 * - `dairy`: no meat (Cheesefare week).
 * - `fish`: fish, wine and oil allowed; no meat, dairy or eggs.
 * - `wine-oil`: wine and oil allowed; no meat, dairy, eggs or fish.
 * - `strict`: no meat, dairy, eggs, fish, wine or oil.
 */
export type FastLevel = 'none' | 'dairy' | 'fish' | 'wine-oil' | 'strict';

/** Named-day label each level adds, for rule sets to match with `when.days`. */
export const FAST_LEVEL_LABEL: Record<Exclude<FastLevel, 'none'>, string> = {
  dairy: 'dairy-allowed',
  fish: 'fish-allowed',
  'wine-oil': 'wine-and-oil',
  strict: 'strict-fast',
};

export interface OrthodoxDay {
  level: FastLevel;
  /** Fasting season this day falls in, if any (a key of SEASON_NAMES). */
  season?: string;
  /** Feast or special day that changes the usual rule, as a display name. */
  feast?: string;
  /** True inside a fast-free week (Bright Week, Christmastide, and so on). */
  fastFree?: boolean;
  /** Every named day, as a calendar returns them to the engine. */
  labels: string[];
}

/** Display names for the seasons calendars return, for lists and reminders. */
export const SEASON_NAMES: Record<string, string> = {
  lent: 'Lent',
  'great-lent': 'Great Lent',
  'apostles-fast': "the Apostles' Fast",
  'dormition-fast': 'the Dormition Fast',
  'nativity-fast': 'the Nativity Fast',
};

/** Days the Julian calendar runs behind the Gregorian one in a given year (13 for 1900–2099). */
function julianOffset(year: number): number {
  return Math.floor(year / 100) - Math.floor(year / 400) - 2;
}

/** Orthodox Pascha as a Julian-calendar month and day, held in a UTC Date (Meeus's Julian algorithm). */
function julianPascha(year: number): number {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  return Date.UTC(year, month - 1, day);
}

/** Orthodox Pascha (Easter) as a Gregorian date, UTC midnight. The same for Old and New Calendar parishes. */
export function orthodoxPascha(year: number): Date {
  return new Date(julianPascha(year) + julianOffset(year) * DAY);
}

/** Wednesdays and Fridays outside a fasting season on which a major feast allows fish. Month and day, church calendar. */
const FISH_FEASTS: Record<string, string> = {
  '2-2': 'the Meeting of the Lord',
  '3-25': 'the Annunciation',
  '6-24': 'the Nativity of St John the Baptist',
  '6-29': 'Sts Peter and Paul',
  '8-6': 'the Transfiguration',
  '8-15': 'the Dormition',
  '9-8': 'the Nativity of the Theotokos',
  '11-21': 'the Entry of the Theotokos',
};

/** One-day fasts kept even outside a fasting season. */
const ONE_DAY_FASTS: Record<string, string> = {
  '1-5': 'the Eve of Theophany',
  '8-29': 'the Beheading of St John the Baptist',
  '9-14': 'the Exaltation of the Cross',
};

/**
 * The Orthodox fasting rule for a day, following the common typikon
 * guidance used by English-language parish calendars. Parishes and
 * jurisdictions differ in the details; this is a draft for review by a
 * priest before launch.
 */
export function orthodoxDay(date: Date, style: ChurchCalendarStyle): OrthodoxDay {
  const today = dayOf(date);
  const weekday = new Date(today).getUTCDay();
  const offset = julianOffset(date.getFullYear());
  // Work in "church dates": the date as the parish's own calendar names it.
  // For Old Calendar parishes that is the Julian date, 13 days behind.
  const c = style === 'julian' ? today - offset * DAY : today;
  const cd = new Date(c);
  const year = cd.getUTCFullYear();
  const m = cd.getUTCMonth() + 1;
  const d = cd.getUTCDate();
  const fixed = (month: number, day: number) => Date.UTC(year, month - 1, day);
  const pascha = style === 'julian' ? julianPascha(year) : julianPascha(year) + julianOffset(year) * DAY;
  const rel = Math.round((c - pascha) / DAY);
  const key = `${m}-${d}`;
  const wedFri = weekday === 3 || weekday === 5;
  const weekend = weekday === 0 || weekday === 6;
  const weekdayLevel: FastLevel = weekend ? 'wine-oil' : 'strict';

  const result = (level: FastLevel, extra: Omit<OrthodoxDay, 'level' | 'labels'> = {}, more: string[] = []): OrthodoxDay => {
    const labels = [...(level === 'none' ? [] : [FAST_LEVEL_LABEL[level]]), ...more];
    if (extra.season) labels.push(extra.season);
    if (extra.fastFree) labels.push('fast-free');
    return { level, ...extra, labels };
  };

  // Fast-free days and weeks.
  if (rel === 0) return result('none', { feast: 'Pascha', fastFree: true }, ['pascha']);
  if (rel >= 1 && rel <= 6) return result('none', { feast: 'Bright Week', fastFree: true }, ['bright-week']);
  if (rel >= 50 && rel <= 55) return result('none', { feast: 'the week after Pentecost', fastFree: true });
  if (rel >= -69 && rel <= -64) return result('none', { feast: 'the week of the Publican and the Pharisee', fastFree: true });
  if ((m === 12 && d >= 25) || (m === 1 && d <= 4) || key === '1-6') {
    return result('none', { feast: key === '1-6' ? 'Theophany' : 'the Twelve Days of Christmas', fastFree: true });
  }

  // Cheesefare week: no meat, but dairy and eggs every day, Wednesday and Friday included.
  if (rel >= -55 && rel <= -49) return result('dairy', { feast: 'Cheesefare week' }, ['cheesefare-week']);

  // Great Lent and Holy Week, Clean Monday to Holy Saturday.
  if (rel >= -48 && rel <= -1) {
    const season = 'great-lent';
    if (rel === -48) return result('strict', { season, feast: 'Clean Monday' }, ['clean-monday']);
    if (rel === -2) return result('strict', { season, feast: 'Holy Friday' }, ['holy-week', 'good-friday']);
    if (rel === -1) return result('strict', { season, feast: 'Holy Saturday' }, ['holy-week', 'wine-allowed']);
    if (rel === -3) return result('wine-oil', { season, feast: 'Holy Thursday' }, ['holy-week']);
    if (key === '3-25') return result('fish', { season, feast: 'the Annunciation' });
    if (rel >= -6) return result('strict', { season, feast: 'Holy Week' }, ['holy-week']);
    if (rel === -7) return result('fish', { season, feast: 'Palm Sunday' });
    if (rel === -8) return result('wine-oil', { season, feast: 'Lazarus Saturday' }, ['lazarus-saturday']);
    return result(weekdayLevel, { season });
  }

  // Apostles' Fast: Monday after All Saints to June 28. In years with a late
  // Pascha it is very short, or (Old Calendar) can vanish entirely.
  if (c >= pascha + 57 * DAY && c <= fixed(6, 28)) {
    const season = 'apostles-fast';
    if (key === '6-24') return result('fish', { season, feast: FISH_FEASTS[key] });
    return result(wedFri ? 'strict' : 'fish', { season });
  }

  // Dormition Fast: August 1 to 14.
  if (m === 8 && d <= 14) {
    const season = 'dormition-fast';
    if (key === '8-6') return result('fish', { season, feast: FISH_FEASTS[key] });
    return result(weekdayLevel, { season });
  }

  // Nativity Fast: November 15 to December 24. Fish is allowed except on
  // Wednesdays and Fridays until December 19; the last days are stricter.
  if ((m === 11 && d >= 15) || (m === 12 && d <= 24)) {
    const season = 'nativity-fast';
    if (key === '11-21') return result('fish', { season, feast: FISH_FEASTS[key] });
    if (key === '12-24') return result(weekdayLevel, { season, feast: 'Christmas Eve' });
    if (m === 12 && d >= 20) return result(weekdayLevel, { season });
    return result(wedFri ? 'strict' : 'fish', { season });
  }

  if (ONE_DAY_FASTS[key]) return result(weekdayLevel, { feast: ONE_DAY_FASTS[key] });

  // Wednesdays and Fridays through the year.
  if (wedFri) {
    if (FISH_FEASTS[key]) return result('fish', { feast: FISH_FEASTS[key] });
    if (rel === 24) return result('fish', { feast: 'Mid-Pentecost' });
    if (rel === 38) return result('fish', { feast: 'the Leave-taking of Pascha' });
    // Between Thomas Sunday and Pentecost the Wednesday and Friday fast is lighter.
    if (rel > 6 && rel < 49) return result('wine-oil', { feast: 'the Paschal season' });
    return result('strict', { feast: weekday === 3 ? 'Wednesday' : 'Friday' });
  }

  return result('none');
}

export const CALENDARS: Record<string, DietCalendar> = {
  'western-lent': westernLent,
  'orthodox-revised-julian': (date) => orthodoxDay(date, 'revised-julian').labels,
  'orthodox-julian': (date) => orthodoxDay(date, 'julian').labels,
};

export interface FastingSeason {
  /** Key of SEASON_NAMES, e.g. "great-lent". */
  id: string;
  name: string;
  /** First and last day, as local dates at noon. */
  start: Date;
  end: Date;
}

/**
 * Fasting seasons (Lent, Great Lent, the Nativity Fast...) that a calendar
 * marks, from the one in progress on `from` through the next `days` days.
 */
export function fastingSeasons(calendarId: string, from: Date, days = 400): FastingSeason[] {
  const calendar = CALENDARS[calendarId];
  if (!calendar) throw new Error(`Unknown calendar "${calendarId}"`);
  const out: FastingSeason[] = [];
  const open = new Map<string, FastingSeason>();
  const fromDay = dayOf(from);
  // Start far enough back to find the real first day of a season in progress.
  for (let i = -60; i <= days; i++) {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i, 12);
    const seasons = new Set(calendar(date).filter((l) => SEASON_NAMES[l]));
    for (const [id, s] of open) {
      if (!seasons.has(id)) {
        open.delete(id);
        if (dayOf(s.end) >= fromDay) out.push(s);
      }
    }
    for (const id of seasons) {
      const s = open.get(id);
      if (s) s.end = date;
      else open.set(id, { id, name: SEASON_NAMES[id], start: date, end: date });
    }
  }
  // Seasons still running at the end of the window are cut off; leave them out.
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}
