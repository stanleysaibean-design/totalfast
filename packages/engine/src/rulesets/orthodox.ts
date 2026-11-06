import type { RuleSet } from '../types.ts';

// Named days from the Orthodox calendars in calendar.ts. Each level allows
// what the stricter ones do, so a food is denied on its own level and every
// stricter one.
const STRICT = ['strict-fast'];
const NO_FISH = [...STRICT, 'wine-and-oil'];
const NO_DAIRY = [...NO_FISH, 'fish-allowed'];
const NO_MEAT = [...NO_DAIRY, 'dairy-allowed'];

export const orthodox: RuleSet = {
  id: 'orthodox',
  name: 'Orthodox fasting',
  version: '0.1.0',
  review: {
    status: 'draft',
    source:
      'Common Orthodox typikon guidance as published in English-language parish fasting calendars: Wednesdays and Fridays, Great Lent, the Apostles\', Dormition and Nativity fasts, with wine, oil and fish allowed on set days, and invertebrate seafood allowed on all fast days. Parish practice differs; needs review by a priest or parish reviewer before launch.',
  },
  calendar: 'orthodox-revised-julian',
  calendarChoices: [
    {
      calendar: 'orthodox-revised-julian',
      name: 'New Calendar',
      description: 'Revised Julian. For example Greek, Antiochian, Romanian, Bulgarian and OCA parishes.',
    },
    {
      calendar: 'orthodox-julian',
      name: 'Old Calendar',
      description: 'Julian, 13 days later for fixed feasts. For example Russian, Serbian, Georgian and Jerusalem parishes.',
    },
  ],
  rules: [
    { categories: ['meat', 'meat-derived', 'animal-fat', 'gelatin'], effect: 'deny', when: { days: NO_MEAT }, reason: 'Meat and anything made from it are not eaten on Orthodox fast days.' },
    { categories: ['dairy', 'clarified-butter'], effect: 'deny', when: { days: NO_DAIRY }, reason: 'Dairy is not eaten on this fast day.' },
    { categories: ['egg'], effect: 'deny', when: { days: NO_DAIRY }, reason: 'Eggs are not eaten on this fast day.' },
    { categories: ['fish'], effect: 'deny', when: { days: NO_FISH }, reason: 'Fish is not allowed today; it is allowed only on certain feasts and lighter fast days.' },
    { categories: ['alcohol'], effect: 'deny', when: { days: STRICT }, reason: 'Wine and other alcohol are not taken on a strict fast day.' },
    { ingredients: ['olive-oil'], effect: 'deny', when: { days: STRICT }, reason: 'Olive oil is not used on a strict fast day.' },
    { categories: ['plant-oil'], effect: 'caution', when: { days: STRICT }, reason: 'Many parishes avoid all cooking oil on strict fast days; others avoid only olive oil. Ask your priest.' },
    // Exceptions for particular days.
    { categories: ['alcohol'], effect: 'allow', when: { days: ['wine-allowed'] }, reason: 'Wine is allowed on Holy Saturday, though oil is not.' },
    { ingredients: ['fish-roe'], effect: 'allow', when: { days: ['lazarus-saturday'] }, reason: 'Fish roe is allowed on Lazarus Saturday.' },
    { ingredients: ['vanilla-extract'], effect: 'caution', when: { days: STRICT }, reason: 'Vanilla extract contains alcohol; most parishes allow it in small cooking amounts.' },
  ],
  disclaimer:
    'Orthodox fasting is kept with the guidance of your priest, who may give a different rule for health, age, pregnancy or travel. On Holy Friday many keep a total fast. Shellfish such as shrimp and squid are allowed on fast days. An ingredient check cannot judge how much you eat.',
};
