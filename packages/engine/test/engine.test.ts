import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ComplianceEngine, INGREDIENTS, fromOpenFoodFacts, danielFast, lent, parseIngredients, recipeLineToIngredient, westernEaster, westernLent, whole30,
} from '../src/index.ts';

const engine = new ComplianceEngine(INGREDIENTS);
const check = (text: string, rs = whole30, date?: string) =>
  engine.check({ name: 't', ingredientsText: text }, rs, { date: date ? new Date(`${date}T12:00:00`) : undefined });

// Label text modeled on common US products.
const SANDWICH_BREAD =
  'Ingredients: Enriched wheat flour (wheat flour, niacin, reduced iron, thiamine mononitrate, riboflavin, folic acid), water, sugar, yeast, soybean oil, contains 2% or less of: salt, calcium propionate (to preserve freshness), mono- and diglycerides, soy lecithin. Contains: wheat, soy.';
const MARINARA = 'Tomato puree (water, tomato paste), diced tomatoes, olive oil, salt, garlic, basil, onion powder, black pepper, citric acid.';
const ALMOND_BUTTER = 'Dry roasted almonds, sea salt.';
const GREEK_YOGURT_BAR = 'Greek yogurt (cultured pasteurized nonfat milk), cane sugar, oats, honey, natural flavors.';
const TUNA = 'Tuna, water, salt.';
const CHICKEN_SOUP = 'Chicken broth, carrots, cooked chicken, celery, salt, spices.';

describe('parseIngredients', () => {
  it('keeps nested sub-ingredients and drops preambles and allergen statements', () => {
    const names = (items: ReturnType<typeof parseIngredients>): string[] => items.flatMap((i) => [i.name, ...names(i.children)]);
    const parsed = names(parseIngredients(SANDWICH_BREAD));
    assert.deepEqual(parsed.slice(0, 3), ['Enriched wheat flour', 'wheat flour', 'niacin']);
    assert.ok(parsed.includes('salt'), 'salt after "contains 2% or less of:"');
    assert.ok(parsed.includes('calcium propionate'), 'functional note stripped');
    assert.ok(!parsed.some((n) => /contains/i.test(n)), 'allergen statement removed');
    assert.ok(!parsed.some((n) => /preserve/i.test(n)), 'parenthesized functional note dropped');
  });

  it('splits and/or alternatives', () => {
    const names = parseIngredients('Soybean and/or canola oil, salt').map((i) => i.name);
    assert.deepEqual(names, ['Soybean oil', 'canola oil', 'salt']);
  });
});

describe('Whole30', () => {
  it('flags sugar, grain and legumes in bread, naming them', () => {
    const r = check(SANDWICH_BREAD);
    assert.equal(r.verdict, 'not_compliant');
    const triggers = r.triggers.map((t) => t.ingredient?.id);
    assert.ok(triggers.includes('sugar'));
    assert.ok(triggers.includes('wheat-flour'));
    assert.match(r.summary, /Enriched wheat flour/);
  });
  it('passes plain marinara and almond butter', () => {
    assert.equal(check(MARINARA).verdict, 'compliant');
    assert.equal(check(ALMOND_BUTTER).verdict, 'compliant');
  });
  it('allows the ghee, green bean and soy lecithin exceptions', () => {
    assert.equal(check('Ghee, green beans, soy lecithin, salt').verdict, 'compliant');
  });
  it('is uncertain on natural flavors and on unknown ingredients', () => {
    const r = check('Apples, natural flavors, zorbitol gum');
    assert.equal(r.verdict, 'uncertain');
    assert.deepEqual(r.triggers.map((t) => t.label), ['natural flavors', 'zorbitol gum']);
  });
});

describe('Daniel Fast', () => {
  it('rejects yeast bread, dairy bars and fish', () => {
    assert.equal(check(SANDWICH_BREAD, danielFast).verdict, 'not_compliant');
    assert.equal(check(GREEK_YOGURT_BAR, danielFast).verdict, 'not_compliant');
    assert.equal(check(TUNA, danielFast).verdict, 'not_compliant');
  });
  it('accepts whole plant foods', () => {
    assert.equal(check(ALMOND_BUTTER, danielFast).verdict, 'compliant');
    assert.equal(check(MARINARA, danielFast).verdict, 'compliant');
  });
  it('treats preservatives as a judgment call', () => {
    const r = check('Chickpeas, water, salt, potassium sorbate', danielFast);
    assert.equal(r.verdict, 'uncertain');
    assert.equal(r.triggers[0].ingredient?.id, 'potassium-sorbate');
  });
});

describe('Lent', () => {
  it('computes Easter and Lent days', () => {
    assert.equal(westernEaster(2026).toISOString().slice(0, 10), '2026-04-05');
    assert.equal(westernEaster(2027).toISOString().slice(0, 10), '2027-03-28');
    assert.deepEqual(westernLent(new Date('2027-02-10T12:00:00')), ['lent', 'ash-wednesday']);
    assert.deepEqual(westernLent(new Date('2027-03-26T12:00:00')), ['lent', 'lent-friday', 'good-friday']);
    assert.deepEqual(westernLent(new Date('2027-02-09T12:00:00')), []);
  });
  it('denies meat on a Lenten Friday but not on a Tuesday', () => {
    assert.equal(check(CHICKEN_SOUP, lent, '2027-02-19').verdict, 'not_compliant');
    assert.equal(check(CHICKEN_SOUP, lent, '2027-02-16').verdict, 'compliant');
  });
  it('allows fish and flags meat broth as a caution on Fridays', () => {
    assert.equal(check(TUNA, lent, '2027-02-19').verdict, 'compliant');
    const broth = check('Chicken broth, carrots, salt', lent, '2027-02-19');
    assert.equal(broth.verdict, 'uncertain');
  });
});

describe('recipes', () => {
  it('strips quantities and units from recipe lines', () => {
    assert.equal(recipeLineToIngredient('2 cups rolled oats, divided'), 'rolled oats');
    assert.equal(recipeLineToIngredient('1 (15 oz) can chickpeas, drained'), 'chickpeas');
    assert.equal(recipeLineToIngredient('½ tsp sea salt'), 'sea salt');
  });
  it('flags the exact ingredient that breaks a recipe', () => {
    const r = engine.check(
      { name: 'Overnight oats', ingredients: ['1 cup rolled oats', '1 cup almond milk', '1 tbsp maple syrup', '1 banana'] },
      danielFast,
    );
    assert.equal(r.verdict, 'not_compliant');
    assert.deepEqual(r.triggers.map((t) => t.label), ['maple syrup']);
  });
});

describe('Open Food Facts', () => {
  it('maps a product response to a checkable item', () => {
    const item = fromOpenFoodFacts({
      code: '0000000000000',
      product: { product_name: 'Test Salsa', ingredients_text_en: 'Tomatoes, onions, jalapeno peppers, salt', ingredients_text: 'Tomates' },
    });
    assert.equal(item?.name, 'Test Salsa');
    assert.equal(item?.ingredientsText, 'Tomatoes, onions, jalapeno peppers, salt');
    assert.equal(fromOpenFoodFacts({ status: 0 }), undefined);
  });
});

describe('ingredient database', () => {
  it('has no alias that maps to two ingredients', () => {
    assert.doesNotThrow(() => new ComplianceEngine(INGREDIENTS));
  });
});
