/**
 * Builds src/data/imported.ts from public food datasets:
 *
 * - Open Food Facts ingredients taxonomy (ODbL 1.0 / DbCL 1.0)
 * - Open Food Facts additives taxonomy, i.e. E-numbers (ODbL 1.0 / DbCL 1.0)
 * - USDA National Nutrient Database for Standard Reference, Legacy (SR28),
 *   public domain
 *
 * Run: npm run import-data --workspace @total-fast/engine
 *
 * Safety rules, in order of precedence:
 * 1. Hand-curated seed entries win. An imported entry that names a seed
 *    ingredient is merged in (adding spellings) only if it gets the same
 *    verdict as the seed entry under every rule set and calendar day; if not,
 *    it is dropped and listed in the report.
 * 2. A label spelling claimed by two imported entries that disagree is
 *    dropped from both, so it stays "not in the database" (uncertain).
 * 3. Anything we can't place confidently is either not imported or marked
 *    `ambiguous`, which makes it uncertain wherever no rule decides it.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { judgeIngredient } from '../../src/engine.ts';
import { IngredientIndex, normalize } from '../../src/resolve.ts';
import { RULE_SETS } from '../../src/rulesets/index.ts';
import { SEED_INGREDIENTS } from '../../src/data/ingredients.ts';
import type { Category, Ingredient, Rule } from '../../src/types.ts';
import { inherited, parseTaxonomy, type Taxonomy } from './off-taxonomy.ts';
import {
  ALCOHOL_WORDS, ANIMAL_FAT_WORDS, GRAIN_AMBIGUOUS, GELATIN_WORDS, MEAT_DERIVED_WORDS, OFF_CLASS_MAP, PREPARED_AMBIGUOUS, PREPARED_WORDS,
  REFINED_GRAIN_WORDS, SUGAR_WORDS, WHOLE_GRAIN_WORDS, type ClassMapping,
} from './off-map.ts';
import { FILES, load, OFF_COMMIT, USDA_MIRROR_COMMIT } from './sources.ts';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../src/data/imported.ts');
const REPORT = join(dirname(fileURLToPath(import.meta.url)), '../../src/data/IMPORT_REPORT.md');

/** A candidate entry before de-duplication. */
interface Candidate {
  name: string;
  aliases: string[];
  categories: Category[];
  ambiguous?: string;
  source: string;
}

const ANIMAL: Category[] = ['meat', 'red-meat', 'poultry', 'meat-derived', 'fish', 'shellfish', 'dairy', 'clarified-butter', 'egg', 'animal-fat', 'gelatin', 'honey'];
const FLESH: Category[] = ['meat', 'red-meat', 'poultry', 'meat-derived', 'fish', 'shellfish', 'animal-fat', 'gelatin'];
const ANIMAL_AMBIGUOUS = 'This can be made from animal or plant sources; the label does not say which.';
const ANIMAL_NO = 'This is made from an animal source that Total Fast has not classified.';
/**
 * Open Food Facts marks some of these non-vegan for processing aids (bone char
 * in sugar, fining agents in wine, animal rennet in cheese). The fasting
 * traditions Total Fast covers judge the food itself, not processing aids, so
 * those flags are not used for these categories.
 */
const PROCESSING_AID_EXEMPT: Category[] = ['added-sugar', 'alcohol', 'dairy', 'vinegar', 'fruit-juice'];

/** Cross-checks categories against Open Food Facts' vegan / vegetarian flags. */
function animalCheck(cats: Set<Category>, vegan?: string, vegetarian?: string): string | undefined {
  if (PROCESSING_AID_EXEMPT.some((c) => cats.has(c))) return undefined;
  const hasAnimal = ANIMAL.some((c) => cats.has(c));
  const hasFlesh = FLESH.some((c) => cats.has(c));
  if (vegetarian === 'no' && !hasFlesh) return ANIMAL_NO;
  if (vegan === 'no' && !hasAnimal) return ANIMAL_NO;
  if ((vegetarian === 'maybe' && !hasFlesh) || (vegan === 'maybe' && !hasAnimal)) return ANIMAL_AMBIGUOUS;
  return undefined;
}

const report: string[] = [];
const note = (s: string) => report.push(s);

// ---------------------------------------------------------------------------
// Open Food Facts ingredients

function englishNames(tax: Taxonomy, id: string): string[] {
  const e = tax.entries.get(id)!;
  return [...(e.names.en ?? []), ...(e.names.xx ?? [])];
}

function offIngredientCandidates(tax: Taxonomy): { candidates: Candidate[]; unmappedRoots: Map<string, number> } {
  for (const id of Object.keys(OFF_CLASS_MAP)) {
    if (!tax.entries.has(id)) note(`- Map key \`${id}\` is not in the Open Food Facts taxonomy (renamed upstream?).`);
  }
  const memo = new Map<string, ClassMapping[] | 'skip'>();
  const resolveClass = (id: string, stack = new Set<string>()): ClassMapping[] | 'skip' => {
    if (memo.has(id)) return memo.get(id)!;
    if (stack.has(id)) return [];
    stack.add(id);
    let out: ClassMapping[] | 'skip';
    const own = OFF_CLASS_MAP[id];
    if (own?.skip) out = 'skip';
    else if (own) out = [own];
    else {
      out = [];
      for (const p of tax.entries.get(id)?.parents ?? []) {
        const r = resolveClass(p, stack);
        if (r === 'skip') {
          out = 'skip';
          break;
        }
        out.push(...r);
      }
    }
    stack.delete(id);
    memo.set(id, out);
    return out;
  };

  const candidates: Candidate[] = [];
  const unmappedRoots = new Map<string, number>();
  for (const e of tax.entries.values()) {
    const names = englishNames(tax, e.id);
    if (!names.length) continue;
    const mapped = resolveClass(e.id);
    if (mapped === 'skip') continue;
    if (mapped.length === 0) {
      let root = e.id;
      while (tax.entries.get(root)?.parents[0]) root = tax.entries.get(root)!.parents[0];
      unmappedRoots.set(root, (unmappedRoots.get(root) ?? 0) + 1);
      continue;
    }
    let cats = new Set<Category>(mapped.flatMap((m) => m.categories ?? []));
    // A class doubt (e.g. "which fat?") is settled when another parent says
    // what the item is ("milk fat" is under both fat and dairy).
    let ambiguous = mapped.every((m) => m.ambiguous) ? mapped[0].ambiguous : undefined;
    const text = names.map((n) => normalize(n)).join(' | ');
    const name = normalize(names[0]);

    // Meat by-products are meat-derived (Lent treats them more leniently).
    if ((cats.has('meat') || cats.has('poultry')) && (MEAT_DERIVED_WORDS.test(name) || ANIMAL_FAT_WORDS.test(name) || GELATIN_WORDS.test(name))) {
      cats.delete('meat');
      cats.delete('poultry');
      cats.delete('red-meat');
      cats.add('meat-derived');
      if (ANIMAL_FAT_WORDS.test(name)) cats.add('animal-fat');
      if (GELATIN_WORDS.test(name)) cats.add('gelatin');
    }
    // Vinegar is fermented past alcohol.
    if (cats.has('vinegar')) cats.delete('alcohol');
    // Grains: settle whole vs refined from the name when the class didn't.
    if (cats.has('grain') && cats.has('refined-grain') && WHOLE_GRAIN_WORDS.test(name)) cats.delete('refined-grain');
    if (cats.has('grain') && !cats.has('whole-grain') && !cats.has('refined-grain')) {
      if (WHOLE_GRAIN_WORDS.test(name)) {
        cats.add('whole-grain');
        if (ambiguous === GRAIN_AMBIGUOUS) ambiguous = undefined;
      } else if (REFINED_GRAIN_WORDS.test(name)) {
        cats.add('refined-grain');
        if (ambiguous === GRAIN_AMBIGUOUS) ambiguous = undefined;
      }
    }
    if (!ambiguous && PREPARED_WORDS.test(name)) ambiguous = PREPARED_AMBIGUOUS;
    if (!ambiguous && !cats.has('added-sugar') && SUGAR_WORDS.test(text)) ambiguous = 'The name suggests a sweetener may be part of this ingredient.';
    if (!ambiguous && !cats.has('alcohol') && !cats.has('vinegar') && ALCOHOL_WORDS.test(text)) ambiguous = 'The name suggests alcohol may be part of this ingredient.';

    // Cross-check against Open Food Facts' own vegan / vegetarian flags.
    const vegan = inherited(tax, e.id, 'vegan');
    const vegetarian = inherited(tax, e.id, 'vegetarian');
    if (vegan === 'yes' && ANIMAL.some((c) => cats.has(c))) {
      note(`- Skipped \`${e.id}\`: Open Food Facts marks it vegan but its classes say ${[...cats].join(', ')}.`);
      continue;
    }
    ambiguous = animalCheck(cats, vegan, vegetarian) ?? ambiguous;

    cats = new Set([...cats].sort());
    if (cats.size === 0 && !ambiguous) continue;
    candidates.push({ name: names[0], aliases: names.slice(1), categories: [...cats], ambiguous, source: `off:${e.id}` });
  }
  return { candidates, unmappedRoots };
}

// ---------------------------------------------------------------------------
// Open Food Facts additives (E-numbers)

const ADDITIVE_CLASS: Record<string, Category[]> = {
  'en:preservative': ['preservative'],
  'en:antioxidant': ['preservative'],
  'en:acid': ['preservative'],
  'en:acidity-regulator': ['preservative'],
  'en:sequestrant': ['preservative'],
  'en:emulsifier': ['emulsifier'],
  'en:emulsifying-salts': ['emulsifier'],
  'en:thickener': ['thickener'],
  'en:stabiliser': ['thickener'],
  'en:gelling-agent': ['thickener'],
  'en:raising-agent': ['chemical-leavening'],
  'en:sweetener': ['added-sugar'],
  'en:flavour-enhancer': ['artificial-flavor'],
};
const CLASS_LABEL: Record<string, string> = {
  'en:colour': 'a colour',
  'en:anti-caking-agent': 'an anti-caking agent',
  'en:anti-foaming-agent': 'an anti-foaming agent',
  'en:bulking-agent': 'a bulking agent',
  'en:carrier': 'a carrier',
  'en:firming-agent': 'a firming agent',
  'en:flour-treatment-agent': 'a flour treatment agent',
  'en:foaming-agent': 'a foaming agent',
  'en:glazing-agent': 'a glazing agent',
  'en:humectant': 'a humectant',
  'en:packaging-gas': 'a packaging gas',
  'en:propellent-gas': 'a propellant gas',
  'en:coagulant': 'a coagulant',
};

function offAdditiveCandidates(tax: Taxonomy): Candidate[] {
  const out: Candidate[] = [];
  for (const e of tax.entries.values()) {
    const names = englishNames(tax, e.id);
    if (!names.length) continue;
    const eNumber = names.find((n) => /^E\s?\d{3,4}[a-z]*(\s?\(?[ivx]+\)?)?$/i.test(n.trim()));
    if (!eNumber) continue;
    const classes = (inherited(tax, e.id, 'additives_classes') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const cats = new Set<Category>(classes.flatMap((c) => ADDITIVE_CLASS[c] ?? []));
    const common = names.find((n) => n !== eNumber) ?? eNumber;
    if (cats.has('added-sugar') && /itol\b|isomalt/i.test(names.join(' '))) cats.add('sugar-alcohol');
    let ambiguous: string | undefined;
    const others = classes.filter((c) => !ADDITIVE_CLASS[c]);
    if (classes.includes('en:colour')) {
      ambiguous = 'Food colours can be synthetic dyes or made from plants or insects; diets differ on them.';
    } else if (cats.size === 0) {
      const what = others.map((c) => CLASS_LABEL[c]).filter(Boolean)[0];
      ambiguous = what
        ? `${eNumber.toUpperCase()} is a food additive (${what.replace(/^an? /, '')}); diets differ on additives like this.`
        : `${eNumber.toUpperCase()} is a food additive that Total Fast has not classified yet.`;
    }
    const vegan = inherited(tax, e.id, 'vegan');
    const vegetarian = inherited(tax, e.id, 'vegetarian');
    ambiguous = animalCheck(cats, vegan, vegetarian) ?? ambiguous;

    const aliases = names.filter((n) => n !== common);
    out.push({ name: common, aliases, categories: [...cats].sort(), ambiguous, source: `off:${e.id}` });
  }
  return out;
}

// ---------------------------------------------------------------------------
// USDA SR28

function usdaCandidates(foodDes: string): Candidate[] {
  const rows = foodDes.split(/\r?\n/).filter(Boolean).map((l) => l.split('^').map((f) => f.replace(/^~|~$/g, '')));
  const out: Candidate[] = [];
  const LEGUME_OR_GRAIN = /\b(beans?|peas?|lentils?|soy\w*|cowpeas?|pigeonpeas?|chickpeas?|corn|succotash|seeds?|sprouts?|lupins?|edamame)\b/i;
  const plural = (s: string) => s.toLowerCase().replace(/\s*\(.*?\)\s*/g, ' ').trim();
  const parens = (s: string) => [...s.matchAll(/\(([^)]+)\)/g)].flatMap((m) => m[1].split(/,| or /)).map((x) => x.trim().toLowerCase()).filter((x) => x && !/includes|type|and|raw|with|without|peeled/.test(x));
  const common = (s: string) => s.split(',').map((x) => x.trim().toLowerCase().replace(/,?\s*raw$/, '')).filter((x) => x && !/commodity|includes|usda/.test(x));

  for (const [ndb, group, desc, , comName] of rows) {
    // "Sugar-apples, (sweetsop), raw": a bracketed part is another name.
    const all = desc.split(/,\s*/);
    const bracketed = all.filter((p) => /^\(.*\)$/.test(p)).flatMap((p) => parens(p));
    const parts = all.filter((p) => !/^\(.*\)$/.test(p));
    const last = parts[parts.length - 1];
    let name: string | undefined;
    let cats: Category[] | undefined;
    const extra: string[] = [];
    const head = parts[0];
    const generic = /^(mushrooms|seaweed|melons)$/i.test(plural(head));
    if ((group === '0900' || group === '1100') && last === 'raw' && (parts.length === 2 || (parts.length === 3 && !/\s/.test(parts[1]) && !/^(common|peeled|baby|fruit|pods|leaves|root|green|raw|native|european|red|white|yellow|orange|sweet)$/i.test(parts[1])))) {
      if (LEGUME_OR_GRAIN.test(desc)) continue;
      name = parts.length === 2 ? plural(head) : `${parts[1].toLowerCase()} ${plural(head)}`;
      if (parts.length === 3 && generic) extra.push(parts[1].toLowerCase());
      if (group === '0900') cats = /juice/i.test(head) ? ['fruit', 'fruit-juice'] : ['fruit'];
      else cats = /mushroom/i.test(head) ? ['mushroom', 'vegetable'] : ['vegetable'];
      extra.push(...parens(head), ...common(comName ?? ''));
    } else if (group === '0200' && /^Spices$/i.test(head) && parts.length >= 2 && !/seasoning|pie spice|curry|chili powder|powder|salt/i.test(desc)) {
      name = parts.slice(1).filter((p) => !/^(ground|dried|whole|leaf|crumbled)$/i.test(p)).join(' ').toLowerCase();
      cats = ['herb-spice'];
    } else if (group === '1500' && parts.length === 3 && last === 'raw' && /^(Fish|Mollusks|Crustaceans)$/.test(head)) {
      name = parts[1].toLowerCase();
      cats = head === 'Fish' ? ['fish'] : ['shellfish'];
      extra.push(...common(comName ?? ''));
    } else if (group === '1200' && /^(Nuts|Seeds)$/.test(head) && parts.length >= 2 && parts.slice(2).every((p) => /^(raw|dried|dried \(unblanched\)|unroasted|whole|kernels)$/i.test(p))) {
      if (/coconut|butter|paste|flour|meal|oil|milk|chestnut/i.test(parts[1])) continue;
      name = parts[1].toLowerCase().replace(/\s*\(.*?\)/, '');
      cats = head === 'Nuts' ? ['nut'] : ['seed'];
      extra.push(...parens(parts[1]));
    } else if (group === '1700' && /^Game meat$/.test(head) && parts.length >= 3 && last === 'raw') {
      if (/fat|liver|ground/i.test(desc)) continue;
      name = parts[1].toLowerCase().replace(/\s*\(.*?\)/, '');
      cats = ['meat'];
      extra.push(...parens(parts[1]));
    }
    if (!name || !cats || name.length < 3) continue;
    extra.push(...bracketed);
    out.push({ name, aliases: [...new Set(extra)].filter((x) => x !== name), categories: cats, source: `usda-sr28:${ndb}` });
  }
  return out;
}

// ---------------------------------------------------------------------------
// De-duplication and merging

/** A string that says how an ingredient is judged on every rule set and day. */
function signature(ing: Pick<Ingredient, 'id' | 'categories' | 'ambiguous'>): string {
  const probe: Ingredient = { id: ing.id, name: ing.id, categories: ing.categories, ambiguous: ing.ambiguous };
  const parts: string[] = [];
  for (const rs of Object.values(RULE_SETS)) {
    const days = [...new Set(rs.rules.flatMap((r) => r.when?.days ?? []))];
    for (const day of [undefined, ...days]) {
      const rules = rs.rules.filter((r: Rule) => !r.when || (day && r.when.days.includes(day)));
      parts.push(judgeIngredient(ing.id, probe, rules).verdict[0]);
    }
  }
  return parts.join('');
}

/** Index keys an ingredient claims, as IngredientIndex computes them. */
const keysOf = (id: string, name: string, aliases: string[]) => [...new Set([id.replace(/-/g, ' '), name, ...aliases].map(normalize).filter(Boolean))];
const slug = (s: string) => normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const usable = (k: string) => k.length >= 3 && /[a-z]/.test(k) && k.length <= 60;

interface Owner {
  id: string;
  signature: string;
  seed: boolean;
}

function build() {
  const offIng = parseTaxonomy(load(FILES.offIngredients));
  const offAdd = parseTaxonomy(load(FILES.offAdditives));
  load(FILES.usdaGroups);
  const usdaFood = load(FILES.usdaFoods);

  const datasets: [string, Candidate[]][] = [
    ['Open Food Facts additives', offAdditiveCandidates(offAdd)],
    ['Open Food Facts ingredients', (() => {
      const { candidates, unmappedRoots } = offIngredientCandidates(offIng);
      const top = [...unmappedRoots.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
      note(`\n### Open Food Facts classes not imported (no category mapping), largest first\n`);
      note(top.map(([k, n]) => `- \`${k}\`: ${n} entries`).join('\n'));
      return candidates;
    })()],
    ['USDA SR28', usdaCandidates(usdaFood)],
  ];

  const owners = new Map<string, Owner>();
  const seedById = new Map(SEED_INGREDIENTS.map((s) => [s.id, s]));
  for (const s of SEED_INGREDIENTS) {
    const sig = signature(s);
    for (const k of keysOf(s.id, s.name, s.aliases ?? [])) owners.set(k, { id: s.id, signature: sig, seed: true });
  }

  // A new spelling must not change what a label that already resolved to a
  // seed entry (through plural or qualifier stripping) means.
  const seedIndex = new IngredientIndex(SEED_INGREDIENTS);
  const seedSig = new Map(SEED_INGREDIENTS.map((s) => [s.id, signature(s)]));
  const shadowsSeed = (k: string, sig: string) => {
    const hit = seedIndex.resolve(k);
    return !!hit && seedSig.get(hit.id) !== sig;
  };

  const imported = new Map<string, Ingredient>();
  const seedAdditions = new Map<string, { aliases: Set<string>; sources: Set<string> }>();
  const stats: Record<string, { candidates: number; added: number; merged: number; conflicts: number; droppedAliases: number }> = {};
  const conflicts: string[] = [];

  // Rule 2: a spelling claimed by two imported candidates that disagree, in
  // any dataset, is dropped from both ("amaranth" is a grain and a dye).
  const claims = new Map<string, Set<string>>();
  const sigOf = new Map<Candidate, string>();
  for (const [, candidates] of datasets) {
    for (const c of candidates) {
      const sig = signature({ id: 'x', categories: c.categories, ambiguous: c.ambiguous });
      sigOf.set(c, sig);
      for (const k of keysOf(slug(c.name), c.name, c.aliases)) claims.set(k, (claims.get(k) ?? new Set()).add(sig));
    }
  }
  const contested = new Set([...claims].filter(([, s]) => s.size > 1).map(([k]) => k));
  note(`- ${contested.size} label spellings are claimed by imported entries that disagree, so none of them is imported.`);

  for (const [label, candidates] of datasets) {
    const st = (stats[label] = { candidates: candidates.length, added: 0, merged: 0, conflicts: 0, droppedAliases: 0 });
    const sigs = candidates.map((c) => sigOf.get(c)!);

    candidates.forEach((c, i) => {
      const sig = sigs[i];
      const primary = normalize(c.name);
      const keys = keysOf(slug(c.name), c.name, c.aliases).filter((k) => usable(k) || /^e\d{3,4}[a-z]*$/.test(k));
      const free = keys.filter((k) => !contested.has(k) && !(owners.get(k)?.id !== undefined ? false : shadowsSeed(k, sig)));
      st.droppedAliases += keys.length - free.length;
      // "mangos" names the same thing as an existing "mango".
      const singulars = [primary, primary.replace(/ies$/, 'y'), primary.replace(/es$/, ''), primary.replace(/s$/, '')];
      const owner = singulars.map((k) => owners.get(k)).find(Boolean);

      if (owner) {
        // Rule 1: same thing as an existing entry. Merge only if it agrees.
        if (owner.signature !== sig) {
          st.conflicts++;
          conflicts.push(`- ${label}: \`${c.source}\` "${c.name}" [${c.categories.join(', ')}${c.ambiguous ? ', ambiguous' : ''}] disagrees with \`${owner.id}\`; not merged.`);
          return;
        }
        const target = owner.seed ? undefined : imported.get(owner.id);
        let added = 0;
        for (const k of free) {
          if (owners.has(k)) continue;
          owners.set(k, owner);
          added++;
          if (target) target.aliases!.push(k);
          else {
            const a = seedAdditions.get(owner.id) ?? { aliases: new Set(), sources: new Set() };
            a.aliases.add(k);
            seedAdditions.set(owner.id, a);
          }
        }
        if (target) target.sources!.push(c.source);
        else {
          const a = seedAdditions.get(owner.id) ?? { aliases: new Set(), sources: new Set() };
          a.sources.add(c.source);
          seedAdditions.set(owner.id, a);
        }
        if (added || target) st.merged++;
        return;
      }

      if (contested.has(primary) || !free.includes(primary)) {
        st.droppedAliases++;
        return;
      }
      let id = slug(c.name);
      if (!id || owners.has(normalize(id.replace(/-/g, ' '))) && owners.get(normalize(id.replace(/-/g, ' ')))!.id !== id) id = `${id}-${c.source.split(':')[0]}`;
      if (imported.has(id) || seedById.has(id)) return;
      const mine = free.filter((k) => !owners.has(k));
      st.droppedAliases += free.length - mine.length;
      const idKey = normalize(id.replace(/-/g, ' '));
      if (!mine.includes(primary) || (owners.has(idKey) && owners.get(idKey)!.id !== id)) return;
      const ing: Ingredient = {
        id,
        name: c.name.toLowerCase().trim(),
        aliases: mine.filter((k) => k !== normalize(c.name) && k !== idKey),
        categories: c.categories,
        sources: [c.source],
        ...(c.ambiguous ? { ambiguous: c.ambiguous } : {}),
      };
      const owner2: Owner = { id, signature: sig, seed: false };
      for (const k of keysOf(id, ing.name, ing.aliases!)) owners.set(k, owner2);
      imported.set(id, ing);
      st.added++;
    });
  }

  write([...imported.values()], seedAdditions);
  writeReport(stats, conflicts, imported.size, seedAdditions.size);
}

// ---------------------------------------------------------------------------
// Output

function write(items: Ingredient[], seedAdditions: Map<string, { aliases: Set<string>; sources: Set<string> }>) {
  const ambiguities = [...new Set(items.map((i) => i.ambiguous).filter((a): a is string => !!a))].sort();
  const amb = (a?: string) => (a ? `, ${ambiguities.indexOf(a)}` : '');
  const lines = items
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((i) => `  [${JSON.stringify(i.id)}, ${JSON.stringify(i.name)}, ${JSON.stringify(i.categories)}, ${JSON.stringify(i.aliases)}, ${JSON.stringify(i.sources)}${amb(i.ambiguous)}],`);
  const additions = [...seedAdditions.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, a]) => `  ${JSON.stringify(id)}: { aliases: ${JSON.stringify([...a.aliases].sort())}, sources: ${JSON.stringify([...a.sources].sort())} },`);
  writeFileSync(
    OUT,
    `// GENERATED by scripts/import/build.ts. Do not edit by hand: change the
// mapping in scripts/import/ and run \`npm run import-data\`.
//
// Contains information from Open Food Facts (https://world.openfoodfacts.org),
// made available under the Open Database License (ODbL 1.0); individual
// contents under the Database Contents License (DbCL 1.0). Taxonomies at
// openfoodfacts-server commit ${OFF_COMMIT}.
// Also contains USDA National Nutrient Database for Standard Reference, Legacy
// (SR28) food descriptions, a U.S. Government work in the public domain, read
// from the mirror at schirinos/nutrient-db@${USDA_MIRROR_COMMIT}.
import type { Category, Ingredient } from '../types.ts';

const AMBIGUOUS: string[] = ${JSON.stringify(ambiguities, null, 2)};

type Row = [id: string, name: string, categories: Category[], aliases: string[], sources: string[], ambiguous?: number];

const ROWS: Row[] = [
${lines.join('\n')}
];

/** Ingredients imported from public datasets. See DATASETS for licenses. */
export const IMPORTED_INGREDIENTS: Ingredient[] = ROWS.map(([id, name, categories, aliases, sources, a]) => ({
  id,
  name,
  categories,
  aliases,
  sources,
  ...(a === undefined ? {} : { ambiguous: AMBIGUOUS[a] }),
}));

/** Extra label spellings for seed ingredients, from datasets that agree with them. */
export const SEED_ADDITIONS: Record<string, { aliases: string[]; sources: string[] }> = {
${additions.join('\n')}
};
`,
  );
}

function writeReport(stats: Record<string, Record<string, number>>, conflicts: string[], total: number, seedMerged: number) {
  const rows = Object.entries(stats).map(([k, s]) => `| ${k} | ${s.candidates} | ${s.added} | ${s.merged} | ${s.conflicts} | ${s.droppedAliases} |`);
  writeFileSync(
    REPORT,
    `# Ingredient import report

Generated by \`scripts/import/build.ts\`. ${total} imported ingredients, plus extra spellings for ${seedMerged} seed ingredients.

| Dataset | Candidates | Added | Merged into an existing entry | Conflicts (not merged) | Spellings dropped |
| --- | ---: | ---: | ---: | ---: | ---: |
${rows.join('\n')}

"Merged" means the entry named something already in the database and got the
same verdict under every rule set, so only its spellings were added.
"Conflicts" named something already in the database but would have been judged
differently, so it was left out; these are worth a human look.
"Spellings dropped" are label spellings already taken by another entry, or
claimed by two imported entries that disagree.

## Conflicts

${conflicts.join('\n') || 'None.'}

## Notes
${report.join('\n')}
`,
  );
}

build();
