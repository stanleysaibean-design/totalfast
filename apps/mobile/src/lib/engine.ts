import {
  ComplianceEngine,
  INGREDIENTS,
  RULE_SETS,
  westernLent,
  type Checkable,
  type CheckResult,
  type RuleSet,
} from '@total-fast/engine';

/**
 * One engine for the whole app. The ingredient database and rule sets ship
 * inside the app bundle, so every check works offline.
 */
const engine = new ComplianceEngine(INGREDIENTS);

/** Pass the day from useDiet().today so verdicts follow the calendar. */
export function checkItem(item: Checkable, ruleSet: RuleSet, date: Date): CheckResult {
  return engine.check(item, ruleSet, { date });
}

export interface DietInfo {
  ruleSet: RuleSet;
  /** One line for the diet picker. */
  tagline: string;
}

/** Launch diets in the order the picker shows them. */
export const DIETS: DietInfo[] = [
  { ruleSet: RULE_SETS['daniel-fast'], tagline: 'Plant foods and water. No sweeteners, leavening, or animal products.' },
  { ruleSet: RULE_SETS['whole30'], tagline: 'No added sugar, alcohol, grains, legumes, or dairy for 30 days.' },
  { ruleSet: RULE_SETS['lent-catholic'], tagline: 'No meat on Ash Wednesday and the Fridays of Lent.' },
];

export const DEFAULT_DIET_ID = DIETS[0].ruleSet.id;

export function findDiet(id: string | null | undefined): DietInfo | undefined {
  return DIETS.find((d) => d.ruleSet.id === id);
}

/**
 * A plain-language note about the calendar, for diets whose rules depend on
 * the date. Returns undefined for diets without a calendar.
 */
export function calendarNote(ruleSet: RuleSet, date: Date): string | undefined {
  if (ruleSet.calendar !== 'western-lent') return undefined;
  const days = westernLent(date);
  if (days.includes('good-friday')) return 'Today is Good Friday, a day of abstinence from meat.';
  if (days.includes('ash-wednesday')) return 'Today is Ash Wednesday, a day of abstinence from meat.';
  if (days.includes('lent-friday')) return 'Today is a Friday of Lent, a day of abstinence from meat.';
  if (days.includes('lent')) return "It's Lent, but today isn't a day of abstinence, so no food rules apply.";
  return "It isn't Lent today, so no food rules apply.";
}
