import type { Ingredient } from '../types.ts';
import { AMBIGUITY_SCOPE, CURATED_ALIASES, CURATED_INGREDIENTS, RECLASSIFIED } from './curated.ts';
import { IMPORTED_INGREDIENTS as RAW_IMPORTED, SEED_ADDITIONS } from './imported.ts';
import { SEED_INGREDIENTS } from './ingredients.ts';

export { DATASETS, type Dataset } from './datasets.ts';
export { CURATED_INGREDIENTS, SEED_INGREDIENTS };

const withAliases = (ing: Ingredient, extra: string[] | undefined): Ingredient =>
  extra?.length ? { ...ing, aliases: [...(ing.aliases ?? []), ...extra] } : ing;

/** Imported entries with curated corrections and scoped ambiguity applied. */
export const IMPORTED_INGREDIENTS: Ingredient[] = RAW_IMPORTED.map((ing) => {
  let out = ing;
  const fix = RECLASSIFIED[ing.id];
  if (fix) {
    out = { ...out, ...(fix.categories ? { categories: fix.categories } : {}), sources: [...(out.sources ?? []), 'curated:reclassified'] };
    if (fix.ambiguous === null) {
      const { ambiguous: _a, ambiguousFor: _f, ...rest } = out;
      out = rest;
    } else if (fix.ambiguous) out = { ...out, ambiguous: fix.ambiguous, ambiguousFor: fix.ambiguousFor };
  }
  if (out.ambiguous && !out.ambiguousFor && AMBIGUITY_SCOPE[out.ambiguous]) out = { ...out, ambiguousFor: AMBIGUITY_SCOPE[out.ambiguous] };
  return withAliases(out, CURATED_ALIASES[ing.id]);
});

/**
 * The full ingredient database: hand-curated seed entries (with extra label
 * spellings from datasets that agree with them), then curated coverage
 * entries, then everything imported from public datasets. Every entry's
 * `sources` says where it came from.
 */
export const INGREDIENTS: Ingredient[] = [
  ...SEED_INGREDIENTS.map((s) => {
    const extra = SEED_ADDITIONS[s.id];
    return withAliases(
      { ...s, aliases: [...(s.aliases ?? []), ...(extra?.aliases ?? [])], sources: ['seed', ...(extra?.sources ?? [])] },
      CURATED_ALIASES[s.id],
    );
  }),
  ...CURATED_INGREDIENTS.map((c) => withAliases(c, CURATED_ALIASES[c.id])),
  ...IMPORTED_INGREDIENTS,
];

for (const id of [...Object.keys(CURATED_ALIASES), ...Object.keys(RECLASSIFIED)]) {
  if (!INGREDIENTS.some((i) => i.id === id)) throw new Error(`curated.ts names "${id}", which is not in the database`);
}
