/**
 * Core types for the Total Fast compliance engine.
 *
 * One schema serves every diet: a canonical ingredient database and a set of
 * declarative diet rule sets both feed a single engine. Adding a diet means
 * adding a RuleSet (data), never engine code.
 */

/** The three verdict states. Every verdict names what triggered it. */
export type Verdict = 'compliant' | 'not_compliant' | 'uncertain';

/**
 * Category tags attached to canonical ingredients. Rule sets match on these,
 * so the vocabulary is shared across diets. Add a tag here (and to the
 * ingredients it applies to) before a rule set can use it.
 */
export const CATEGORIES = [
  // animal products
  'meat', 'red-meat', 'poultry', 'meat-derived', 'fish', 'shellfish', 'dairy', 'clarified-butter',
  'egg', 'animal-fat', 'gelatin', 'honey',
  // plant foods
  'fruit', 'vegetable', 'root-vegetable', 'leafy-green', 'legume', 'green-legume',
  'soy', 'peanut', 'grain', 'whole-grain', 'refined-grain', 'gluten', 'pseudo-grain',
  'nut', 'seed', 'herb-spice', 'mushroom',
  // fats
  'plant-oil', 'solid-fat', 'hydrogenated-fat',
  // sweeteners
  'added-sugar', 'artificial-sweetener', 'sugar-alcohol', 'fruit-juice',
  // leavening and fermentation
  'yeast', 'chemical-leavening',
  // beverages and stimulants
  'alcohol', 'caffeine',
  // additives
  'preservative', 'artificial-color', 'artificial-flavor', 'natural-flavor',
  'thickener', 'emulsifier', 'vinegar', 'salt', 'water', 'vitamin-mineral',
] as const;

export type Category = (typeof CATEGORIES)[number];

/** One canonical ingredient in the ingredient database. */
export interface Ingredient {
  /** Stable id, kebab-case. Rule sets may reference it directly. */
  id: string;
  /** Display name. */
  name: string;
  /** Other label spellings that resolve to this ingredient (lowercase). */
  aliases?: string[];
  categories: Category[];
  /**
   * Set when a label name is genuinely ambiguous (e.g. "natural flavors" may
   * hide animal or alcohol-based carriers). Such ingredients start uncertain
   * unless a rule set explicitly allows them.
   */
  ambiguous?: string;
}

export type Effect = 'allow' | 'deny' | 'caution';

/** Conditions under which a rule is active. Omitted = always active. */
export interface RuleWhen {
  /** Named days computed by the rule set's calendar, e.g. "lent-friday". */
  days: string[];
}

export interface Rule {
  /** Match ingredients by id (most specific). */
  ingredients?: string[];
  /** Match ingredients carrying any of these categories. */
  categories?: Category[];
  effect: Effect;
  /** Human-readable reason shown with the verdict. */
  reason: string;
  when?: RuleWhen;
}

/** A calendar returns the named days that apply on a date (e.g. Lent Fridays). */
export type DietCalendar = (date: Date) => string[];

export interface RuleSet {
  id: string;
  name: string;
  /** Bump on every rule change; the backend ships rule sets by version. */
  version: string;
  /** Who reviewed this rule set, and the source it follows. */
  review: { status: 'draft' | 'reviewed'; reviewer?: string; source: string };
  rules: Rule[];
  /** Named calendar used by `when.days` rules. Key into CALENDARS. */
  calendar?: string;
  disclaimer?: string;
}

/** A product or recipe to check: a name plus its ingredient list. */
export interface Checkable {
  name: string;
  /** Raw ingredient statement as printed on a label, or recipe lines. */
  ingredientsText?: string;
  /** Already-split ingredient names, used instead of ingredientsText. */
  ingredients?: string[];
}

export interface IngredientFinding {
  /** Text as it appeared on the label. */
  label: string;
  /** Canonical ingredient it resolved to, if any. */
  ingredient?: Ingredient;
  verdict: Verdict;
  reason: string;
}

export interface CheckResult {
  verdict: Verdict;
  /** One line summary naming the triggering ingredient(s). */
  summary: string;
  /** Findings that decided the verdict (non-compliant first, then uncertain). */
  triggers: IngredientFinding[];
  /** Every ingredient, in label order. */
  findings: IngredientFinding[];
  ruleSet: { id: string; version: string };
}
