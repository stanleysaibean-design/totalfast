export * from './types.ts';
export { ComplianceEngine, type CheckOptions } from './engine.ts';
export { parseIngredients, flatten, type ParsedIngredient } from './parse.ts';
export { IngredientIndex, normalize, recipeLineToIngredient } from './resolve.ts';
export { CALENDARS, westernEaster, westernLent } from './calendar.ts';
export { INGREDIENTS } from './data/ingredients.ts';
export { RULE_SETS, danielFast, whole30, lent } from './rulesets/index.ts';
export { fromOpenFoodFacts, type OffProductResponse } from './openfoodfacts.ts';
