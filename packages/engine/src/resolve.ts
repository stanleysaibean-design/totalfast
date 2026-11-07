import type { Ingredient } from './types.ts';

/**
 * Resolves label text to canonical ingredients by exact name or alias, after
 * light normalization. Deliberately no fuzzy or substring matching: "cream of
 * tartar" must not become "cream". Anything unresolved is reported as
 * uncertain so the review layer can add it.
 */
export class IngredientIndex {
  private byName = new Map<string, Ingredient>();

  /**
   * Two entries can claim the same spelling once normalized ("sulphur
   * dioxide" and "sulfur dioxide"). Hand-curated entries ("seed", "curated")
   * win over imported ones, and two curated entries may never collide. Two
   * imported entries that would be judged the same keep the first; if they
   * would be judged differently the spelling is dropped, so it stays
   * uncertain rather than picking one.
   */
  constructor(ingredients: Ingredient[]) {
    const dropped = new Set<string>();
    for (const ing of ingredients) {
      for (const n of [ing.id.replace(/-/g, ' '), ing.name, ...(ing.aliases ?? [])]) {
        const key = normalize(n);
        if (dropped.has(key)) continue;
        const existing = this.byName.get(key);
        if (existing && existing.id !== ing.id) {
          const a = curated(existing), b = curated(ing);
          if (a && b) throw new Error(`Alias "${n}" maps to both ${existing.id} and ${ing.id}`);
          if (a) continue;
          if (b) { this.byName.set(key, ing); continue; }
          if (sameJudgement(existing, ing)) continue;
          this.byName.delete(key);
          dropped.add(key);
          continue;
        }
        this.byName.set(key, ing);
      }
    }
  }

  resolve(label: string, depth = 0): Ingredient | undefined {
    const base = normalize(label);
    if (depth > 3) return this.lookup(base);
    const direct = this.lookup(base);
    if (direct) return direct;
    // "extract of rosemary", "oleoresin turmeric" -> "rosemary extract", "turmeric oleoresin"
    const of = base.match(/^(extracts?|extractives?|puree|powder|juice|concentrate|oil|flakes|paste) of (.+)$/) ?? base.match(/^(oleoresins?|extractives?) (.+)$/);
    if (of) return this.resolve(`${of[2]} ${of[1]}`, depth + 1);
    // "riboflavin b2", "thiamine mononitrate vitamin b1": a vitamin with its number after it
    const vitaminNo = base.match(/^(.+?) (vitamin )?b ?\d{1,2}$/);
    if (vitaminNo) {
      const hit = this.lookup(vitaminNo[1]);
      if (hit?.categories.includes('vitamin-mineral')) return hit;
    }
    // "natural strawberry flavor": a natural flavor; "strawberry flavor": a flavoring of unknown kind
    const flavor = base.match(/^(natural |artificial )?(.+?) flavor(s|ing|ings)?( with other natural flavors)?$/);
    if (flavor) return this.lookup(flavor[1] === 'natural ' ? 'natural flavors' : flavor[1] === 'artificial ' ? 'artificial flavor' : 'flavoring');
    // "chardonnay wine"
    if (/ wines?$/.test(base) && !/vinegar/.test(base)) return this.lookup('wine');
    // "shiitake mushrooms"
    const mushroom = base.match(/^(.+?) mushrooms?$/);
    if (mushroom) {
      const hit = this.lookup(mushroom[1]);
      if (hit?.categories.includes('mushroom')) return hit;
    }
    // "ginger puree", "cherry powder": the form doesn't change what it is.
    const form = base.match(FORM_SUFFIX);
    if (form) return this.resolve(form[1], depth + 1);
    // "cranberry juice", "onion juice": a fruit's juice is fruit juice; a vegetable's is that vegetable.
    const juice = base.match(/^(.+?) juices?$/);
    if (juice) {
      const hit = this.lookup(juice[1]);
      if (hit?.categories.includes('fruit')) return this.lookup('fruit juice') ?? hit;
      if (hit?.categories.some((c) => c === 'vegetable' || c === 'herb-spice')) return hit;
    }
    // "garlic extract", "paprika oleoresin": a spice or vegetable extract is
    // still that plant. Fruit and nut extracts are left alone; they are
    // usually made with alcohol.
    const extract = base.match(EXTRACT_SUFFIX);
    if (extract) {
      const hit = this.lookup(extract[1]);
      if (hit && hit.categories.some((c) => EXTRACT_KEEPS.has(c))) return hit;
    }
    return undefined;
  }

  private lookup(s: string): Ingredient | undefined {
    for (const candidate of variants(s)) {
      const hit = this.byName.get(candidate);
      if (hit) return hit;
    }
    return undefined;
  }
}

const curated = (i: Ingredient) => !i.sources || i.sources.some((x) => x === 'seed' || x === 'curated');
const sameJudgement = (a: Ingredient, b: Ingredient) =>
  [...a.categories].sort().join() === [...b.categories].sort().join() && !a.ambiguous === !b.ambiguous;

/** Qualifiers that don't change what an ingredient is. */
const QUALIFIERS = [
  'organic', 'certified organic', 'non gmo', 'raw', 'fresh', 'frozen', 'dried', 'dry', 'roasted', 'toasted',
  'chopped', 'diced', 'sliced', 'minced', 'ground', 'unsalted', 'salted', 'pure', 'filtered', 'unrefined',
  'cold pressed', 'expeller pressed', 'unbleached', 'freshly', 'finely', 'cooked', 'canned', 'rinsed', 'drained',
  // processing and grade words on dairy, produce and oils
  'pasteurized', 'ultra pasteurized', 'ultrapasteurized', 'homogenized', 'cultured', 'grade a', 'granulated',
  'dehydrated', 'crushed', 'aged', 'natural', 'all natural', 'premium', 'fine', 'refined', 'evaporated', 'concentrated',
  'extra virgin', 'virgin', 'grass fed', 'free range', 'cage free', 'wild caught', 'farm raised', 'kosher', 'vine ripened',
  'sun dried', 'freeze dried', 'air dried', 'smoked', 'blanched', 'peeled', 'pitted', 'shredded', 'grated', 'flaked',
  'cracked', 'rolled', 'steel cut', 'hulled', 'split', 'halved', 'pieces of', 'pieces', 'puree of',
  'part skim', 'skim', 'semi skim', 'nonfat', 'non fat', 'lowfat', 'low fat', 'reduced fat', 'fat free', 'light',
  "cow's", 'cow', 'cows', 'reconstituted', 'encapsulated', 'lean', 'double concentrated', 'triple concentrated', 'certified',
  'gluten free', 'sustainable', 'sustainably sourced', 'responsibly sourced', 'rspo', 'rspo certified', 'raised without antibiotics',
  'no antibiotics ever', 'british', 'irish', 'scottish', 'welsh', 'english', 'european', 'french', 'italian', 'spanish', 'german',
  'canadian', 'american', 'usa', 'uk', 'eu', 'non eu', 'local', 'wild', 'select', 'fancy', 'extra fancy', 'jumbo', 'baby', 'mini',
  'frozen', 'chilled', 'uncured', 'boneless', 'skinless', 'deboned', 'fully cooked', 'precooked', 'parboiled', 'instant', 'quick',
  'high oleic', 'mid oleic', 'liquid', 'rendered', 'enzyme modified', 'fire roasted', 'hard cooked', 'hard boiled', 'reverse osmosis',
  'prepared', 'reduced mineral', 'demineralized', 'naturally derived', 'unenriched', 'bleached', 'red ripe', 'ripe', 'fresh picked',
  'stone ground', 'milled', 'cut', 'unbromated', 'rehydrated', 'steamed', 'idaho', 'specially selected', "cows'", 'non dairy',
  'non hydrogenated', 'expeller pressed', 'triple filtered', 'imported', 'sundried', 'clarified', 'powdered', 'highly refined', 'puffed', 'rubbed', 'grilled', 'kibbled', 'extracted', 'dry roasted', 'oven roasted', 'slow roasted', 'lightly salted', 'sea salted', 'sweet', 'dark', 'light brown',

];
// Longest first, so "part skim" is removed as one phrase before "skim".
const QUALIFIER_RE = new RegExp(`\\b(${[...QUALIFIERS].sort((a, b) => b.length - a.length).join('|')})\\b`, 'g');

/**
 * British and other label spellings, mapped word by word to the US spelling
 * the database uses. Applied to both label text and database names, so an
 * entry needs only one spelling.
 */
const SPELLINGS: Record<string, string> = {
  flavour: 'flavor', flavours: 'flavors', flavouring: 'flavoring', flavourings: 'flavorings', flavoured: 'flavored',
  colour: 'color', colours: 'colors', colouring: 'coloring', colourings: 'colorings', coloured: 'colored',
  fibre: 'fiber', fibres: 'fibers', sulphate: 'sulfate', sulphates: 'sulfates', sulphite: 'sulfite', sulphites: 'sulfites',
  sulphur: 'sulfur', sulphide: 'sulfide', yoghurt: 'yogurt', yoghurts: 'yogurts', chilli: 'chili', chillies: 'chilies',
  pasteurised: 'pasteurized', homogenised: 'homogenized', caramelised: 'caramelized', stabiliser: 'stabilizer',
  stabilisers: 'stabilizers', hydrolysed: 'hydrolyzed', hydrogenised: 'hydrogenated',
  aluminium: 'aluminum', savoury: 'savory', liquorice: 'licorice', caramelise: 'caramelize', crystallised: 'crystallized',
  ionised: 'ionized', vitamine: 'vitamin', vitamines: 'vitamins',
  maize: 'corn', skimmed: 'skim', mould: 'mold', moulds: 'molds', gelatine: 'gelatin', wholegrain: 'whole grain',
  wholegrains: 'whole grains', colourant: 'colorant', colourants: 'colorants', acidifier: 'acidulant',
  vit: 'vitamin', vits: 'vitamins', cacao: 'cocoa', tumeric: 'turmeric', carageenan: 'carrageenan', carrageenin: 'carrageenan',
  soya: 'soy', degermed: 'degerminated',
};

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9&'.\s-]/g, ' ')
    // Keep decimal points ("3.5"); other dots are abbreviations ("vit. b6", "s. thermophilus").
    .replace(/\.(?!\d)|(?<!\d)\./g, ' ')
    .replace(/\bfd ?& ?c\b/g, 'fd&c')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[a-z]+/g, (w) => SPELLINGS[w] ?? w);
}

const FORM_SUFFIX =
  /^(.+?) (puree|purees|powder|powders|flakes|flake|paste|pieces|piece|solids|pulp|granules|bits|chunks|dices|diced|crumbles|crumbs|preparation|blend|concentrate|concentrates|color|colors|sectors|segments|tidbits|halves|slices|wedges|rings|strips|skins|meal|nibs|kernels|lake|lakes|coloring|colouring)$/;
/** An extract of these is still the thing itself (a spice extract, or meat or fish). */
const EXTRACT_KEEPS = new Set<string>(['herb-spice', 'vegetable', 'leafy-green', 'root-vegetable', 'meat', 'poultry', 'fish', 'shellfish', 'dairy', 'egg', 'mushroom']);
const EXTRACT_SUFFIX = /^(.+?) (extract|extracts|extractives?|oleoresin|oleoresins)$/;

function* variants(s: string): Generator<string> {
  yield s;
  // "vitamins b2" -> "vitamin b2"
  if (s.startsWith('vitamins ')) yield s.replace(/^vitamins /, 'vitamin ');
  // "vitamin b 12" -> "vitamin b12"
  if (/\bb \d/.test(s)) yield s.replace(/\bb (\d)/, 'b$1');
  // "L-ascorbic acid", "DL-alpha tocopherol": the isomer prefix doesn't matter here.
  const isomer = s.match(/^(l|d|dl|d l|l\+|d\+) (.+)$/);
  if (isomer) yield* variants(isomer[2]);
  // E-numbers are printed many ways: "E 330", "E-330", "E500(ii)" -> "e330", "e500ii".
  const e = s.match(/^e\s?(\d{3,4})\s?([a-z]{0,4})$/);
  if (e) yield `e${e[1]}${e[2]}`;
  const stripped = s.replace(QUALIFIER_RE, ' ').replace(/\s+/g, ' ').trim();
  if (stripped && stripped !== s) yield stripped;
  for (const v of [s, stripped]) {
    if (v.endsWith('ies')) yield v.slice(0, -3) + 'y';
    if (v.endsWith('es')) yield v.slice(0, -2);
    if (v.endsWith('s')) yield v.slice(0, -1);
  }
}

const UNITS =
  'cups?|c|tablespoons?|tbsps?|tbs|teaspoons?|tsps?|ounces?|oz|pounds?|lbs?|grams?|g|kg|ml|l|liters?|litres?|pinch(es)?|dash(es)?|cloves?|cans?|jars?|handfuls?|bunch(es)?|heads?|stalks?|slices?|pieces?|packages?|pkgs?|sprigs?|large|medium|small';

/**
 * Turns a recipe line into an ingredient name:
 * "2 cups rolled oats, divided" -> "rolled oats".
 */
export function recipeLineToIngredient(line: string): string {
  return line
    .replace(/\(.*?\)/g, ' ')
    .replace(/^[\s\d¼½¾⅓⅔⅛./-]+/, '')
    .replace(new RegExp(`^(${UNITS})\\.?\\s+(of\\s+)?`, 'i'), '')
    .replace(/,.*$/, '')
    .replace(/\b(to taste|optional|for serving|for garnish)\b/gi, '')
    .trim();
}
