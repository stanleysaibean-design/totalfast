import type { RuleSet } from '../types.ts';
import { danielFast } from './daniel-fast.ts';
import { lent } from './lent.ts';
import { whole30 } from './whole30.ts';

export { danielFast, lent, whole30 };

export const RULE_SETS: Record<string, RuleSet> = {
  [danielFast.id]: danielFast,
  [whole30.id]: whole30,
  [lent.id]: lent,
};
