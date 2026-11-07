import type { Ingredient } from '../types.ts';
import { IMPORTED_INGREDIENTS, SEED_ADDITIONS } from './imported.ts';
import { SEED_INGREDIENTS } from './ingredients.ts';

export { DATASETS, type Dataset } from './datasets.ts';
export { IMPORTED_INGREDIENTS, SEED_INGREDIENTS };

/**
 * The full ingredient database: hand-curated seed entries (with extra label
 * spellings from datasets that agree with them), then everything imported
 * from public datasets. Every entry's `sources` says where it came from.
 */
export const INGREDIENTS: Ingredient[] = [
  ...SEED_INGREDIENTS.map((s) => {
    const extra = SEED_ADDITIONS[s.id];
    return {
      ...s,
      aliases: [...(s.aliases ?? []), ...(extra?.aliases ?? [])],
      sources: ['seed', ...(extra?.sources ?? [])],
    };
  }),
  ...IMPORTED_INGREDIENTS,
];
