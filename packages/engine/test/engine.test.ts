import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ComplianceEngine, CURATED_INGREDIENTS, DATASETS, IMPORTED_INGREDIENTS, INGREDIENTS, IngredientIndex, SEED_INGREDIENTS, fastingSeasons, fromOpenFoodFacts, productsFromSearch, parseLabel, danielFast, lent, orthodox, orthodoxDay, orthodoxPascha, parseIngredients,
  recipeLineToIngredient, westernEaster, westernLent, whole30, type RuleSet,
} from '../src/index.ts';

const engine = new ComplianceEngine(INGREDIENTS);
const check = (text: string, rs: RuleSet = whole30, date?: string, calendar?: string) =>
  engine.check({ name: 't', ingredientsText: text }, rs, { date: date ? new Date(`${date}T12:00:00`) : undefined, calendar });
const day = (s: string) => new Date(`${s}T12:00:00`);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const OLD = 'orthodox-julian';

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

  it('keeps parsing after a stray closing bracket', () => {
    const names = parseIngredients('Oats, almonds), honey').map((i) => i.name);
    assert.deepEqual(names, ['Oats', 'almonds', 'honey']);
    assert.equal(check('Oats, almonds), honey', danielFast).verdict, 'not_compliant');
  });

  it('strips Open Food Facts percentages', () => {
    const r = check('Cane sugar 40%, milk powder 8.7%, cocoa (12%)', danielFast);
    assert.deepEqual(r.findings.map((f) => f.ingredient?.id), ['sugar', 'milk', 'cocoa']);
  });

  it('reads the declared allergens and ignores "may contain"', () => {
    assert.deepEqual(parseLabel('Oats, salt. Contains: milk, wheat and soy. May contain peanuts.').declared, ['milk', 'wheat', 'soy']);
    assert.deepEqual(parseLabel('Water, contains 2% or less of: salt').declared, []);
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

describe('declared allergens', () => {
  it('flags a declared allergen that no listed ingredient explains', () => {
    const r = check('Apples, cinnamon, spices. Contains: milk.', danielFast);
    assert.equal(r.verdict, 'uncertain');
    assert.equal(r.triggers[0].ingredient?.id, 'milk');
    assert.match(r.triggers[0].reason, /no ingredient in the list accounts for it/);
  });
  it('accepts a declared allergen that a listed ingredient explains', () => {
    assert.equal(check('Apples, ghee. Contains: milk.').verdict, 'compliant');
    assert.equal(check('Almonds, salt. Contains: tree nuts (almonds).', danielFast).verdict, 'compliant');
  });
  it('does not treat a broad match as an explanation', () => {
    const r = check('Oats, salt. Contains: wheat.', lent, '2027-02-19');
    assert.equal(r.verdict, 'compliant', 'wheat is fine on a Lenten Friday');
    assert.equal(check('Oats, salt. Contains: wheat.', danielFast).verdict, 'uncertain');
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

describe('Orthodox calendar', () => {
  it('computes Orthodox Pascha', () => {
    assert.deepEqual(
      [2025, 2026, 2027, 2028].map((y) => orthodoxPascha(y).toISOString().slice(0, 10)),
      ['2025-04-20', '2026-04-12', '2027-05-02', '2028-04-16'],
    );
  });
  it('starts Great Lent on Clean Monday, March 15, 2027, on both calendars', () => {
    for (const style of ['revised-julian', 'julian'] as const) {
      const r = orthodoxDay(day('2027-03-15'), style);
      assert.equal(r.level, 'strict');
      assert.equal(r.season, 'great-lent');
      assert.equal(orthodoxDay(day('2027-03-14'), style).level, 'dairy', 'Forgiveness Sunday ends Cheesefare week');
    }
  });
  it('relaxes weekends and feasts in Great Lent', () => {
    assert.equal(orthodoxDay(day('2027-03-20'), 'revised-julian').level, 'wine-oil', 'Saturday');
    assert.equal(orthodoxDay(day('2027-03-25'), 'revised-julian').level, 'fish', 'Annunciation, New Calendar');
    assert.equal(orthodoxDay(day('2027-03-25'), 'julian').level, 'strict', 'Old Calendar keeps the Annunciation on April 7');
    assert.equal(orthodoxDay(day('2027-04-07'), 'julian').level, 'fish');
    assert.equal(orthodoxDay(day('2027-04-25'), 'revised-julian').level, 'fish', 'Palm Sunday');
    assert.equal(orthodoxDay(day('2027-04-29'), 'revised-julian').level, 'wine-oil', 'Holy Thursday');
  });
  it('keeps fast-free weeks free, even on Wednesdays and Fridays', () => {
    assert.equal(orthodoxDay(day('2027-05-07'), 'revised-julian').level, 'none', 'Friday of Bright Week');
    assert.equal(orthodoxDay(day('2027-01-01'), 'revised-julian').level, 'none', 'Christmastide');
    assert.equal(orthodoxDay(day('2027-02-24'), 'revised-julian').level, 'none', 'Wednesday after the Publican and Pharisee');
  });
  it('keeps the Nativity Fast 13 days later on the Old Calendar', () => {
    assert.equal(orthodoxDay(day('2026-11-15'), 'revised-julian').season, 'nativity-fast');
    assert.equal(orthodoxDay(day('2026-11-15'), 'julian').season, undefined);
    assert.equal(orthodoxDay(day('2026-12-25'), 'revised-julian').level, 'none');
    assert.equal(orthodoxDay(day('2026-12-25'), 'julian').season, 'nativity-fast');
    assert.equal(orthodoxDay(day('2027-01-07'), 'julian').level, 'none', 'Old Calendar Christmas');
  });
  it('fasts on ordinary Wednesdays and Fridays only', () => {
    assert.equal(orthodoxDay(day('2026-11-06'), 'revised-julian').level, 'strict');
    assert.equal(orthodoxDay(day('2026-11-05'), 'revised-julian').level, 'none');
    assert.equal(orthodoxDay(day('2027-09-08'), 'revised-julian').level, 'fish', 'Nativity of the Theotokos on a Wednesday');
  });
  it('lists the coming fasting seasons', () => {
    const list = (cal: string) => fastingSeasons(cal, day('2026-11-06')).map((s) => `${s.id} ${iso(s.start)} ${iso(s.end)}`);
    assert.deepEqual(list('orthodox-revised-julian'), [
      'nativity-fast 2026-11-15 2026-12-24',
      'great-lent 2027-03-15 2027-05-01',
      'apostles-fast 2027-06-28 2027-06-28',
      'dormition-fast 2027-08-01 2027-08-14',
    ]);
    assert.deepEqual(list(OLD).slice(0, 2), ['nativity-fast 2026-11-28 2027-01-06', 'great-lent 2027-03-15 2027-05-01']);
    assert.deepEqual(list('western-lent'), ['lent 2027-02-10 2027-03-27']);
    assert.equal(fastingSeasons('orthodox-revised-julian', day('2026-12-01'))[0].start.getDate(), 15, 'a season in progress keeps its real start');
  });
});

describe('Orthodox fasting', () => {
  const VEG_SOUP = 'Water, lentils, carrots, onions, olive oil, salt.';
  const CHEESE_PIE = 'Wheat flour, cheese, eggs, butter, salt.';
  it('denies meat, dairy, eggs, fish, wine and olive oil on a strict day, naming each', () => {
    const r = check('Tuna, olive oil, white wine, cheese, egg', orthodox, '2027-03-17');
    assert.equal(r.verdict, 'not_compliant');
    assert.deepEqual(r.triggers.map((t) => t.ingredient?.id), ['tuna', 'olive-oil', 'wine', 'cheese', 'egg']);
    assert.match(r.summary, /Not compliant with Orthodox fasting/);
  });
  it('allows olive oil on weekends of Great Lent but still no dairy', () => {
    assert.equal(check(VEG_SOUP, orthodox, '2027-03-20').verdict, 'compliant');
    assert.equal(check(VEG_SOUP, orthodox, '2027-03-17').verdict, 'not_compliant');
    assert.equal(check(CHEESE_PIE, orthodox, '2027-03-20').verdict, 'not_compliant');
  });
  it('is cautious about other cooking oils on a strict day', () => {
    const r = check('Potatoes, sunflower oil, salt', orthodox, '2027-03-17');
    assert.equal(r.verdict, 'uncertain');
    assert.equal(r.triggers[0].ingredient?.id, 'sunflower-oil');
  });
  it('allows shellfish and honey on every fast day', () => {
    assert.equal(check('Shrimp, squid, garlic, salt', orthodox, '2027-03-17').verdict, 'compliant');
    assert.equal(check('Honey, walnuts, sesame seeds', orthodox, '2027-03-17').verdict, 'compliant');
  });
  it('allows fish on Palm Sunday and fish roe on Lazarus Saturday', () => {
    assert.equal(check('Salmon, lemon juice, salt', orthodox, '2027-04-25').verdict, 'compliant');
    assert.equal(check('Fish roe, bread crumbs', orthodox, '2027-04-24').verdict, 'uncertain', 'roe passes; bread crumbs are unknown');
    assert.equal(check('Fish roe, onions', orthodox, '2027-04-24').verdict, 'compliant');
    assert.equal(check('Salmon', orthodox, '2027-04-24').verdict, 'not_compliant');
  });
  it('allows wine but not oil on Holy Saturday', () => {
    assert.equal(check('Red wine', orthodox, '2027-05-01').verdict, 'compliant');
    assert.equal(check('Olive oil', orthodox, '2027-05-01').verdict, 'not_compliant');
  });
  it('allows dairy but not meat in Cheesefare week', () => {
    assert.equal(check(CHEESE_PIE, orthodox, '2027-03-10').verdict, 'compliant');
    assert.equal(check(CHICKEN_SOUP, orthodox, '2027-03-10').verdict, 'not_compliant');
  });
  it('has no restrictions on a fast-free day', () => {
    const r = check(CHICKEN_SOUP, orthodox, '2027-05-05');
    assert.equal(r.verdict, 'compliant');
    assert.match(r.summary, /No Orthodox fasting restrictions apply/);
  });
  it('follows the chosen church calendar', () => {
    // December 25, 2026 is Christmas on the New Calendar and a Nativity Fast day on the Old.
    assert.equal(check(CHEESE_PIE, orthodox, '2026-12-25').verdict, 'compliant');
    assert.equal(check(CHEESE_PIE, orthodox, '2026-12-25', OLD).verdict, 'not_compliant');
  });
  it('rejects a calendar the rule set does not offer', () => {
    assert.throws(() => check(CHEESE_PIE, orthodox, '2026-12-25', 'western-lent'), /does not offer/);
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

  it('turns a brand search into products to pick from, each checked on its own label', () => {
    const matches = productsFromSearch({
      products: [
        { code: '1', brands: 'Crunchos', product_name: 'Sea Salt', quantity: '200 g', ingredients_text: 'Corn, sunflower oil, salt.' },
        { code: '2', brands: 'Crunchos, SnackCo', product_name: 'Crunchos Cheese Blast' },
        { code: '3', brands: 'Crunchos', product_name: 'Cheese Blast', ingredients_text_en: 'Corn, vegetable oil, cheddar cheese (milk), salt.' },
        { code: '1', brands: 'Crunchos', product_name: 'Sea Salt duplicate' },
        { code: '4' },
      ],
    });
    assert.deepEqual(matches.map((m) => [m.barcode, m.name, !!m.item]), [
      ['1', 'Crunchos Sea Salt', true],
      ['3', 'Crunchos Cheese Blast', true],
      ['2', 'Crunchos Cheese Blast', false],
    ]);
    assert.equal(matches[0].quantity, '200 g');
    assert.equal(engine.check(matches[1].item!, orthodox, { date: day('2027-03-17') }).verdict, 'not_compliant');
    assert.deepEqual(productsFromSearch({}), []);
  });
});

describe('ingredient database', () => {
  it('has no alias that maps to two ingredients', () => {
    assert.doesNotThrow(() => new ComplianceEngine(INGREDIENTS));
  });
});

describe('imported datasets', () => {
  const index = new IngredientIndex(INGREDIENTS);

  it('records a known source for every ingredient', () => {
    const known = new Set(DATASETS.map((d) => d.id));
    for (const ing of INGREDIENTS) {
      assert.ok(ing.sources?.length, `${ing.id} has no source`);
      for (const s of ing.sources) assert.ok(known.has(s.split(':')[0]), `${ing.id}: unknown dataset in ${s}`);
    }
    assert.ok(IMPORTED_INGREDIENTS.length > 3000, 'imports thousands of ingredients');
  });

  it('never takes a seed ingredient\'s spelling away from it', () => {
    for (const seed of SEED_INGREDIENTS) {
      for (const name of [seed.name, ...(seed.aliases ?? [])]) {
        assert.equal(index.resolve(name)?.id, seed.id, `"${name}" should still resolve to ${seed.id}`);
      }
    }
  });

  it('adds spellings to seed ingredients from datasets that agree', () => {
    assert.equal(index.resolve('curly kale')?.id, 'kale');
    assert.ok(INGREDIENTS.find((i) => i.id === 'kale')?.sources?.includes('usda-sr28:11233'));
  });

  it('judges imported foods by their mapped categories', () => {
    assert.equal(check('Chorizo, onions', lent, '2027-02-19').verdict, 'not_compliant');
    assert.equal(check('Duck fat, potatoes', lent, '2027-02-19').verdict, 'uncertain', 'meat-derived fat is a caution');
    assert.equal(check('Cream cheese, chives', orthodox, '2027-03-17').verdict, 'not_compliant');
    assert.equal(check('Cuttlefish, garlic', orthodox, '2027-03-17').verdict, 'compliant');
    assert.equal(check('Buttermilk', danielFast).verdict, 'not_compliant');
    assert.equal(check('Mango, papaya, kumquat', danielFast).verdict, 'compliant');
    assert.equal(check('Wholemeal spelt flour, water', danielFast).verdict, 'compliant');
    assert.equal(check('Semolina, water', danielFast).verdict, 'not_compliant');
  });

  it('keeps doubtful imports uncertain instead of guessing', () => {
    assert.equal(check('Basmati rice', danielFast).verdict, 'uncertain', 'whole or refined is not stated');
    assert.equal(check('Cochineal', whole30).verdict, 'uncertain', 'colour from insects');
    assert.equal(check('E 631', lent, '2027-02-19').verdict, 'uncertain', 'may be made from meat or fish');
    assert.equal(check('Pear nectar', danielFast).verdict, 'uncertain', 'nectar usually has added sugar');
    assert.equal(check('Chocolate', danielFast).verdict, 'uncertain', 'compound ingredients are not imported');
  });

  it('reads E-numbers however they are printed', () => {
    for (const label of ['E330', 'E 330', 'e-330']) assert.equal(index.resolve(label)?.id, 'citric-acid', label);
    assert.equal(index.resolve('E500(ii)')?.id, 'baking-soda');
  });
});

describe('real-label coverage', () => {
  const index = new IngredientIndex(INGREDIENTS);
  const ids = (text: string, rs: RuleSet = whole30, date?: string) => check(text, rs, date).findings.map((f) => f.ingredient?.id ?? `?${f.label}`);

  it('reads British spellings as US ones', () => {
    assert.equal(index.resolve('Natural flavouring')?.id, 'natural-flavors');
    assert.equal(index.resolve('chicory root fibre')?.id, 'inulin');
    assert.equal(index.resolve('maize starch')?.id, index.resolve('corn starch')?.id);
    assert.equal(index.resolve('yoghurt')?.id, index.resolve('yogurt')?.id);
  });

  it('keeps a decimal comma inside its number', () => {
    assert.deepEqual(ids('Water, almonds (2,3%), sea salt'), ['water', 'almond', 'salt']);
  });

  it('reads a list under an oil heading as oils', () => {
    assert.deepEqual(ids('Vegetable oils (sunflower, rapeseed in varying proportions)'), ['vegetable-oil', 'sunflower-oil', 'canola-oil']);
    assert.deepEqual(ids('Canola, sunflower and/or soybean oil'), ['canola-oil', 'sunflower-oil', 'soybean-oil']);
    assert.equal(check('Olive and sunflower oil, salt', orthodox, '2027-03-17').verdict, 'not_compliant', 'olive oil, not olives');
    assert.deepEqual(ids('Lecithin (sunflower)'), ['sunflower-lecithin']);
  });

  it('judges a declared source when the ingredient itself says nothing about it', () => {
    assert.equal(check('Lactic ferments (milk), salt', danielFast).verdict, 'not_compliant');
    assert.equal(check('Ghee (milk)', whole30).verdict, 'compliant', 'ghee already accounts for the milk');
  });

  it('asks a vague ingredient only the questions the diet cares about', () => {
    assert.equal(check('Rye flour, water, salt', danielFast).verdict, 'uncertain', 'whole or refined matters here');
    assert.equal(check('Rye flour, water, salt', orthodox, '2027-03-20').verdict, 'compliant', 'it does not matter on a fast day');
    assert.equal(check('Enzymes, salt', danielFast).verdict, 'uncertain', 'could be animal-derived');
    assert.equal(check('Enzymes, salt', whole30).verdict, 'uncertain', 'a few enzymes come from milk');
    assert.equal(check('Enzymes, salt', orthodox, '2027-03-20').verdict, 'uncertain', 'animal origin matters on a fast day');
  });

  it('lets a listed sub-ingredient settle a vague heading', () => {
    assert.deepEqual(ids('Starch (corn)'), ['cornstarch']);
    assert.equal(check('Natural flavors (vanilla)', danielFast).verdict, 'uncertain', 'the list names the taste, not the carrier');
  });

  it('drops notes that are not ingredients', () => {
    assert.deepEqual(ids('Soy lecithin (an emulsifier), pork (British or Irish), tomatoes (dried)'), ['soy-lecithin', 'pork', 'tomato']);
    assert.deepEqual(ids('Soy lecithin, an emulsifier'), ['soy-lecithin']);
    assert.deepEqual(ids('Ascorbic acid added as a dough conditioner, potassium sorbate preservative'), ['ascorbic-acid', 'potassium-sorbate']);
    assert.deepEqual(ids("Pasteurized cow's milk of France, salt"), ['milk', 'salt']);
  });

  it('reads vitamins however they are listed', () => {
    assert.deepEqual(ids('Vitamins (B2, D, E), vit. B6, vitamin B 12, thiamin (B1)', danielFast), [
      'vitamins', 'riboflavin', 'vitamin-d', 'vitamin-e', 'vitamin-b6', 'vitamin-b12', 'thiamine-mononitrate', 'thiamine-mononitrate',
    ]);
    assert.deepEqual(ids('Vitamin B5 (as calcium D-pantothenate)'), ['pantothenic-acid', 'pantothenic-acid']);
  });

  it('splits joined names only when every part is known', () => {
    assert.deepEqual(ids('Yellow 5 & 6'), ['yellow-5', 'yellow-6']);
    assert.deepEqual(ids('Spices including paprika'), ['spices', 'paprika']);
    assert.deepEqual(ids('Sugar glucose fructose'), ['sugar', 'glucose-fructose']);
    assert.deepEqual(ids('Apple butter'), ['?Apple butter'], 'food words are never recombined');
  });

  it('decodes HTML entities in label text', () => {
    assert.deepEqual(ids('FD&amp;C Red 40, FD & C Yellow 5'), ['red-40', 'yellow-5']);
  });

  it('classifies common food additives the import left open', () => {
    assert.equal(check('Lactic acid, malic acid, magnesium oxide', whole30).verdict, 'compliant');
    assert.equal(check('Lactic acid', danielFast).verdict, 'uncertain', 'still a preservative caution on the Daniel Fast');
  });

  it('resolves every curated spelling to its own entry', () => {
    for (const ing of CURATED_INGREDIENTS) {
      for (const name of [ing.name, ...(ing.aliases ?? [])]) assert.equal(index.resolve(name)?.id, ing.id, `"${name}" should resolve to ${ing.id}`);
    }
  });
});
