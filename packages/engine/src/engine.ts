import { CALENDARS } from './calendar.ts';
import { parseLabel, type ParsedIngredient } from './parse.ts';
import { IngredientIndex, recipeLineToIngredient } from './resolve.ts';
import type { Category, Checkable, CheckResult, Effect, Ingredient, IngredientFinding, Rule, RuleSet, Verdict } from './types.ts';

export interface CheckOptions {
  /** Date the food will be eaten; drives calendar rules. Defaults to now. */
  date?: Date;
}

/** Allergen words printed in parentheses after an ingredient, per FALCPA/EU labeling. */
const ALLERGEN_SOURCES = new Set([
  'milk', 'soy', 'soya', 'wheat', 'egg', 'eggs', 'fish', 'shellfish', 'peanut', 'peanuts', 'sesame',
  'tree nuts', 'almond', 'almonds', 'cashew', 'coconut', 'crustacean', 'barley', 'rye', 'oats',
]);

/**
 * Categories too broad to show that a declared allergen is accounted for:
 * oats are a grain, but they don't explain "Contains: wheat".
 */
const BROAD_CATEGORIES = new Set<Category>([
  'grain', 'whole-grain', 'refined-grain', 'pseudo-grain', 'vegetable', 'fruit', 'legume', 'seed',
  'plant-oil', 'thickener', 'emulsifier', 'vitamin-mineral',
]);

const STRENGTH: Record<Effect, number> = { allow: 0, caution: 1, deny: 2 };
const EFFECT_VERDICT: Record<Effect, Verdict> = { allow: 'compliant', caution: 'uncertain', deny: 'not_compliant' };

/**
 * The compliance engine. It knows nothing about any specific diet: every
 * diet-specific decision lives in a RuleSet.
 *
 * Rule precedence for one ingredient:
 * 1. Rules naming the ingredient by id beat rules matching by category.
 * 2. Within the same level, an `allow` rule is an exception and wins
 *    (e.g. Whole30 denies dairy but allows clarified butter).
 * 3. Otherwise the strictest effect wins: deny > caution.
 * 4. No matching rule: compliant, unless the ingredient is flagged ambiguous
 *    (then uncertain). Unrecognized label text is always uncertain.
 */
export class ComplianceEngine {
  private index: IngredientIndex;

  constructor(ingredients: Ingredient[]) {
    this.index = new IngredientIndex(ingredients);
  }

  check(item: Checkable, ruleSet: RuleSet, opts: CheckOptions = {}): CheckResult {
    const active = activeRules(ruleSet, opts.date ?? new Date());
    const label = item.ingredients
      ? { ingredients: item.ingredients.map((l): ParsedIngredient => ({ name: recipeLineToIngredient(l), children: [] })), declared: [] }
      : parseLabel(item.ingredientsText ?? '');

    const findings: IngredientFinding[] = [];
    const visit = (items: ParsedIngredient[]) => {
      for (const p of items) {
        // "ghee (milk)" and "lecithin (soy)" declare an allergen source, not a
        // second ingredient: resolve as "ghee" or "soy lecithin" and stop.
        const source = p.children.length === 1 && ALLERGEN_SOURCES.has(p.children[0].name.toLowerCase())
          ? p.children[0].name
          : undefined;
        const ingredient = this.index.resolve(p.name) ?? (source && this.index.resolve(`${source} ${p.name}`));
        if (ingredient && source) {
          findings.push(this.judge(`${p.name} (${source})`, ingredient, active));
          continue;
        }
        // A compound heading we don't know ("vitamins and minerals (...)") is
        // judged by its listed sub-ingredients instead.
        if (ingredient || !p.children.length) findings.push(this.judge(p.name, ingredient || undefined, active));
        visit(p.children);
      }
    };
    visit(label.ingredients);
    findings.push(...this.unaccountedAllergens(label.declared, findings, active));

    const ruleSetRef = { id: ruleSet.id, version: ruleSet.version };
    if (findings.length === 0) {
      return {
        verdict: 'uncertain',
        summary: 'No ingredient list to check.',
        triggers: [],
        findings,
        ruleSet: ruleSetRef,
      };
    }
    if (active.length === 0) {
      return {
        verdict: 'compliant',
        summary: `No ${ruleSet.name} restrictions apply on this day.`,
        triggers: [],
        findings: findings.map((f) => ({ ...f, verdict: 'compliant', reason: 'No restrictions apply on this day.' })),
        ruleSet: ruleSetRef,
      };
    }

    const denied = findings.filter((f) => f.verdict === 'not_compliant');
    const unsure = findings.filter((f) => f.verdict === 'uncertain');
    const verdict: Verdict = denied.length ? 'not_compliant' : unsure.length ? 'uncertain' : 'compliant';
    const triggers = denied.length ? denied : unsure;
    return {
      verdict,
      summary: summarize(verdict, triggers, ruleSet),
      triggers,
      findings,
      ruleSet: ruleSetRef,
    };
  }

  /**
   * A "Contains: milk" statement is the manufacturer saying milk is in the
   * product. If the active rules would object to it and no listed ingredient
   * explains it, the list is incomplete or unrecognized, so flag it rather
   * than let the product pass as compliant.
   */
  private unaccountedAllergens(declared: string[], findings: IngredientFinding[], rules: Rule[]): IngredientFinding[] {
    const out: IngredientFinding[] = [];
    for (const word of declared) {
      const allergen = this.index.resolve(word);
      if (!allergen || this.judge(word, allergen, rules).verdict === 'compliant') continue;
      const specific = allergen.categories.filter((c) => !BROAD_CATEGORIES.has(c));
      const accounted = [...findings, ...out].some(
        (f) => f.ingredient && (f.ingredient.id === allergen.id || f.ingredient.categories.some((c) => specific.includes(c))),
      );
      if (accounted) continue;
      out.push({
        label: `${word} (label says "Contains")`,
        ingredient: allergen,
        verdict: 'uncertain',
        reason: `The label declares ${word}, but no ingredient in the list accounts for it.`,
      });
    }
    return out;
  }

  private judge(label: string, ingredient: Ingredient | undefined, rules: Rule[]): IngredientFinding {
    if (!ingredient) {
      return { label, verdict: 'uncertain', reason: `"${label}" is not in the ingredient database yet.` };
    }
    const byId = rules.filter((r) => r.ingredients?.includes(ingredient.id));
    const byCategory = rules.filter((r) => r.categories?.some((c) => ingredient.categories.includes(c)));
    const rule = pick(byId) ?? pick(byCategory);
    if (rule) return { label, ingredient, verdict: EFFECT_VERDICT[rule.effect], reason: rule.reason };
    if (ingredient.ambiguous) return { label, ingredient, verdict: 'uncertain', reason: ingredient.ambiguous };
    return { label, ingredient, verdict: 'compliant', reason: 'No rule restricts this ingredient.' };
  }
}

function pick(rules: Rule[]): Rule | undefined {
  if (rules.length === 0) return undefined;
  const allow = rules.find((r) => r.effect === 'allow');
  if (allow) return allow;
  return rules.reduce((a, b) => (STRENGTH[b.effect] > STRENGTH[a.effect] ? b : a));
}

function activeRules(ruleSet: RuleSet, date: Date): Rule[] {
  const calendar = ruleSet.calendar ? CALENDARS[ruleSet.calendar] : undefined;
  if (ruleSet.calendar && !calendar) throw new Error(`Unknown calendar "${ruleSet.calendar}" in ${ruleSet.id}`);
  const days = new Set(calendar ? calendar(date) : []);
  return ruleSet.rules.filter((r) => !r.when || r.when.days.some((d) => days.has(d)));
}

function summarize(verdict: Verdict, triggers: IngredientFinding[], ruleSet: RuleSet): string {
  // One name per canonical ingredient: "enriched flour (wheat flour)" reads once.
  const seen = new Set<string>();
  const names = triggers
    .filter((t) => {
      const key = t.ingredient?.id ?? t.label.toLowerCase();
      return seen.has(key) ? false : (seen.add(key), true);
    })
    .map((t) => t.label);
  const list = names.length > 3 ? `${names.slice(0, 3).join(', ')} and ${names.length - 3} more` : names.join(', ');
  if (verdict === 'compliant') return `Compliant with ${ruleSet.name}.`;
  if (verdict === 'not_compliant') return `Not compliant with ${ruleSet.name}: contains ${list}.`;
  return `Can't confirm for ${ruleSet.name}: check ${list}.`;
}
