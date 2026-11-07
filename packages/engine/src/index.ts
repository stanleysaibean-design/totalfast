export * from './types.ts';
export { ComplianceEngine, judgeIngredient, type CheckOptions } from './engine.ts';
export { parseIngredients, parseLabel, flatten, type ParsedIngredient, type ParsedLabel } from './parse.ts';
export { IngredientIndex, normalize, recipeLineToIngredient } from './resolve.ts';
export {
  CALENDARS, FAST_LEVEL_LABEL, SEASON_NAMES, fastingSeasons, orthodoxDay, orthodoxPascha, westernEaster, westernLent,
  type ChurchCalendarStyle, type FastLevel, type FastingSeason, type OrthodoxDay,
} from './calendar.ts';
export { CURATED_INGREDIENTS, DATASETS, IMPORTED_INGREDIENTS, INGREDIENTS, SEED_INGREDIENTS, type Dataset } from './data/index.ts';
export { RULE_SETS, danielFast, whole30, lent, orthodox } from './rulesets/index.ts';
export { fromOpenFoodFacts, type OffProductResponse } from './openfoodfacts.ts';
