/**
 * Try the engine from a terminal:
 *   npm run check -- whole30 "Water, sugar, apple juice concentrate, pectin"
 *   npm run check -- lent-catholic "Chicken, salt" 2027-02-12
 */
import { ComplianceEngine, INGREDIENTS, RULE_SETS } from './index.ts';

const [dietId, text, date] = process.argv.slice(2);
const ruleSet = RULE_SETS[dietId ?? ''];
if (!ruleSet || !text) {
  console.error(`usage: check <${Object.keys(RULE_SETS).join('|')}> "<ingredients>" [YYYY-MM-DD]`);
  process.exit(1);
}
const result = new ComplianceEngine(INGREDIENTS).check(
  { name: 'cli', ingredientsText: text },
  ruleSet,
  { date: date ? new Date(`${date}T12:00:00`) : undefined },
);
const mark = { compliant: 'OK ', not_compliant: 'NO ', uncertain: '?? ' } as const;
console.log(`${result.verdict.toUpperCase()}  ${result.summary}\n`);
for (const f of result.findings) console.log(`  ${mark[f.verdict]} ${f.label}${f.ingredient ? ` -> ${f.ingredient.id}` : ''}: ${f.reason}`);
