import { CALENDARS } from './calendar.ts';
import { parseLabel, type ParsedIngredient } from './parse.ts';
import { IngredientIndex, recipeLineToIngredient } from './resolve.ts';
import type { Category, Checkable, CheckResult, Effect, Ingredient, IngredientFinding, Rule, RuleSet, Verdict } from './types.ts';

export interface CheckOptions {
  /** Date the food will be eaten; drives calendar rules. Defaults to now. */
  date?: Date;
  /**
   * Calendar to use, for rule sets that offer `calendarChoices`. Defaults to
   * the rule set's own `calendar`.
   */
  calendar?: string;
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

/** Role words a label puts in parentheses after an ingredient to say what it is for. */
const ROLE_NOTE =
  /^(natural |artificial )?(emulsifiers?|preservatives?|antioxidants?|stabili[sz]ers?|thickeners?|thickening agents?|acidity regulators?|acidulants?|raising agents?|leavening( agents?)?|anti ?caking( agents?)?|firming agents?|dough conditioners?|humectants?|gelling agents?|glazing agents?|flavou?r enhancers?|mou?ld inhibitors?|colou?rs?|colou?rings?|sweeteners?|processing aids?|sequestrants?|bleaching agents?|binders?|fillers?|carriers?|propellants?|vitamins?|minerals?)$/i;

/** Categories safe to split out of a comma-less run of words. */
const SEGMENTABLE = new Set<Category>(['vitamin-mineral', 'preservative', 'salt', 'added-sugar', 'water', 'chemical-leavening', 'emulsifier', 'thickener']);

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
    const active = activeRules(ruleSet, opts.date ?? new Date(), opts.calendar);
    const label = item.ingredients
      ? { ingredients: item.ingredients.map((l): ParsedIngredient => ({ name: recipeLineToIngredient(l), children: [] })), declared: [] }
      : parseLabel(item.ingredientsText ?? '');

    const findings: IngredientFinding[] = [];
    const visit = (items: ParsedIngredient[], parent?: string, parentKnown = false) => {
      // "vegetable oils (sunflower, rapeseed)" lists kinds of the parent:
      // read the children as "sunflower oil", "rapeseed oil" when that's known.
      const head = parent?.toLowerCase().match(/\b(oil|fat|flour|starch|juice|puree|powder|extract|fiber|fibre|protein|syrup|gum|vinegar)s?$/)?.[1];
      for (const p of items) {
        // "soy lecithin (an emulsifier)": a role word noting what the parent
        // does, not another ingredient.
        if (parentKnown && !p.children.length && ROLE_NOTE.test(p.name.trim())) continue;
        const vitamin = parent && /\bvitamins?$/i.test(parent.trim()) && /^[a-z]\d{0,2}$/i.test(p.name.trim())
          ? this.index.resolve(`vitamin ${p.name.trim()}`)
          : undefined;
        const withHead = head && !p.name.toLowerCase().endsWith(head) ? `${p.name} ${head}` : undefined;
        // "lecithin (sunflower)" -> "sunflower lecithin", when "sunflower" alone means nothing
        const withParent = parentKnown && parent && !p.children.length && parent.trim().split(/\s+/).length <= 2 && !this.index.resolve(p.name)
          ? this.index.resolve(`${p.name} ${parent}`)
          : undefined;
        const inherited = vitamin ? [vitamin] : withHead ? this.resolveAll(withHead) : withParent ? [withParent] : undefined;
        if (inherited) {
          for (const ing of inherited) findings.push(this.judge(p.name, ing, active));
          visit(p.children, p.name, true);
          continue;
        }
        // "ghee (milk)" and "lecithin (soy)" declare an allergen source, not a
        // second ingredient: resolve as "ghee" or "soy lecithin" and stop.
        const source = p.children.length === 1 && ALLERGEN_SOURCES.has(p.children[0].name.toLowerCase())
          ? p.children[0].name
          : undefined;
        const ingredient = (source && this.index.resolve(`${source} ${p.name}`)) || this.index.resolve(p.name);
        const parts = ingredient ? undefined : (this.resolveParts(p.name) ?? this.segment(p.name) ?? this.oilFromSiblings(p, items));
        if (parts) {
          for (const part of parts) findings.push(this.judge(p.name, part, active));
          visit(p.children, p.name, true);
          continue;
        }
        // A stray letter or two ("L" from "L-ascorbic acid") names nothing.
        if (!ingredient && !p.children.length && p.name.trim().length <= 2) continue;
        if (ingredient && source) {
          findings.push(this.judge(`${p.name} (${source})`, ingredient, active));
          // "lactic ferments (milk)": the entry says nothing about milk, so the
          // declared source is judged as well.
          const declared = !ingredient.categories.length ? this.index.resolve(source) : undefined;
          if (declared) findings.push(this.judge(`${p.name} (${source})`, declared, active));
          continue;
        }
        // A compound heading we don't know ("vitamins and minerals (...)") is
        // judged by its listed sub-ingredients instead.
        // "starch (corn)": a vague heading whose list says exactly what it
        // is gets judged by that list alone.
        // Flavorings stay uncertain: the list names the taste, not the carrier.
        const explained = ingredient && ingredient.ambiguous && ingredient.ambiguousFor && p.children.length > 0
          && !ingredient.categories.some((c) => c === 'natural-flavor' || c === 'artificial-flavor')
          && p.children.every((c) => {
          const r = this.index.resolve(c.name);
          return r && !r.ambiguous;
        });
        // "lecithin (sunflower)": every child names a kind of the heading, so
        // the kinds ("sunflower lecithin") are judged and the heading is not.
        const kinds = ingredient && p.children.length > 0 && p.name.trim().split(/\s+/).length <= 2
          && p.children.every((c) => !c.children.length && !this.index.resolve(c.name) && this.index.resolve(`${c.name} ${p.name}`));
        if (!explained && !kinds && (ingredient || !p.children.length)) findings.push(this.judge(p.name, ingredient || undefined, active));
        visit(p.children, p.name, !!ingredient);
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

  /**
   * "rapeseed and sunflower oil", "corn and potato starch", "salt & enzymes":
   * an unknown name joining two known ones, judged as both. Only used when
   * both parts are known.
   */
  /** "canola, sunflower and/or soybean oil": a bare plant name listed before an oil. */
  private oilFromSiblings(p: ParsedIngredient, siblings: ParsedIngredient[]): Ingredient[] | undefined {
    if (p.children.length || p.name.trim().includes(' ')) return undefined;
    const at = siblings.indexOf(p);
    const later = siblings.slice(at + 1, at + 5);
    if (!later.some((x) => /\boils?$/i.test(x.name.trim()))) return undefined;
    const hit = this.index.resolve(`${p.name} oil`);
    return hit ? [hit] : undefined;
  }

  private resolveAll(name: string, depth = 0): Ingredient[] | undefined {
    const one = this.index.resolve(name);
    if (one) return [one];
    if (depth > 3) return undefined;
    return this.resolveParts(name, depth) ?? this.segment(name);
  }

  /**
   * "rapeseed and sunflower oil", "xanthan and/or guar gums", "soybean oil
   * with TBHQ", "spices including paprika": an unknown name joining known
   * ones, judged as all of them (the strictest wins). Only used when every
   * part is known.
   */
  private resolveParts(name: string, depth = 0): Ingredient[] | undefined {
    const m = name.match(/^(.+?)\s+(?:and\s*\/?\s*or|or|and|&|\+|including|with|plus)\s+(.+)$/i);
    if (!m) return undefined;
    let [, a, b] = m;
    // "yellow 5 & 6" -> "yellow 5", "yellow 6"
    if (/^\d+$/.test(b.trim()) && /\s\d+$/.test(a)) b = a.replace(/\d+$/, b.trim());
    // "vitamin a & d" -> "vitamin a", "vitamin d"
    if (/^[a-z]\d{0,2}$/i.test(b.trim()) && /^vitamins?\s+[a-z]\d{0,2}$/i.test(a.trim())) b = `vitamin ${b.trim()}`;
    const right = this.resolveAll(b, depth + 1);
    if (!right) return undefined;
    // "olive and sunflower oil" shares its noun: olive oil, not olives.
    const tail = b.trim().split(/\s+/).at(-1)!;
    const shared = b.includes(' ') && !a.trim().endsWith(tail) ? this.index.resolve(`${a} ${tail}`) : undefined;
    const left = shared ? [shared] : this.resolveAll(a, depth + 1);
    if (!left) return undefined;
    const out = [...left, ...right];
    return out.filter((x, i) => out.findIndex((y) => y.id === x.id) === i);
  }

  /**
   * Labels that lost their commas: "sugar glucose fructose", "niacin reduced
   * iron". Split into known names only when every piece is a plain additive,
   * sweetener or nutrient, so food words are never recombined ("apple
   * butter" must not become apple and butter).
   */
  private segment(name: string): Ingredient[] | undefined {
    const words = name.trim().split(/\s+/);
    if (words.length < 2 || words.length > 8) return undefined;
    const best: (Ingredient[] | undefined)[] = [[]];
    for (let i = 1; i <= words.length; i++) {
      for (let j = Math.max(0, i - 4); j < i; j++) {
        const prev = best[j];
        if (!prev || (best[i] && best[i]!.length <= prev.length + 1)) continue;
        const hit = this.index.resolve(words.slice(j, i).join(' '));
        if (hit && !hit.ambiguous && hit.categories.length && hit.categories.every((c) => SEGMENTABLE.has(c))) best[i] = [...prev, hit];
      }
    }
    const out = best[words.length];
    return out && out.length > 1 ? out : undefined;
  }

  private judge(label: string, ingredient: Ingredient | undefined, rules: Rule[]): IngredientFinding {
    return judgeIngredient(label, ingredient, rules);
  }
}

/** Judges one label entry against a list of already-active rules. */
export function judgeIngredient(label: string, ingredient: Ingredient | undefined, rules: Rule[]): IngredientFinding {
  if (!ingredient) {
    return { label, verdict: 'uncertain', reason: `"${label}" is not in the ingredient database yet.` };
  }
  const byId = rules.filter((r) => r.ingredients?.includes(ingredient.id));
  const byCategory = rules.filter((r) => r.categories?.some((c) => ingredient.categories.includes(c)));
  const rule = pick(byId) ?? pick(byCategory);
  if (rule) return { label, ingredient, verdict: EFFECT_VERDICT[rule.effect], reason: rule.reason };
  if (ingredient.ambiguous && ambiguityMatters(ingredient, rules)) {
    return { label, ingredient, verdict: 'uncertain', reason: ingredient.ambiguous };
  }
  return { label, ingredient, verdict: 'compliant', reason: 'No rule restricts this ingredient.' };
}

/** Whether any active rule restricts a category the ingredient might belong to. */
function ambiguityMatters(ingredient: Ingredient, rules: Rule[]): boolean {
  const scope = ingredient.ambiguousFor;
  if (!scope) return true;
  return rules.some((r) => r.effect !== 'allow' && r.categories?.some((c) => scope.includes(c)));
}

function pick(rules: Rule[]): Rule | undefined {
  if (rules.length === 0) return undefined;
  const allow = rules.find((r) => r.effect === 'allow');
  if (allow) return allow;
  return rules.reduce((a, b) => (STRENGTH[b.effect] > STRENGTH[a.effect] ? b : a));
}

function activeRules(ruleSet: RuleSet, date: Date, choice?: string): Rule[] {
  const offered = [ruleSet.calendar, ...(ruleSet.calendarChoices ?? []).map((c) => c.calendar)];
  if (choice && !offered.includes(choice)) throw new Error(`${ruleSet.id} does not offer the calendar "${choice}"`);
  const id = choice ?? ruleSet.calendar;
  const calendar = id ? CALENDARS[id] : undefined;
  if (id && !calendar) throw new Error(`Unknown calendar "${id}" in ${ruleSet.id}`);
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
