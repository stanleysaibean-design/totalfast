/**
 * Coverage benchmark: runs real product labels through the engine and reports
 * how often ingredients go unrecognized and products come back uncertain.
 *
 *   npm run coverage                     # the committed sample (sample.tsv)
 *   npm run coverage -- path/to/labels.tsv --top 500 --csv out.csv
 *
 * Input is tab-separated with a header containing at least `code` and
 * `ingredients_text` (optionally `group`). sample.tsv holds 2,600 labels from
 * Open Food Facts (ODbL); see README.md in this folder for how it was drawn.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ComplianceEngine, INGREDIENTS, RULE_SETS, normalize, type Verdict } from '../../src/index.ts';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const topN = Number(flag('--top') ?? 40);
const csvOut = flag('--csv');
const jsonOut = flag('--json');
const input = args[0] ?? join(dirname(fileURLToPath(import.meta.url)), 'sample.tsv');

const rows = readFileSync(input, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => l.split('\t'));
const head = rows.shift()!;
const col = (k: string) => head.indexOf(k);
const products = rows.map((r) => ({ code: r[col('code')], group: col('group') >= 0 ? r[col('group')] : '', text: r[col('ingredients_text')] ?? '' }));

// Orthodox is checked on two kinds of fast day (New Calendar, Great Lent 2027).
const DIETS = [
  { key: 'Daniel Fast', id: 'daniel-fast' },
  { key: 'Whole30', id: 'whole30' },
  { key: 'Orthodox strict day', id: 'orthodox', date: '2027-03-17' },
  { key: 'Orthodox wine-and-oil day', id: 'orthodox', date: '2027-03-20' },
] as const;

const engine = new ComplianceEngine(INGREDIENTS);
type Tally = Record<Verdict, number> & { uncertainUnknown: number };
const tally: Record<string, Tally> = Object.fromEntries(
  DIETS.map((d) => [d.key, { compliant: 0, not_compliant: 0, uncertain: 0, uncertainUnknown: 0 }]),
);
const unknown = new Map<string, { products: number; example: string }>();
let n = 0, mentions = 0, unknownMentions = 0, fullyKnown = 0;

for (const p of products) {
  const results = DIETS.map((d) =>
    engine.check({ name: p.code, ingredientsText: p.text }, RULE_SETS[d.id], { date: 'date' in d ? new Date(`${d.date}T12:00:00`) : undefined }),
  );
  const findings = results[0].findings.filter((f) => !f.label.endsWith('(label says "Contains")'));
  if (!findings.length) continue;
  n++;
  mentions += findings.length;
  const missing = new Map<string, string>();
  for (const f of findings) if (!f.ingredient) { unknownMentions++; missing.set(normalize(f.label), f.label); }
  if (!missing.size) fullyKnown++;
  for (const [key, example] of missing) {
    const e = unknown.get(key) ?? { products: 0, example };
    e.products++;
    unknown.set(key, e);
  }
  DIETS.forEach((d, i) => {
    const r = results[i];
    tally[d.key][r.verdict]++;
    if (r.verdict === 'uncertain' && r.triggers.some((t) => !t.ingredient)) tally[d.key].uncertainUnknown++;
  });
}

const pct = (a: number, b: number) => `${b ? ((100 * a) / b).toFixed(1) : '0.0'}%`;
const ranked = [...unknown.entries()].sort((a, b) => b[1].products - a[1].products || a[0].localeCompare(b[0]));
console.log(`${n} products, ${mentions} ingredient mentions`);
console.log(`unrecognized mentions: ${unknownMentions} (${pct(unknownMentions, mentions)})`);
console.log(`products with every ingredient recognized: ${fullyKnown} (${pct(fullyKnown, n)})`);
console.log(`distinct unrecognized names: ${unknown.size}, on one product only: ${ranked.filter(([, v]) => v.products === 1).length}\n`);
console.log('diet                        compliant  not      uncertain  (unknown)  uncertain of not-ruled-out');
for (const d of DIETS) {
  const t = tally[d.key];
  console.log(
    `${d.key.padEnd(28)}${pct(t.compliant, n).padStart(9)}${pct(t.not_compliant, n).padStart(7)}${pct(t.uncertain, n).padStart(11)}${pct(t.uncertainUnknown, n).padStart(11)}${pct(t.uncertain, n - t.not_compliant).padStart(14)}`,
  );
}
console.log(`\ntop ${topN} unrecognized (products):`);
for (const [key, v] of ranked.slice(0, topN)) console.log(`${String(v.products).padStart(6)}  ${key}`);
if (csvOut) writeFileSync(csvOut, ['label,products', ...ranked.map(([k, v]) => `"${k.replace(/"/g, '""')}",${v.products}`)].join('\n') + '\n');
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ n, mentions, unknownMentions, fullyKnown, tally }, null, 1));
