import type { RuleSet } from '../types.ts';

const ABSTINENCE_DAYS = ['ash-wednesday', 'lent-friday'];

export const lent: RuleSet = {
  id: 'lent-catholic',
  name: 'Lent (Catholic abstinence)',
  version: '0.1.0',
  review: {
    status: 'draft',
    source:
      'Code of Canon Law 1250-1251 and USCCB guidance: abstain from meat on Ash Wednesday and the Fridays of Lent. Fish, eggs, and dairy are allowed. Needs review by a priest or diocesan source.',
  },
  calendar: 'western-lent',
  rules: [
    { categories: ['meat'], effect: 'deny', when: { days: ABSTINENCE_DAYS }, reason: 'Catholics abstain from meat on Ash Wednesday and the Fridays of Lent.' },
    { categories: ['meat-derived'], effect: 'caution', when: { days: ABSTINENCE_DAYS }, reason: 'Broths, gravies, and fats made from meat are not strictly forbidden on days of abstinence, but many choose to avoid them.' },
  ],
  disclaimer:
    'Fasting (one full meal and two smaller ones) on Ash Wednesday and Good Friday is about amount, which an ingredient check cannot judge. Rules can differ by country and rite, and age and health exemptions apply.',
};
