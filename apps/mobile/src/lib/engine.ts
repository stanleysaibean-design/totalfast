import {
  ComplianceEngine,
  INGREDIENTS,
  RULE_SETS,
  SEASON_NAMES,
  orthodoxDay,
  westernLent,
  type CalendarChoice,
  type ChurchCalendarStyle,
  type Checkable,
  type CheckResult,
  type FastLevel,
  type RuleSet,
} from '@total-fast/engine';

/**
 * One engine for the whole app. The ingredient database and rule sets ship
 * inside the app bundle, so every check works offline.
 */
const engine = new ComplianceEngine(INGREDIENTS);

/**
 * Pass the day from useDiet().today so verdicts follow the calendar, and the
 * diet's chosen calendar from useDiet().calendar.
 */
export function checkItem(item: Checkable, ruleSet: RuleSet, date: Date, calendar?: string): CheckResult {
  return engine.check(item, ruleSet, { date, calendar });
}

export interface DietInfo {
  ruleSet: RuleSet;
  /** One line for the diet picker. */
  tagline: string;
}

/**
 * Diets in the order the picker shows them: the launch diets first. Lent is
 * not a diet here; it lives on the Calendar tab as dates and reminders.
 */
export const DIETS: DietInfo[] = [
  { ruleSet: RULE_SETS['daniel-fast'], tagline: 'Plant foods and water. No sweeteners, leavening, or animal products.' },
  {
    ruleSet: RULE_SETS['orthodox'],
    tagline: 'Wednesdays, Fridays and the four fasting seasons, following your church calendar.',
  },
  { ruleSet: RULE_SETS['whole30'], tagline: 'No added sugar, alcohol, grains, legumes, or dairy for 30 days.' },
];

export const DEFAULT_DIET_ID = DIETS[0].ruleSet.id;

export function findDiet(id: string | null | undefined): DietInfo | undefined {
  return DIETS.find((d) => d.ruleSet.id === id);
}

/** The calendars a diet lets the user choose between, or none. */
export function calendarChoices(ruleSet: RuleSet): CalendarChoice[] {
  return ruleSet.calendarChoices ?? [];
}

/** The calendar a diet uses: the saved choice if it is still offered, else the rule set's default. */
export function resolveCalendar(ruleSet: RuleSet, saved: string | undefined): string | undefined {
  return calendarChoices(ruleSet).some((c) => c.calendar === saved) ? saved : ruleSet.calendar;
}

export const ORTHODOX_STYLE: Record<string, ChurchCalendarStyle> = {
  'orthodox-revised-julian': 'revised-julian',
  'orthodox-julian': 'julian',
};

const LEVEL_TEXT: Record<Exclude<FastLevel, 'none'>, string> = {
  strict: 'a strict fast day: no meat, dairy, eggs, fish, wine or oil',
  'wine-oil': 'a fast day with wine and oil: no meat, dairy, eggs or fish',
  fish: 'a fast day with fish, wine and oil: no meat, dairy or eggs',
  dairy: 'a fast day with dairy and eggs: no meat',
};

/** Plain-language rule for an Orthodox day on the given calendar. */
export function orthodoxNote(date: Date, calendar: string): string {
  const day = orthodoxDay(date, ORTHODOX_STYLE[calendar] ?? 'revised-julian');
  const where = [day.feast, day.season && SEASON_NAMES[day.season]].filter(Boolean);
  const context = where.length && day.feast !== 'Wednesday' && day.feast !== 'Friday' ? ` (${where.join(', ')})` : '';
  if (day.level === 'none') {
    return day.fastFree ? `Today is fast-free${context}.` : "Today isn't a fast day, so no food rules apply.";
  }
  const extra = day.labels.includes('good-friday') ? ' Many keep a total fast today.' : '';
  return `Today is ${LEVEL_TEXT[day.level]}${context}.${extra}`;
}

/** Plain-language note about Western Lent for a day. */
export function westernLentNote(date: Date): string {
  const days = westernLent(date);
  if (days.includes('good-friday')) return 'Today is Good Friday, a day of fasting and abstinence from meat.';
  if (days.includes('ash-wednesday')) return 'Today is Ash Wednesday, a day of fasting and abstinence from meat.';
  if (days.includes('lent-friday')) return 'Today is a Friday of Lent, a day of abstinence from meat.';
  if (days.includes('lent')) return "It's Lent, but today isn't a day of abstinence.";
  return "It isn't Lent today.";
}

/**
 * A plain-language note about the calendar, for diets whose rules depend on
 * the date. Returns undefined for diets without a calendar.
 */
export function calendarNote(ruleSet: RuleSet, date: Date, calendar = ruleSet.calendar): string | undefined {
  if (!calendar) return undefined;
  if (ORTHODOX_STYLE[calendar]) return orthodoxNote(date, calendar);
  if (calendar === 'western-lent') return westernLentNote(date);
  return undefined;
}
