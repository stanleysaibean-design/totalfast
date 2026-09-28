import type { RuleSet } from '../types.ts';

export const whole30: RuleSet = {
  id: 'whole30',
  name: 'Whole30',
  version: '0.1.0',
  review: {
    status: 'draft',
    source:
      'Whole30 program rules as publicly described (2023 update): no added sugar or sweeteners, alcohol, grains, legumes (with exceptions), or dairy (except ghee). Exceptions marked below need confirmation against the current official rules before launch.',
  },
  rules: [
    { categories: ['added-sugar', 'artificial-sweetener', 'sugar-alcohol', 'honey'], effect: 'deny', reason: 'Whole30 excludes added sugar and sweeteners, real or artificial.' },
    { categories: ['alcohol'], effect: 'deny', reason: 'Whole30 excludes alcohol in any form, including in cooking.' },
    { categories: ['grain', 'pseudo-grain'], effect: 'deny', reason: 'Whole30 excludes grains and grain-like seeds such as quinoa.' },
    { categories: ['legume', 'soy', 'peanut'], effect: 'deny', reason: 'Whole30 excludes legumes, including soy and peanuts.' },
    { categories: ['dairy'], effect: 'deny', reason: 'Whole30 excludes dairy.' },
    // Exceptions (allow wins over deny at the same level).
    { categories: ['green-legume'], effect: 'allow', reason: 'Whole30 allows green beans and peas.' },
    { categories: ['clarified-butter'], effect: 'allow', reason: 'Whole30 allows ghee and clarified butter.' },
    { categories: ['fruit-juice'], effect: 'allow', reason: 'Whole30 allows fruit juice as an ingredient or sweetener in a recipe.' },
    { ingredients: ['vanilla-extract'], effect: 'allow', reason: 'Whole30 allows vanilla extract.' },
    { ingredients: ['soy-lecithin'], effect: 'allow', reason: 'Whole30 allows soy lecithin as an additive.' },
    { ingredients: ['soybean-oil'], effect: 'caution', reason: 'Soybean oil is legume-derived; check the current Whole30 guidance on legume oils.' },
  ],
  disclaimer:
    'Whole30 also asks you not to recreate baked goods or treats from compliant ingredients. An ingredient check cannot judge that part.',
};
