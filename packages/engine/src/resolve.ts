import type { Ingredient } from './types.ts';

/**
 * Resolves label text to canonical ingredients by exact name or alias, after
 * light normalization. Deliberately no fuzzy or substring matching: "cream of
 * tartar" must not become "cream". Anything unresolved is reported as
 * uncertain so the review layer can add it.
 */
export class IngredientIndex {
  private byName = new Map<string, Ingredient>();

  constructor(ingredients: Ingredient[]) {
    for (const ing of ingredients) {
      for (const n of [ing.id.replace(/-/g, ' '), ing.name, ...(ing.aliases ?? [])]) {
        const key = normalize(n);
        const existing = this.byName.get(key);
        if (existing && existing.id !== ing.id) {
          throw new Error(`Alias "${n}" maps to both ${existing.id} and ${ing.id}`);
        }
        this.byName.set(key, ing);
      }
    }
  }

  resolve(label: string): Ingredient | undefined {
    const base = normalize(label);
    for (const candidate of variants(base)) {
      const hit = this.byName.get(candidate);
      if (hit) return hit;
    }
    return undefined;
  }
}

/** Qualifiers that don't change what an ingredient is. */
const QUALIFIERS = [
  'organic', 'certified organic', 'non gmo', 'raw', 'fresh', 'frozen', 'dried', 'dry', 'roasted', 'toasted',
  'chopped', 'diced', 'sliced', 'minced', 'ground', 'unsalted', 'salted', 'pure', 'filtered', 'unrefined',
  'cold pressed', 'expeller pressed', 'unbleached', 'freshly', 'finely', 'cooked', 'canned', 'rinsed', 'drained',
];
const QUALIFIER_RE = new RegExp(`\\b(${QUALIFIERS.join('|')})\\b`, 'g');

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9&'.\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function* variants(s: string): Generator<string> {
  yield s;
  const stripped = s.replace(QUALIFIER_RE, ' ').replace(/\s+/g, ' ').trim();
  if (stripped && stripped !== s) yield stripped;
  for (const v of [s, stripped]) {
    if (v.endsWith('ies')) yield v.slice(0, -3) + 'y';
    if (v.endsWith('es')) yield v.slice(0, -2);
    if (v.endsWith('s')) yield v.slice(0, -1);
  }
}

const UNITS =
  'cups?|c|tablespoons?|tbsps?|tbs|teaspoons?|tsps?|ounces?|oz|pounds?|lbs?|grams?|g|kg|ml|l|liters?|litres?|pinch(es)?|dash(es)?|cloves?|cans?|jars?|handfuls?|bunch(es)?|heads?|stalks?|slices?|pieces?|packages?|pkgs?|sprigs?|large|medium|small';

/**
 * Turns a recipe line into an ingredient name:
 * "2 cups rolled oats, divided" -> "rolled oats".
 */
export function recipeLineToIngredient(line: string): string {
  return line
    .replace(/\(.*?\)/g, ' ')
    .replace(/^[\s\d¼½¾⅓⅔⅛./-]+/, '')
    .replace(new RegExp(`^(${UNITS})\\.?\\s+(of\\s+)?`, 'i'), '')
    .replace(/,.*$/, '')
    .replace(/\b(to taste|optional|for serving|for garnish)\b/gi, '')
    .trim();
}
