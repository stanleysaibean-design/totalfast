import type { RuleSet } from '../types.ts';

export const danielFast: RuleSet = {
  id: 'daniel-fast',
  name: 'the Daniel Fast',
  version: '0.1.0',
  review: {
    status: 'draft',
    source:
      'Common modern Daniel Fast guidelines (Daniel 1:12 and 10:2-3): plant foods only, water as the only drink, no sweeteners, leavening, or processed additives. Needs pastoral review before launch.',
  },
  rules: [
    { categories: ['meat', 'meat-derived', 'animal-fat', 'gelatin', 'fish', 'shellfish'], effect: 'deny', reason: 'The Daniel Fast excludes all meat and animal products.' },
    { categories: ['dairy', 'clarified-butter'], effect: 'deny', reason: 'The Daniel Fast excludes dairy.' },
    { categories: ['egg'], effect: 'deny', reason: 'The Daniel Fast excludes eggs.' },
    { categories: ['added-sugar', 'artificial-sweetener', 'sugar-alcohol', 'honey'], effect: 'deny', reason: 'The Daniel Fast excludes every sweetener, including honey, syrups, and sugar substitutes.' },
    { categories: ['yeast', 'chemical-leavening'], effect: 'deny', reason: 'The Daniel Fast excludes leavening agents such as yeast and baking powder.' },
    { categories: ['refined-grain'], effect: 'deny', reason: 'The Daniel Fast allows whole grains only, not refined grains.' },
    { categories: ['solid-fat', 'hydrogenated-fat'], effect: 'deny', reason: 'The Daniel Fast excludes solid fats such as shortening and margarine.' },
    { categories: ['alcohol'], effect: 'deny', reason: 'The Daniel Fast excludes alcohol.' },
    { categories: ['caffeine'], effect: 'deny', reason: 'The Daniel Fast allows water only as a drink, so coffee and tea are out.' },
    { categories: ['artificial-color', 'artificial-flavor'], effect: 'deny', reason: 'The Daniel Fast excludes artificial additives.' },
    { categories: ['preservative', 'thickener', 'emulsifier'], effect: 'caution', reason: 'Many Daniel Fast guides ask you to avoid chemical additives and preservatives; decide whether this one fits your fast.' },
    // Specific exceptions and judgment calls.
    { ingredients: ['nutritional-yeast'], effect: 'caution', reason: 'Nutritional yeast is not a leavening agent, and most Daniel Fast guides allow it, but some exclude all yeast.' },
    { ingredients: ['yeast-extract'], effect: 'caution', reason: 'Yeast extract is a flavoring, not a leavening agent; Daniel Fast guides differ on it.' },
    { ingredients: ['palm-oil'], effect: 'caution', reason: 'Palm oil is a plant oil but semi-solid; some Daniel Fast guides treat it as a solid fat.' },
    { ingredients: ['vanilla-extract'], effect: 'caution', reason: 'Vanilla extract contains alcohol; many Daniel Fast guides allow it in small cooking amounts.' },
    { ingredients: ['ascorbic-acid', 'vitamin-e', 'citric-acid'], effect: 'allow', reason: 'A vitamin or fruit acid commonly accepted on the Daniel Fast.' },
  ],
  disclaimer:
    'The Daniel Fast is a spiritual practice and traditions vary. Total Fast follows common modern guidelines; your church or pastor may set different rules.',
};
