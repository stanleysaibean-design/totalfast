import type { Category, Ingredient } from '../types.ts';

/**
 * Hand-curated coverage for real packaged-food labels, drawn from the
 * ingredient names that most often went unrecognized across 442,000 Open
 * Food Facts labels (see scripts/coverage). Three parts:
 *
 * - CURATED_INGREDIENTS: new entries, sourced "curated". Like seed entries,
 *   they win over imported entries that claim the same spelling.
 * - CURATED_ALIASES: extra label spellings for entries that already exist.
 * - RECLASSIFIED: corrections to imported entries, mostly food additives the
 *   import left as "not classified yet".
 *
 * Rule of thumb: when a name genuinely doesn't settle a question some diet
 * asks, the entry is `ambiguous` (uncertain), scoped with `ambiguousFor` to
 * the categories the doubt is about. Never guess a verdict.
 */

/** Categories a "this could be from an animal" doubt is about. */
export const ANIMAL: Category[] = ['meat', 'meat-derived', 'animal-fat', 'gelatin', 'fish', 'shellfish', 'dairy', 'egg', 'honey'];

const ANIMAL_OR_PLANT = 'This can be made from animal or plant sources; the label does not say which.';
const GRAIN = 'The label does not say whether this grain is whole or refined.';
const COLOR = 'Food colours can be synthetic dyes or made from plants or insects; diets differ on them.';
const INSECT = 'This is made by insects; diets differ on insect products.';

const c = (id: string, categories: Category[], aliases: string[] = [], extra: Partial<Ingredient> = {}): Ingredient => ({
  id,
  name: extra.name ?? id.replace(/-/g, ' '),
  aliases,
  categories,
  sources: ['curated'],
  ...extra,
});

export const CURATED_INGREDIENTS: Ingredient[] = [
  // vitamins and minerals, as labels print them
  c('vitamin-a', ['vitamin-mineral'], [
    'vitamin a palmitate', 'retinyl palmitate', 'vitamin a acetate', 'retinyl acetate', 'retinol', 'palmitate', 'vitamin a palmitate added',
  ]),
  c('vitamin-b6', ['vitamin-mineral'], ['b6', 'pyridoxine', 'pyridoxine hydrochloride', 'pyridoxine hcl', 'pyridoxal phosphate']),
  c('vitamin-b12', ['vitamin-mineral'], ['b12', 'cyanocobalamin', 'methylcobalamin', 'cobalamin', 'hydroxocobalamin']),
  c('pantothenic-acid', ['vitamin-mineral'], [
    'vitamin b5', 'b5', 'calcium pantothenate', 'd calcium pantothenate', 'calcium d pantothenate', 'd pantothenic acid', 'panthenol', 'dexpanthenol',
  ]),
  c('biotin', ['vitamin-mineral'], ['vitamin b7', 'b7', 'd biotin', 'vitamin h']),
  c('vitamin-k', ['vitamin-mineral'], ['vitamin k1', 'vitamin k2', 'phylloquinone', 'phytonadione', 'menaquinone', 'phytomenadione']),
  c('choline', ['vitamin-mineral'], ['choline chloride', 'choline bitartrate']),
  c('inositol', ['vitamin-mineral'], ['myo inositol']),
  c('vitamins', ['vitamin-mineral'], ['vitamin', 'vitamin blend', 'vitamin premix', 'vitamin mix', 'mineral nutrients', 'minerals', 'vitamins and minerals', 'vitamin and mineral blend']),
  c('calcium', ['vitamin-mineral'], ['calcium salts']),
  c('zinc', ['vitamin-mineral'], ['zinc oxide', 'zinc sulfate', 'zinc gluconate', 'zinc citrate']),
  c('magnesium', ['vitamin-mineral'], ['magnesium phosphate']),
  c('potassium', ['vitamin-mineral'], ['potassium phosphate']),
  c('iodine', ['vitamin-mineral'], []),
  c('trace-minerals', ['vitamin-mineral'], [
    'manganese sulfate', 'manganese gluconate', 'sodium selenite', 'sodium selenate', 'selenium', 'sodium molybdate', 'molybdenum',
    'chromium chloride', 'chromium picolinate', 'chromium', 'copper gluconate', 'cupric sulfate', 'copper', 'manganese',
    'ferric orthophosphate', 'ferric phosphate', 'ferrous fumarate', 'ferric pyrophosphate', 'electrolytic iron',
    'sodium fluoride', 'potassium citrate',
  ], { name: 'trace minerals' }),
  c('potassium-chloride', ['salt'], ['kcl', 'e508']),

  // dairy forms
  c('milk-protein', ['dairy'], [
    'milk proteins', 'milk protein concentrate', 'milk protein isolate', 'milk solids', 'nonfat milk solids', 'nonfat dry milk solids',
    'milk solids non fat', 'modified milk ingredients', 'milk derivative', 'milk derivatives', 'dairy protein',
    'micellar casein', 'ultrafiltered milk', 'ultra filtered milk', 'milkfat and nonfat milk', 'milk and cream', 'milk and nonfat milk',
    'concentrated milk protein', 'skim milk solids', 'dried milk', 'whole milk powder', 'dry whole milk',
  ]),
  c('condensed-milk', ['dairy'], ['condensed skim milk', 'evaporated milk', 'evaporated skim milk', 'condensed whole milk']),
  c('sweetened-condensed-milk', ['dairy', 'added-sugar'], ['sweetened condensed skim milk', 'sweetened condensed whole milk']),
  c('cultures', [], [
    'culture', 'cheese culture', 'bacterial culture', 'bacterial cultures', 'starter culture', 'starter cultures',
    'lactic acid starter culture', 'lactic acid starter cultures', 'lactic cultures', 'lactic culture', 'live cultures', 'live and active cultures',
    'active cultures', 'probiotic cultures', 'yogurt cultures', 'dairy cultures', 'microbial culture', 'bacteria culture', 'cultured',
    's. thermophilus', 'streptococcus thermophilus', 'l. bulgaricus', 'lactobacillus bulgaricus', 'lactobacillus delbrueckii subsp. bulgaricus',
    'l. acidophilus', 'lactobacillus acidophilus', 'acidophilus', 'bifidus', 'bifidobacterium', 'bifidobacteria', 'b. bifidum', 'bifidobacterium lactis',
    'b. lactis', 'l. casei', 'lactobacillus casei', 'l. rhamnosus', 'lactobacillus rhamnosus', 'l. paracasei', 'l. plantarum', 'lactobacillus plantarum',
    'b. longum', 'l. lactis', 'lactococcus lactis', 'l. reuteri', 'bacillus coagulans', 'probiotics', 'kefir cultures',
  ], { name: 'bacterial cultures' }),
  c('enzymes', [], ['enzyme', 'cheese enzymes', 'enzymes added'], {
    ambiguous: 'Enzymes can come from microbes, plants or animals; the label does not say which.',
    ambiguousFor: ANIMAL,
  }),
  c('microbial-enzymes', [], [
    'microbial enzyme', 'fungal enzymes', 'bacterial enzymes', 'vegetable enzymes', 'non animal enzymes', 'lactase', 'lactase enzyme',
    'fungal amylase', 'xylanase', 'glucose oxidase', 'transglutaminase', 'microbial transglutaminase',
  ]),
  c('rennet', [], ['animal rennet', 'calf rennet'], {
    ambiguous: 'Rennet is usually taken from calves, though some is microbial; the label does not say which.',
    ambiguousFor: ['meat', 'meat-derived'],
  }),
  c('microbial-rennet', [], ['vegetable rennet', 'non animal rennet', 'microbial coagulant', 'vegetarian rennet']),

  // grain and plant proteins
  c('wheat-gluten', ['grain', 'gluten', 'refined-grain'], [
    'gluten', 'vital wheat gluten', 'wheat protein', 'wheat proteins', 'wheat protein isolate', 'hydrolyzed wheat protein', 'hydrolyzed wheat gluten',
    'textured wheat protein', 'wheat gluten protein', 'seitan',
  ]),
  c('soy-protein', ['legume', 'soy'], [
    'soy protein concentrate', 'isolated soy protein', 'hydrolyzed soy protein', 'textured soy protein',
    'textured soy flour', 'textured vegetable protein', 'tvp', 'soy protein crisps',
    'defatted soy flour', 'soy protein nuggets', 'hydrolyzed vegetable protein', 'soybean protein',
  ]),
  c('pea-protein-isolate', ['legume', 'green-legume'], ['pea protein concentrate', 'pea fiber', 'pea starch', 'textured pea protein', 'pea hull fiber']),
  c('hydrolyzed-corn-protein', ['grain', 'refined-grain'], ['hydrolyzed corn gluten', 'corn gluten', 'corn protein']),
  c('oat-fiber', ['grain'], ['oat fibre', 'oat bran fiber', 'oat hull fiber'], { ambiguous: GRAIN, ambiguousFor: ['refined-grain'] }),
  c('wheat-fiber', ['grain', 'gluten'], ['wheat fibre'], { ambiguous: GRAIN, ambiguousFor: ['refined-grain'] }),
  c('soluble-corn-fiber', ['grain', 'refined-grain'], ['soluble corn fibre', 'resistant maltodextrin', 'resistant dextrin', 'corn fiber']),
  c('degerminated-corn-meal', ['grain', 'refined-grain'], [
    'degerminated yellow corn meal', 'degerminated yellow cornmeal', 'degerminated white corn meal', 'degerminated corn flour',
    'degerminated yellow corn flour', 'degerminated cornmeal', 'enriched corn meal', 'enriched yellow corn meal', 'enriched degerminated yellow corn meal',
  ]),
  c('amaranth', ['pseudo-grain', 'whole-grain'], ['amaranth flour', 'amaranth seed']),

  // fibres and plant extracts
  c('inulin', [], ['chicory root fiber', 'chicory root extract', 'chicory fiber', 'chicory root inulin', 'chicory inulin', 'agave inulin', 'oligofructose', 'fructooligosaccharides']),
  c('citrus-fiber', [], ['citrus fibre', 'orange fiber', 'lemon fiber']),
  c('vegetable-fiber', [], ['plant fiber', 'bamboo fiber', 'apple fiber', 'sugar beet fiber', 'potato fiber', 'acacia fiber']),
  c('polydextrose', ['thickener'], []),

  // chocolate
  c('chocolate', ['herb-spice'], ['milk chocolate', 'dark chocolate', 'semisweet chocolate', 'semi sweet chocolate', 'chocolate chips', 'chocolate chunks', 'chocolate coating'], {
    ambiguous: 'Chocolate usually contains sugar and cocoa butter and may contain milk; the label does not list it.',
    ambiguousFor: ['added-sugar', 'dairy', 'solid-fat'],
  }),

  // flavours and colours
  c('flavoring', ['natural-flavor'], ['flavorings', 'flavor', 'flavors', 'flavouring', 'aroma', 'aromas', 'flavor blend', 'flavoring agents'], {
    ambiguous: 'The label does not say whether this flavoring is natural or artificial, or what carries it.',
  }),
  c('natural-and-artificial-flavors', ['natural-flavor', 'artificial-flavor'], [
    'natural and artificial flavor', 'natural & artificial flavors', 'natural & artificial flavor', 'artificial and natural flavors',
    'artificial and natural flavor', 'artificial & natural flavors', 'natural and artificial flavoring', 'natural and artificial flavorings',
  ], { ambiguous: '"Natural flavors" can hide animal-derived or alcohol-based carriers; the label does not say which.' }),
  c('smoke-flavor', [], [
    'smoke flavoring', 'natural smoke flavor', 'natural smoke flavoring', 'liquid smoke', 'natural hickory smoke flavor', 'hickory smoke flavor',
    'smoke', 'natural smoke', 'hickory smoke', 'mesquite smoke flavor', 'natural liquid smoke', 'smoked flavor',
  ]),
  c('vanillin', ['artificial-flavor'], ['ethyl vanillin', 'vanillin artificial flavor']),
  c('color', [], ['colors', 'coloring', 'colorings', 'color added', 'food coloring', 'food color'], { ambiguous: COLOR, ambiguousFor: ['artificial-color', 'meat-derived'] }),
  c('vegetable-color', [], [
    'vegetable juice color', 'vegetable juice for color', 'vegetable colors', 'fruit and vegetable juice', 'fruit and vegetable juices',
    'fruit and vegetable juice color', 'vegetable juice', 'colored with vegetable juice', 'fruit juice color', 'vegetable juice concentrate',
    'spirulina extract', 'spirulina', 'black carrot', 'black carrot concentrate', 'purple carrot juice', 'radish concentrate', 'beet juice color',
    'plant based colors', 'natural colors', 'natural color', 'colour from vegetable sources',
  ]),
  c('artificial-colors', ['artificial-color'], ['artificial color', 'artificial colors', 'artificial coloring', 'certified color', 'certified colors']),
  c('yellow-6', ['artificial-color'], ['fd&c yellow 6', 'fd&c yellow no. 6', 'yellow no. 6', 'yellow 6 lake', 'fd&c yellow 6 lake', 'sunset yellow', 'e110']),
  c('blue-1', ['artificial-color'], ['fd&c blue 1', 'fd&c blue no. 1', 'blue no. 1', 'blue 1 lake', 'fd&c blue 1 lake', 'brilliant blue', 'e133']),
  c('blue-2', ['artificial-color'], ['fd&c blue 2', 'fd&c blue no. 2', 'blue no. 2', 'blue 2 lake', 'fd&c blue 2 lake', 'indigo carmine', 'e132']),
  c('red-3', ['artificial-color'], ['fd&c red 3', 'fd&c red no. 3', 'red no. 3', 'erythrosine', 'e127']),
  c('green-3', ['artificial-color'], ['fd&c green 3', 'fd&c green no. 3', 'fast green', 'e143']),
  c('carmine', [], ['cochineal extract', 'carminic acid', 'natural red 4', 'cochineal color'], { ambiguous: INSECT, ambiguousFor: ['meat', 'meat-derived'] }),
  c('shellac-glaze', [], ["confectioner's glaze", 'confectioners glaze', 'pharmaceutical glaze', 'resinous glaze', 'lac resin'], {
    name: "confectioner's glaze",
    ambiguous: INSECT,
    ambiguousFor: ['meat', 'meat-derived'],
  }),

  // additives named by their job
  c('preservative', ['preservative'], ['preservatives', 'antioxidant', 'antioxidants', 'acidity regulator', 'acidity regulators', 'acidulant', 'sequestrant', 'mold inhibitor', 'natural mold inhibitor']),
  c('emulsifier', ['emulsifier'], ['emulsifiers', 'emulsifying agent'], { ambiguous: ANIMAL_OR_PLANT, ambiguousFor: ['animal-fat', 'meat-derived'] }),
  c('stabilizer', ['thickener'], ['stabilizers', 'thickener', 'thickeners', 'thickening agent', 'gelling agent', 'firming agent', 'anticaking agent', 'anti caking agent', 'anti caking agents', 'bulking agent'], {
    ambiguous: 'The label does not name this thickener; a few, such as gelatin, come from animals.',
    ambiguousFor: ['gelatin', 'meat-derived'],
  }),
  c('leavening', ['chemical-leavening'], ['leavening agent', 'leavening agents', 'raising agent', 'raising agents', 'leaveners', 'leavening acids']),
  c('dough-conditioner', ['emulsifier'], ['dough conditioners', 'dough improver', 'flour treatment agent'], {
    ambiguous: 'Dough conditioners can include animal-derived ingredients such as L-cysteine; the label does not say which.',
    ambiguousFor: ['meat-derived', 'animal-fat'],
  }),
  c('sweetener', ['added-sugar', 'artificial-sweetener'], ['sweeteners', 'sweetening agent']),
  c('humectant', ['thickener'], [], { ambiguous: ANIMAL_OR_PLANT, ambiguousFor: ['animal-fat', 'meat-derived'] }),
  c('gum-base', [], ['chewing gum base'], { ambiguous: 'Gum base is a mix of resins, waxes and polymers the label does not list; some are animal-derived.', ambiguousFor: ANIMAL }),
  c('datem', ['emulsifier'], [
    'e472e', 'diacetyl tartaric acid esters of mono and diglycerides', 'diacetyl tartaric acid ester of mono and diglycerides',
    'diacetyl tartaric acid esters of mono and diglycerides of fatty acids', 'mono and diacetyl tartaric acid esters of mono and diglycerides of fatty acids',
  ]),
  c('propylene-glycol-esters', ['emulsifier'], ['propylene glycol monoesters', 'propylene glycol mono and diesters of fats and fatty acids', 'propylene glycol monostearate', 'e477']),
  c('glycerol-ester-of-rosin', ['emulsifier'], ['glycerol esters of wood rosin', 'glycerol ester of wood rosin', 'ester gum', 'e445']),
  c('edta', ['preservative'], ['calcium disodium edta', 'disodium edta', 'edta', 'calcium disodium ethylenediaminetetraacetate', 'e385']),
  c('calcium-stearate', ['emulsifier'], ['e470', 'stearic acid', 'magnesium stearate'], { ambiguous: ANIMAL_OR_PLANT, ambiguousFor: ['animal-fat', 'meat-derived'] }),
  c('cultured-dextrose', ['preservative'], ['cultured sugar', 'cultured corn sugar', 'fermented dextrose', 'cultured cane sugar']),
  c('cultured-celery', ['vegetable', 'preservative'], ['cultured celery powder', 'celery powder', 'cultured celery juice', 'celery juice powder']),
  c('caffeine', ['caffeine'], ['natural caffeine', 'caffeine anhydrous', 'caffeine from tea', 'caffeine from coffee']),
  c('taurine', [], ['l taurine']),
  c('medium-chain-triglycerides', ['plant-oil'], ['mct oil', 'medium chain triglyceride', 'medium chain triglyceride oil', 'mct']),
  c('interesterified-oil', ['plant-oil', 'solid-fat'], ['interesterified soybean oil', 'interesterified vegetable oil', 'fully hydrogenated soybean oil', 'fully hydrogenated vegetable oil']),
  c('allulose', ['added-sugar'], ['d allulose', 'psicose']),
  c('citrus-oil', [], ['orange oil', 'lime oil', 'lemon oil', 'grapefruit oil', 'tangerine oil', 'citrus oils', 'orange peel oil', 'cold pressed orange oil']),
  c('capers', ['vegetable'], ['caper']),
  c('hops', ['herb-spice'], ['hop extract']),
  c('rice-protein', ['grain', 'refined-grain'], ['brown rice protein', 'rice protein concentrate', 'rice protein isolate', 'brown rice protein concentrate']),
  c('amino-acids', [], [
    'l carnitine', 'l carnitine l tartrate', 'carnitine', 'l theanine', 'theanine', 'l glutamine', 'glutamine', 'l isoleucine', 'isoleucine',
    'l valine', 'valine', 'phenylalanine', 'l phenylalanine', 'glucuronolactone', 'l arginine', 'arginine', 'l lysine', 'lysine', 'l citrulline',
    'citrulline', 'beta alanine', 'l tyrosine', 'tyrosine', 'glycine', 'creatine', 'creatine monohydrate', 'l methionine', 'methionine', 'bcaas',
    'branched chain amino acids',
  ], { name: 'amino acids' }),
  c('seasoning', [], ['seasonings', 'seasoning blend', 'seasoning mix', 'spice mix'], {
    ambiguous: 'This is a prepared ingredient whose recipe varies; it may contain sugar, starch or other ingredients the label does not list.',
  }),
  c('vegetable-broth', ['vegetable'], ['vegetable stock', 'vegetable base'], {
    ambiguous: 'This is a prepared ingredient whose recipe varies; it may contain sugar, starch or other ingredients the label does not list.',
  }),
  c('tomato-sauce', ['vegetable'], ['marinara sauce', 'pizza sauce'], {
    ambiguous: 'This is a prepared ingredient whose recipe varies; it may contain sugar, starch or other ingredients the label does not list.',
  }),
  c('hydrogenated-starch-hydrolysate', ['sugar-alcohol'], ['hydrogenated starch hydrolysates', 'hsh', 'polyglycitol syrup']),
  c('psyllium', [], ['psyllium husk', 'psyllium husks', 'psyllium seed husk', 'psyllium fiber']),
  c('ginseng', ['herb-spice'], ['panax ginseng', 'panax ginseng root', 'ginseng root', 'american ginseng', 'korean ginseng', 'siberian ginseng']),
  c('licorice', ['herb-spice'], ['licorice root', 'liquorice root', 'licorice root extract']),
  c('hibiscus', ['herb-spice'], ['hibiscus flower', 'hibiscus flowers', 'hibiscus petals']),
  c('saffron', ['herb-spice'], []),
  c('wasabi', ['root-vegetable', 'herb-spice'], ['wasabia japonica']),
  c('curry-leaves', ['herb-spice'], ['curry leaf']),
  c('mizuna', ['leafy-green', 'vegetable'], []),
  c('frisee', ['leafy-green', 'vegetable'], ['frisee lettuce', 'curly endive']),
  c('quinine', [], []),
  c('menthol', [], ['l menthol']),
  c('propanediol', [], ['1 3 propanediol']),
  c('mycoprotein', ['mushroom'], ['fungal protein', 'mycoprotein paste']),
  c('koji', ['grain'], ['rice koji', 'aspergillus oryzae koji'], { ambiguous: GRAIN, ambiguousFor: ['refined-grain'] }),
  c('starter-distillate', ['dairy'], []),
  c('lysozyme', ['egg'], ['egg white lysozyme', 'lysozyme from egg']),
  c('collagen-casing', ['meat-derived', 'gelatin'], ['beef collagen casing', 'collagen casing', 'natural casing', 'pork casing', 'sheep casing', 'hog casing', 'casing']),
  c('flavor-enhancer', ['artificial-flavor'], ['flavor enhancers', 'flavour enhancer', 'flavor enhancer']),
  c('canola-lecithin', ['emulsifier'], ['rapeseed lecithin', 'canola lecithin']),
  c('aloe', ['vegetable'], ['aloe vera', 'aloe vera gel', 'aloe barbadensis leaf juice', 'aloe vera juice', 'aloe barbadensis', 'aloe leaf juice']),
  c('algal-oil', ['plant-oil'], ['dha algal oil', 'algal oil', 'schizochytrium sp oil', 'schizochytrium oil', 'mortierella alpina oil', 'ara oil', 'dha oil', 'microalgae oil']),
  c('squash', ['vegetable'], ['yellow squash', 'butternut squash', 'winter squash', 'summer squash', 'acorn squash', 'squashes']),
  c('tatsoi', ['leafy-green', 'vegetable'], []),
  c('aronia', ['fruit'], ['aronia berries', 'chokeberry', 'chokeberries']),
  c('crimini-mushroom', ['mushroom', 'vegetable'], ['crimini', 'cremini', 'crimini mushrooms', 'cremini mushrooms', 'baby bella mushrooms', 'portobello', 'portobello mushrooms', 'button mushrooms', 'white mushrooms']),
  c('worcestershire-sauce', [], ['worcestershire'], {
    ambiguous: 'Worcestershire sauce usually contains anchovies and sugar; the label does not list it.',
    ambiguousFor: ['fish', 'meat-derived', 'added-sugar'],
  }),
  c('mayonnaise', ['egg', 'plant-oil'], ['mayo'], {
    ambiguous: 'This is a prepared ingredient whose recipe varies; it may contain sugar, starch or other ingredients the label does not list.',
  }),
  c('mirin', ['alcohol', 'added-sugar'], ['aji mirin', 'sweet rice wine', 'rice wine']),
  c('bread-crumbs', ['grain', 'refined-grain', 'yeast'], ['breadcrumbs', 'breadcrumb coating', 'bread crumb', 'panko', 'panko bread crumbs', 'breading'], {
    ambiguous: 'This is a prepared ingredient whose recipe varies; it may contain sugar, starch or other ingredients the label does not list.',
  }),
  c('crisp-rice', ['grain', 'refined-grain'], ['crisp rice', 'crisp brown rice', 'brown rice crisps', 'rice crisps', 'crisped rice', 'puffed rice'], {
    ambiguous: 'Crisp rice usually contains sugar and malt; the label does not list it.',
    ambiguousFor: ['added-sugar', 'gluten'],
  }),
  c('vegetable-protein', [], ['hydrolyzed plant protein', 'plant protein', 'vegetable proteins'], {
    ambiguous: 'Vegetable protein is usually made from soy, wheat or corn; the label does not say which.',
    ambiguousFor: ['grain', 'gluten', 'legume', 'soy', 'refined-grain'],
  }),
  c('cysteine', [], ['l cysteine', 'l cysteine monohydrochloride', 'l cysteine hydrochloride', 'cysteine hydrochloride', 'e920'], {
    ambiguous: 'L-cysteine is often made from feathers or hair, sometimes by fermentation; the label does not say which.',
    ambiguousFor: ANIMAL,
  }),
  c('sugar-alcohol', ['sugar-alcohol', 'added-sugar'], ['sugar alcohols', 'polyols']),
  c('isomaltooligosaccharides', ['added-sugar'], ['isomalto oligosaccharides', 'isomaltooligosaccharide', 'imo']),
  c('nucleotides', [], [
    "disodium guanosine 5' monophosphate", "adenosine 5' monophosphate", "cytidine 5' monophosphate", "disodium uridine 5' monophosphate",
    "disodium inosine 5' monophosphate", 'nucleotides', 'cytidine 5 monophosphate', 'adenosine 5 monophosphate',
  ]),
  c('plant-sterols', [], ['plant sterol esters', 'plant sterol', 'plant stanol esters', 'plant stanols', 'phytosterols', 'phytosterol esters']),
  c('beef-tallow', ['animal-fat', 'meat-derived', 'solid-fat'], ['tallow', 'beef suet', 'suet', 'edible tallow']),
]

/** Extra label spellings for entries that already exist (seed or imported). */
export const CURATED_ALIASES: Record<string, string[]> = {
  'wholemeal-rye-flour': ['whole rye flour', 'whole rye', 'whole grain rye'],
  'thiamine-mononitrate': [
    'thiamin', 'thiamin mononitrate', 'thiamin hydrochloride', 'thiamine hydrochloride', 'thiamine hcl', 'b1', 'vitamin b1', 'mononitrate',
  ],
  riboflavin: ['b2', 'vitamin b2', 'riboflavin 5 phosphate'],
  niacin: ['niacinamide', 'nicotinamide', 'b3', 'vitamin b3', 'nicotinic acid'],
  'folic-acid': ['b9', 'vitamin b9', 'folacin', 'folates', 'calcium l methylfolate', 'l methylfolate', 'methylfolate', '5 mthf'],
  'vitamin-d': ['d2', 'd3', 'vitamin d2', 'ergocalciferol', 'cholecalciferol', 'vitamin d3 cholecalciferol'],
  'vitamin-e': [
    'vitamin e acetate', 'dl alpha tocopheryl acetate', 'd alpha tocopheryl acetate', 'dl alpha tocopherol', 'tocopheryl acetate',
    'alpha tocopheryl acetate', 'mixed tocopherols for freshness', 'alpha tocopherol acetate', 'd alpha tocopherol acetate', 'd alpha tocopherol',
  ],
  salt: ['sodium chloride', 'sel', 'sel de mer', 'sal', 'himalayan crystal salt', 'chilean salt', 'pink himalayan salt', 'sea salt flakes'],
  'citric-acid': ['acide citrique', 'acido citrico', 'citric', 'naturally derived citric acid'],
  milk: ['lait', 'lait ecreme', 'leche', 'whole milk', 'grade a milk', 'milk from cows', 'reduced fat milk'],
  spices: ['epices', 'especias', 'spice extractives', 'spice extractive', 'spice extracts', 'spice blend', 'spices and herbs'],
  garlic: ['ail', 'ajo', "poudre d'ail", 'garlic powder'],
  onion: ['oignon', 'oignons', 'cebolla', "poudre d'oignon"],
  'modified-corn-starch': ['amidon de mais modifie', 'amidon de mais', 'modified cornstarch', 'modified food starch corn'],
  'wheat-flour': [
    'farine de ble', 'farine de ble enrichie', 'wheatflour', 'fermented wheat flour', 'cultured wheat flour', 'wheat flour blend',
    'unbleached unbromated wheat flour', 'unbromated wheat flour',
  ],
  'vegetable-oil': ['huile vegetale', 'huile de canola', 'aceite vegetal'],
  water: ['eau', 'agua', 'reverse osmosis water', 'purified carbonated water'],
  sugar: [
    'date syrup', 'caramel syrup', 'candy sugar syrup', 'anhydrous dextrose', 'crystalline fructose', 'corn sugar', 'refinery syrup',
    "refiner's syrup", 'milled cane sugar', 'coconut nectar', 'coconut sugar', 'palm sugar', 'cane sugar syrup', 'golden syrup', 'treacle',
    'muscovado sugar', 'demerara sugar', 'turbinado sugar', 'raw cane sugar', 'sucrose', 'fructose', 'dextrose monohydrate', 'invert syrup',
    'invert cane sugar', 'sugar syrup', 'sucre', 'evaporated cane juice', 'organic cane sugar', 'beet sugar', 'cane juice', 'golden sugar',
    'sugar cane', 'sucre de canne', 'azucar', 'sukker', 'zucker', 'suiker', 'golden cane sugar',
  ],
  'sodium-citrates': ['sodium citrate', 'trisodium citrate', 'citrate de sodium'],
  'mono-and-diglycerides': [
    'mono & diglycerides', 'monoglycerides', 'distilled monoglycerides', 'vegetable mono and diglycerides', 'ethoxylated mono and diglycerides',
    'mono and diglyceride', 'monoglycerides and diglycerides', 'mono diglycerides', 'vegetable monoglycerides', 'mono and di glycerides',
    'mono and di glycerides of fatty acids', 'mono and diglycerides of fatty acids', 'mono and diglycerides of vegetable fatty acids',
    'vegetable mono & diglycerides', 'soy mono and diglycerides', 'monoglyceride', 'distilled monoglyceride', 'glycerol monostearate',
    'glyceryl stearate', 'glyceryl monostearate', 'acetylated monoglycerides', 'acetylated monoglyceride',
    'stabilized and emulsified by mono and diglycerides',
  ],
  'soy-lecithin': ['soybean lecithin', 'soya lecithin', 'lecithin soy', 'soy lecithin an emulsifier'],
  whey: [
    'whey protein isolate', 'whey solids', 'reduced lactose whey', 'modified whey', 'cultured whey', 'sweet whey', 'whey powder', 'dried whey',
    'whey protein', 'whey protein concentrate', 'sweet dairy whey', 'dairy whey', 'reduced minerals whey', 'whey protein hydrolysate',
    'hydrolyzed whey protein', 'hydrolyzed whey protein isolate', 'reduced protein whey', 'demineralized whey',
  ],
  cream: ['sweet cream', 'heavy cream', 'whipping cream', 'light cream', 'sweet cream buttermilk', 'dairy cream', 'creme', 'creme fraiche'],
  buttermilk: [
    'buttermilk powder', 'dried buttermilk', 'cultured buttermilk', 'buttermilk solids', 'sweetcream buttermilk', 'sweet cream buttermilk powder',
  ],
  chicken: [
    'mechanically separated chicken', 'chicken breast with rib meat', 'white meat chicken', 'chicken meat', 'dark meat chicken',
    'chicken breast meat', 'boneless skinless chicken breast', 'chicken breast meat with rib meat', 'chicken white meat', 'white chicken',
    'chicken wing sections', 'chicken wings', 'chicken thighs', 'chicken thigh meat', 'chicken breast',
  ],
  turkey: ['mechanically separated turkey', 'turkey broth', 'turkey meat', 'white turkey', 'turkey breast', 'turkey stock'],
  'wheat-starch': ['cultured wheat starch'],
  cornstarch: ['cornflour', 'modified cornflour', 'modified corn flour starch', 'corn starch modified'],
  'corn-flour': [
    'corn meal', 'yellow corn meal', 'white corn meal', 'whole grain corn meal', 'stone ground corn meal', 'masa harina', 'corn masa flour',
    'organic blue cornmeal', 'blue cornmeal', 'yellow cornmeal', 'white cornmeal', 'whole grain yellow corn flour', 'whole grain cornmeal',
    'whole yellow corn flour', 'yellow corn masa', 'corn cereal', 'corn masa',
  ],
  oats: [
    'whole oat flour', 'whole grain oat flour', 'whole grain oats', 'whole rolled oats', 'whole oats', 'oat grits', 'organic whole rolled oats',
    'oat groats', 'whole grain rolled oats', 'steel cut oats',
  ],
  'brown-rice': ['whole grain brown rice flour', 'whole grain brown rice', 'brown rice flour'],
  'cocoa-paste': [
    'unsweetened chocolate', 'chocolate liquor', 'cocoa liquor', 'cocoa mass', 'bitter chocolate', 'baking chocolate',
    'chocolate liquor processed with alkali', 'chocolate processed with alkali', 'cacao liquor', 'cocoa mass processed with alkali', 'cacao paste',
    'unsweetened chocolate processed with alkali',
  ],
  cocoa: [
    'cocoa processed with alkali', 'cocoa powder processed with alkali', 'alkalized cocoa', 'dutch cocoa', 'dutched cocoa',
    'cocoa powder alkalized', 'cocoa alkali processed', 'natural and processed with alkali',
  ],
  'yellow-5': ['fd&c yellow 5', 'fd&c yellow no. 5', 'yellow no. 5', 'yellow 5 lake', 'fd&c yellow 5 lake'],
  'red-40': ['fd&c red 40', 'fd&c red no. 40', 'red no. 40', 'red 40 lake', 'fd&c red 40 lake', 'allura red'],
  'natural-flavors': [
    'natural vanilla flavor', 'vanilla flavor', 'natural vanilla flavoring', 'natural butter flavor', 'natural flavoring', 'natural flavorings',
    'other natural flavors', 'natural flavor blend', 'coconut extract', 'natural flavors and spices', 'organic natural flavor',
    'natural fruit flavors', 'natural citrus flavor', 'natural lemon flavor', 'natural vanilla extract flavor', 'citrus extract', 'lemon extract',
    'orange extract', 'almond extract', 'lime extract', 'peppermint extract', 'arome naturel', 'aromes naturels', 'natural flavour preparation',
  ],
  'paprika-extract': [
    'extractives of paprika', 'extractive of paprika', 'paprika extractives', 'paprika oleoresin color', 'oleoresin paprika',
    'paprika extract color',
  ],
  annatto: [
    'annatto extract', 'annatto extract color', 'annatto color', 'annatto extract for color', 'annatto seed extract', 'extractives of annatto',
    'annato', 'annatto coloring', 'annatto vegetable', 'annatto vegetable color',
  ],
  'microcrystalline-cellulose': ['cellulose gel'],
  cellulose: ['modified cellulose', 'cellulose powder', 'powdered cellulose'],
  'agar-seaweed': ['agar', 'agar agar', 'e406'],
  dextrin: ['tapioca dextrin', 'corn dextrin', 'potato dextrin', 'wheat dextrin'],
  tamarinds: ['tamarind', 'tamarind extract', 'tamarind paste', 'tamarind pulp'],
  stevia: [
    'stevia extract', 'stevia leaf extract', 'rebaudioside a', 'reb a', 'steviol glycosides', 'stevia rebaudiana', 'reb m', 'rebaudioside m',
    'purified stevia leaf extract', 'stevia sweetener', 'stevia leaf', 'stevia rebaudiana leaf extract', 'stevia rebaudiana bertoni leaf extract',
  ],
  'hydrogenated-oil': [
    'hydrogenated soybean oil', 'partially hydrogenated soybean oil', 'partially hydrogenated soybean', 'partially hydrogenated palm kernel oil',
    'hydrogenated palm kernel oil', 'partially hydrogenated cottonseed oil', 'hydrogenated cottonseed oil', 'hydrogenated coconut oil',
    'partially hydrogenated vegetable oil', 'hydrogenated vegetable oil', 'hydrogenated rapeseed oil', 'partially hydrogenated canola oil',
    'partially hydrogenated coconut oil', 'fully hydrogenated rapeseed oil',
  ],
  'palm-oil': [
    'palm kernel', 'palm kernel and palm oil', 'palm fat', 'palm kernel fat', 'fractionated palm kernel oil', 'palm fractions', 'palm olein oil',
    'palm olein', 'palm stearin', 'fractionated palm oil',
  ],
  'mustard-seed': [
    'mustard', 'mustard seeds', 'prepared mustard', 'yellow mustard', 'ground mustard', 'dijon mustard', 'stone ground mustard',
    'whole grain mustard', '1 grade mustard seed', '1 mustard seed',
  ],
  alcohol: ['ethyl alcohol', 'ethanol', 'alcohol', 'bourbon', 'whiskey', 'rum', 'vodka', 'brandy', 'alcohol denat'],
  egg: ['pasteurized egg', 'eggs', 'whole egg', 'whole eggs', 'liquid egg', 'dried egg', 'egg powder'],
  'cayenne-pepper': ['aged cayenne red peppers', 'cayenne red peppers', 'aged red peppers', 'red pepper flakes', 'crushed red pepper'],
  'lemon-juice': ['lemon juice solids', 'lemon juice powder', 'lime juice solids', 'lime juice powder'],
  'grape-juice': ['grape juice concentrate', 'concord grape juice'],
  'white-grape-juice': ['white grape juice concentrate'],
  'cherry-juice': ['cherry juice concentrate', 'tart cherry juice concentrate'],
  vinegar: ['vinegar powder', 'dried vinegar', 'white distilled vinegar', 'cane vinegar', 'vinaigre', 'rice vinegar'],
  soybean: ['soybean seed', 'soybeans', 'soya beans'],
  'sunflower-seed': ['sunflower kernels', 'sunflower seeds', 'sunflower seed butter', 'sunflower butter'],
  'canola-oil': [
    'canola and or sunflower oil', 'high oleic canola', 'canola oil blend', 'canola', 'non hydrogenated canola oil', 'expeller pressed canola',
  ],
  'barley-malt-extract': [
    'malt extract', 'malted barley extract', 'malt flavor', 'malted barley syrup', 'barley malt syrup', 'malt syrup',
    'malted barley flour extract', 'barley malt', 'malt barley flour', 'malted wheat', 'malted barley flour', 'kibbled malted wheat',
    'malted wheat flakes',
  ],
  'peanut-flour': ['partially defatted peanut flour', 'defatted peanut flour'],
  peanut: ['partially defatted peanuts', 'defatted peanuts'],
  'carbon-dioxide': ['co2'],
  cultures: [
    'lactic ferments', 'lactic ferment', 'ferments', 'thermophilus', 'bulgaricus', 'acidophilus cultures', 'penicillium roqueforti',
    'penicillium candidum', 'penicillium camemberti', 'aspergillus oryzae', 'kombucha culture', 'scoby', 'live active cultures',
    'bacillus coagulans gbi 30 6086', 'culture bacterienne', 'cultures bacteriennes', 'active bacterial cultures', 'probiotic', 'koji spores',
  ],
  msg: ['flavor enhancer e621', 'e621', 'monosodium glutamate'],
  corn: [
    'whole corn', 'whole kernel yellow corn', 'blue corn', 'whole grain yellow corn', 'whole grain popping corn', 'popping corn',
    'whole grain popcorn', 'popcorn', 'popcorn kernels',
  ],
  'degerminated-corn-meal': ['corn grits', 'hominy grits', 'grits', 'degermed yellow corn meal', 'degermed yellow cornmeal'],
  'rye-flour': ['fermented rye flour', 'rye meal', 'whole rye meal'],
  coffee: [
    'soluble coffee', 'instant coffee granules', 'coffee extract', 'coffee extracts', 'instant coffee powder', 'brewed coffee',
    'green coffee bean extract', 'green coffee extract',
  ],
  flaxseed: [
    'whole flax seeds', 'ground whole flax seeds', 'whole flaxseed', 'flax meal', 'flaxseed meal', 'ground flax', 'milled flaxseed',
    'golden flaxseed', 'flax seeds', 'flax',
  ],
  pea: ['pea flour', 'yellow pea flour', 'split pea flour'],
  'bell-pepper': ['yellow pepper', 'yellow peppers', 'yellow bell pepper', 'orange bell pepper', 'sweet peppers', 'sweet pepper'],
  'vitamin-k': ['menaquinone 7', 'mk 7', 'vitamin k2 mk 7'],
  'vegetable-fiber': [
    'dietary fiber', 'fiber', 'prebiotic fiber', 'carrot fiber', 'sugarcane fiber', 'cellulose fiber', 'soluble vegetable fiber', 'soy fiber',
    'beet fiber',
  ],
  'wheat-fiber': ['soluble wheat fiber'],
  'microbial-enzymes': ['bromelain', 'papain', 'cellulase', 'protease', 'lipase from microbial source', 'fungal lactase'],
  stabilizer: ['anti caking', 'carbohydrate gum', 'vegetable gum', 'vegetable gums', 'gums'],
  sweetener: ['non nutritive sweetener', 'nonnutritive sweetener', 'high intensity sweetener'],
  edta: ['tetrasodium edta'],
  pectin: ['citrus pectin', 'apple pectin', 'fruit pectin'],
  'acacia-gum': ['acacia', 'acacia senegal', 'gum acacia'],
  'pumpkin-seed': ['pumpkin seed protein', 'pumpkin seed powder', 'pepitas'],
  'monk-fruit': [
    'monk fruit juice concentrate', 'monk fruit extract', 'luo han guo', 'monk fruit juice', 'monkfruit extract', 'monkfruit',
    'monk fruit sweetener',
  ],
  'sesame-seed': ['black sesame seeds', 'sesame flour', 'white sesame seeds', 'toasted sesame seeds', 'black sesame'],
  casein: ['rennet casein', 'acid casein', 'sodium caseinate', 'calcium caseinate', 'caseinate'],
  butterfat: [
    'butteroil', 'butter oil', 'anhydrous milkfat', 'anhydrous milk fat', 'milk fat', 'milkfat', 'lipolyzed butter oil', 'lipolyzed butterfat',
  ],
  tragacanth: ['gum tragacanth', 'tragacanth gum'],
  sucralose: ['splenda brand', 'splenda'],
  sulfites: ['sulfiting agents', 'sulphiting agents', 'sulfite', 'sulfiting agent', 'sulphite'],
  whiting: ['pacific whiting'],
  'spring-onion': ['scallion', 'scallions', 'green onions'],
  potato: ['red potatoes', 'russet potatoes', 'yukon gold potatoes', 'white potatoes', 'potato protein'],
  'wheat-germ': ['defatted wheat germ', 'toasted wheat germ'],
  'whole-wheat-flour': [
    'whole durum wheat flour', 'whole grain durum wheat flour', 'whole wheat durum flour', 'whole grain whole wheat flour',
    'white whole wheat flour', 'whole wheat graham flour', 'graham flour', 'hard red wheat', 'hard red winter wheat', 'bulgar wheat',
    'bulgur wheat', 'bulgur', 'cracked wheat', 'wheatberries', 'wheat berries',
  ],
  'nutritional-yeast': ['inactive yeast', 'inactive dry yeast', 'dried inactive yeast'],
  molasses: ['blackstrap molasses', 'cane molasses', 'sugarcane molasses', 'sugar cane molasses'],
  'pinto-beans': ['prepared pinto beans'],
  'black-bean': ['prepared black beans'],
  'white-beans': ['prepared white beans'],
  beans: ['prepared beans', 'cooked beans'],
  'coconut-water': ['coconut water concentrate'],
  'lactic-acid-esters-of-mono-and-diglycerides-of-fatty-acids': ['glyceryl lacto esters of fatty acids', 'lactylated mono and diglycerides'],
  'sucrose-esters-of-fatty-acids': ['sucrose fatty acid esters'],
  tapioca: ['cassava starch', 'tapioca fiber', 'soluble tapioca fiber', 'cassava flour', 'cassava root fiber'],
  'broad-bean': ['faba bean protein', 'fava bean protein', 'faba bean preparation', 'fava bean preparation'],
  palm: ['palm fruit', 'palm fruit oil'],
  'modified-palm-oil': ['modified palm and palm kernel oil', 'modified palm and palm kernel oils', 'modified palm kernel oil', 'palm oil shortening'],
  'chicken-fat': ['rendered chicken fat'],
  'pork-rind': ['fried pork skins', 'pork skins', 'pork cracklings'],
  pepperoni: ['pepperoni made with pork', 'pepperoni made with pork and beef', 'pork and beef pepperoni'],
  'disodium-inosinate': [
    'disodium inosinate and guanylate', 'disodium inosinate and disodium guanylate', 'disodium guanylate and disodium inosinate',
    'disodium guanylate and inosinate',
  ],
  'chili-pepper': [
    'red jalapeno peppers', 'jalapeno peppers', 'jalapenos', 'jalapeno', 'poblano peppers', 'poblano', 'serrano peppers', 'habanero peppers',
    'green chiles', 'green chilies', 'chipotle peppers', 'chipotle chili pepper', 'ancho chili pepper', 'poblano pepper',
    'chili pepper and other spices', 'guajillo chili', 'ancho chile', 'chipotle chile',
  ],
  turmeric: ['turmeric extract color', 'turmeric color', 'turmeric oleoresin', 'turmeric coloring', 'turmeric for color'],
  carrageenan: ['carrageenan gum'],
  'chia-seed': ['salvia hispanica', 'chia seeds', 'chia'],
  'baking-soda': ['sodium acid carbonate'],
  'baking-powder': ['calcium acid pyrophosphate'],
  'caramel-color': [
    'caramel e150d', 'caramel e150a', 'caramel e150c', 'caramel colour', 'plain caramel', 'sulphite ammonia caramel', 'carmel', 'carmel color',
    'caramel coloring',
  ],
  'magnesium-chloride': ['nigari'],
  'smoke-flavor': ['beechwood smoke', 'natural wood smoke', 'natural hardwood smoke', 'hardwood smoke', 'wood smoke'],
  'reduced-iron': ['iron', 'ferrous sulfate', 'ferric citrate', 'elemental iron'],
  'cocoa-nibs': ['cacao nibs'],
  'artificial-flavor': ['artificial vanilla flavor', 'artificial butter flavor', 'vanillin an artificial flavor', 'artificial vanilla'],
  'natural-and-artificial-flavors': ['natural and artificial vanilla flavor', 'natural & artificial vanilla flavor'],
  'soybean-oil': ['soy bean oil', 'high oleic soybean oil', 'high oleic soybean', 'liquid soybean oil', 'soybean oil blend'],
  'sunflower-oil': [
    'safflower', 'safflower concentrate', 'expeller pressed high oleic safflower', 'high oleic safflower', 'high oleic sunflower', 'safflower oil',
  ],
  'hydrolyzed-corn-protein': ['hydrolyzed corn'],
  'soy-protein': ['hydrolyzed soy', 'modified soy protein', 'enzyme modified soy protein', 'defatted soybean', 'soy protein product'],
  datem: [
    'mono and di acetyl tartaric acid esters of mono and di glycerides of fatty acids',
    'mono and diacetyltartaric acid esters of mono and diglycerides of fatty acids',
  ],
  'milk-protein': ['milk ingredient', 'substances laitieres modifiees', 'skim cows milk powder', 'skim milk powder'],
  'propylene-glycol-esters': [
    'propylene glycol monoester', 'propylene glycol esters of fatty acids', 'propylene glycol mono and diesters of fatty acids',
    'propylene glycol mono and diesters', 'propylene glycol mono & diesters of fatty acids',
  ],
  'medium-chain-triglycerides': ['caprylic capric triglyceride', 'caprylic/capric triglycerides', 'caprylic capric triglycerides'],
  tea: ['tea extract', 'brewed black tea', 'black tea', 'green tea', 'green tea extract', 'brewed green tea', 'black tea extract'],
  'vegetable-color': ['grape skin extract', 'beet red', 'grape skin extract color'],
  'guar-gum': ['guar', 'guar gum powder'],
  'trace-minerals': ['iron phosphate', 'iron as ferrous sulfate', 'chromium polynicotinate'],
  'silicon-dioxide': ['silicone dioxide', 'silica', 'hydrated silica'],
  'mineral-oil': ['white mineral oil'],
  'beef-tallow': ['hydrogenated tallow'],
  tomato: [
    'tomato concentrate from red ripe tomatoes', 'sundried tomato', 'sun dried tomatoes', 'tomatoes with juice', 'diced tomatoes in juice',
    'tomato concentrate',
  ],
  'oat-fiber': ['isolated oat product'],
  chickpea: ['chickpea protein', 'steamed chickpeas', 'chickpea flour', 'garbanzo bean flour', 'besan', 'gram flour'],
  'hemp-seed': ['hemp protein', 'hemp seeds', 'hemp hearts', 'hulled hemp seeds'],
  almond: ['almond protein', 'almond flour', 'blanched almond flour', 'almond meal'],
  'amino-acids': ['l tryptophan', 'tryptophan'],
  'vanilla-seeds': ['vanilla bean seeds', 'vanilla bean specks', 'vanilla beans seeds', 'ground vanilla bean'],
  'white-rice': ['glutinous rice flour', 'sweet rice flour', 'mochiko'],
  olive: ['queen olives', 'ripe olives', 'black olives', 'green olives', 'kalamata olives'],
  clam: ['clam broth', 'clam juice'],
  barley: ['whole grain barley'],
  quinoa: ['whole grain quinoa', 'organic quinoa', 'tricolor quinoa'],
  'xanthan-gum': ['xantham gum', 'xanthum gum'],
  quinine: ['quinine hydrochloride', 'quinine sulfate'],
  maltodextrin: ['rice maltodextrin'],
  'corn-syrup': ['high maltose corn syrup', 'high fructose', 'com syrup', 'corn syrup solids', 'glucose syrup solids'],
  inulin: ['chicory fiber syrup', 'chicory root syrup', 'soluble fiber'],
  'sodium-carboxy-methyl-cellulose': [
    'sodium carboxymethyl cellulose', 'modified cellulose gum', 'carboxymethylcellulose', 'carboxymethyl cellulose', 'cmc',
  ],
  'sodium-alginate': [],
  'shellac-glaze': ["confectioners' glaze", 'confectioner glaze'],
  'sodium-benzoate': ['benzoate of soda', 'benzoate de sodium'],
  'cocoa-butter': ['non dairy cocoa butter'],
  'yeast-extract': ['extrait de levure', 'levure'],
  'potassium-sorbate': ['sorbate de potassium', 'potassium sorbate preservative'],
  'calcium-chloride': ['chlorure de calcium'],
};

type Fix = { categories?: Category[]; ambiguous?: string | null; ambiguousFor?: Category[] };
const ok = (categories: Category[] = []): Fix => ({ categories, ambiguous: null });
const animal = (categories: Category[] = []): Fix => ({ categories, ambiguous: ANIMAL_OR_PLANT, ambiguousFor: ['animal-fat', 'meat-derived'] });

/**
 * Corrections to imported entries, by id. Most are food additives the import
 * marked "not classified yet", which made every product with, say, lactic
 * acid uncertain. `ambiguous: null` removes the flag.
 */
export const RECLASSIFIED: Record<string, Fix> = {
  // acids and their salts (acidity regulators and preservatives); none is animal-derived
  ...Object.fromEntries([
    'adipic-acid', 'lactic-acid', 'malic-acid', 'fumaric-acid', 'gluconic-acid', 'succinic-acid', 'metatartaric-acid', 'phytic-acid',
    'hydrochloric-acid', 'sulphuric-acid', 'erythorbin-acid', 'formic-acid', 'boric-acid', 'dehydroacetic-acid', 'sodium-dehydroacetate',
    'ammonium-acetate', 'ammonium-adipate', 'ammonium-chloride', 'ammonium-fumarate', 'ammonium-hydroxide', 'ammonium-lactate', 'ammonium-malate',
    'ammonium-sulphate', 'calcium-bisulphite', 'calcium-erythorbin', 'calcium-formiate', 'calcium-fumarate', 'calcium-hydrogen-malate',
    'calcium-hydroxide', 'calcium-malate', 'calcium-malates', 'calcium-oxide', 'calcium-sulphite', 'calcium-tartrate', 'calcium-lactobionate',
    'dipotassium-tartrate', 'disodium-succinate', 'monopotassium-tartrate', 'monosodium-succinate', 'potassium-adipate', 'potassium-bisulphite',
    'potassium-fumarate', 'potassium-hydrogen-malate', 'potassium-hydroxide', 'potassium-malate', 'potassium-hydrogen-sulphate', 'potassium-tartrates',
    'sodium-adipate', 'sodium-formiate', 'sodium-fumarate', 'sodium-hydrogen-malate', 'sodium-hydroxide', 'sodium-malate', 'sodium-malates',
    'sodium-hydrogen-sulphate', 'sodium-succinates', 'triammonium-citrate', 'e351-ii', 'buffered-vinegar', '1-4-heptonolactone',
    '4-hexylresorcinol', 'ethoxyquin', 'ethyl-gallate', 'octyl-gallate', 'formaldehyde', 'heptylparaben', 'propyl-para-hydroxybenzoate',
    'sodium-ethyl-p-hydroxybenzoate', 'sodium-methyl-p-hydroxybenzoate', 'sodium-propyl-para-hydroxybenzoate', 'thiabendazole', 'anoxomer',
    'sodium-tetraborate-borax', 'e390',
  ].map((id) => [id, ok(['preservative'])])),
  'potassium-ascorbate': ok(['vitamin-mineral', 'preservative']),
  'extracts-of-rosemary': ok(['herb-spice', 'preservative']),
  ...Object.fromEntries(['alpha-tocopherol', 'delta-tocopherol', 'gamme-tocopherol', 'tocopherol-rich-extract'].map((id) => [id, ok(['vitamin-mineral', 'preservative'])])),
  // mineral salts used as nutrients, firming agents or anti-caking agents
  ...Object.fromEntries([
    'magnesium-carbonate', 'magnesium-carbonates', 'magnesium-citrate', 'magnesium-gluconate', 'magnesium-hydroxide', 'magnesium-hydroxide-carbonate',
    'magnesium-lactate', 'magnesium-oxide', 'magnesium-pyrophosphate', 'magnesium-sulphate', 'iron-gluconate', 'ferrous-carbonate', 'ferrous-lactate',
    'ferric-ammonium-citrate', 'calcium-glycerophosphate', 'calcium-iodate', 'potassium-iodate', 'calcium-peroxide', 'copper-sulphate', 'zinc-acetate',
    'choline-acetate', 'choline-carbonate', 'choline-citrate', 'choline-lactate', 'choline-salt', 'choline-tartrate', 'e1001-iii', 'potassium-sulphate',
    'potassium-sulphates', 'sodium-sulphate', 'sodium-sulphates', 'flavin-mononucleotide', 'e642', 'e638',
  ].map((id) => [id, ok(['vitamin-mineral'])])),
  ...Object.fromEntries(['ammonium-carbonate', 'ammonium-carbonates', 'ammonium-hydrogen-carbonate', 'calcium-hydrogen-carbonate', 'carbonates'].map((id) => [id, ok(['chemical-leavening'])])),
  ...Object.fromEntries([
    'silicon-dioxide', 'calcium-silicate', 'aluminium-silicate', 'calcium-aluminium-silicate', 'potassium-aluminium-silicate', 'sodium-aluminium-silicate',
    'sodium-silicate', 'sodium-metasilicate', 'e550-i', 'potassium-silicate', 'bentonite', 'hemimorphite', 'calcium-ferrocyanide', 'potassium-ferrocyanide',
    'sodium-ferrocyanide', 'ferrous-hexacyanomanganate', 'aluminium-potassium-sulphate', 'aluminium-sodium-sulphate', 'aluminium-sulphate', 'e543-food-additive',
    'arabinogalactan', 'benzoin-resin', 'gum-guaicum', 'esters-of-colophane', 'carbomer', 'anionic-methacrylate-copolymer', 'basic-methacrylate-copolymer',
    'neutral-methacrylate-copolymer', 'polyethylene-glycol', 'polyvinyl-alcohol-polyethylene-glycol-graft-co-polymer', 'polyvinylpyrrolidone-vinyl-acetate-copolymer',
    'dimethylpolysiloxane-and-methylphenylpolysiloxane', 'methylphenylpolysiloxane', 'hydrogenated-poly-1-decene', 'e411-food-additive',
  ].map((id) => [id, ok(['thickener'])])),
  'bakers-yeast-glycan': ok(['yeast', 'thickener']),
  'soybean-hemicellulose': ok(['soy', 'thickener']),
  'methyl-glucoside-coconut-oil-ester': ok(['emulsifier']),
  'superglycerinated-hydrogenated-rapeseed-oil': ok(['emulsifier', 'hydrogenated-fat']),
  'brominated-vegetable-oil': ok(['plant-oil', 'emulsifier']),
  'ethoxylated-mono-and-di-glycerides': ok(['emulsifier']),
  'sodium-dodecyl-sulfate': ok(['emulsifier']),
  // made from fatty acids, which can be animal or plant
  ...Object.fromEntries([
    'aluminium-stearate', 'sorbitan-trioleate', 'succistearin', 'calcium-stearoyl-fumarate', 'sodium-stearoyl-fumarate', 'glyceryl-diacetate', 'e571',
    'lecithin-citrate',
  ].map((id) => [id, animal(['emulsifier'])])),
  peptone: { categories: [], ambiguous: 'Peptone is a protein digest, often from meat or milk; the label does not say which.', ambiguousFor: ANIMAL },
  leucine: { categories: [], ambiguous: ANIMAL_OR_PLANT, ambiguousFor: ANIMAL },
  spermaceti: ok(['meat-derived', 'animal-fat']),
  // faba beans are a legume, not only a vegetable (Whole30 excludes them)
  'broad-bean': { categories: ['legume', 'vegetable'] },
  // enzymes: may come from animals (amylase from pancreas)
  ...Object.fromEntries(['alpha-amylase', 'e1100-i', 'e1100-ii', 'e1100-iii', 'e1100-v', 'e1100-vi'].map((id) => [id, {
    categories: [], ambiguous: 'Enzymes can come from microbes, plants or animals; the label does not say which.', ambiguousFor: ANIMAL,
  } satisfies Fix])),
  // flavour enhancers, sweet-tasting flavours, amino acids
  ...Object.fromEntries(['calcium-diglutamate', 'magnesium-diglutamate', 'monoammonium-glutamate', 'monopotassium-glutamate', 'glutamic-acid'].map((id) => [id, ok(['artificial-flavor'])])),
  'ethyl-maltol': ok(['artificial-flavor']),
  maltol: ok([]),
  alanin: ok([]),
  // colours: synthetic dyes are artificial; plant, mineral and metal colours are not
  ...Object.fromEntries([
    'black-7984', 'brown-fk', 'citrus-red-2', 'fast-yellow-ab', 'green-s', 'indanthrene-blue-rs', 'litholrubine-bk', 'orange-ggn', 'patent-blue-v',
    'ponceau-6r', 'scarlet-gn', 'yellow-2g', 'citranaxanthin', 'caramel',
  ].map((id) => [id, ok(['artificial-color'])])),
  ...Object.fromEntries([
    'alkannin', 'xanthophylls', 'cryptoaxanthin', 'flavoxanthin', 'rhodoxanthin', 'rubixanthin', 'violaxanthin', 'gardenia-blue', 'sandalwood', 'orcein',
    'vegetable-carbon', 'gold', 'silver', 'aluminium',
  ].map((id) => [id, ok([])])),
  astaxanthin: { categories: [], ambiguous: 'Astaxanthin can come from algae or from shrimp and krill; the label does not say which.', ambiguousFor: ['fish', 'shellfish'] },
  // flour treatment agents, gases, waxes, solvents: no diet restricts them
  ...Object.fromEntries([
    'acetone-peroxide', 'azodicarbonamide', 'azodicarbonamide-and-carbamide', 'carbamide', 'calcium-bromate', 'potassium-bromate', 'e924',
    'ammonium-persulfate', 'potassium-persulfate', 'chlorine', 'chlorine-dioxide', 'argon', 'butane', 'isobutane', 'propane', 'helium', 'hydrogen',
    'nitrogen', 'e931', 'nitrogen-oxide', 'nitrogen-oxides', 'nitrosyl-chloride', 'oxygen', 'chloropentafluoroethane', 'dichlorodifluoromethane',
    'octafluorocyclobutane', 'carnauba-wax', 'rice-bran-wax', 'microcrystalline-wax', 'paraffin-wax', 'petroleum-wax', 'petroleum-jelly', 'synthetic-wax',
    'oxidised-polyethylene-wax', 'montanic-acid-esters', 'mineral-oil', 'mineral-oil-high-viscosity', 'mineral-oil-medium-and-low-viscosity-class-ii',
    'mineral-oil-medium-and-low-viscosity-class-iii', 'mineral-oil-medium-viscosity', 'benzyl-alcohol', 'ethyl-acetate', 'fatty-acid-methyl-ester',
    'glycolipids', 'spiramycin', 'tylosin',
  ].map((id) => [id, ok([])])),
};

/**
 * Imported ambiguity messages, and the categories each doubt is about. An
 * ingredient with one of these is uncertain only under rules that restrict
 * one of the categories, so "whole or refined grain?" no longer makes rye
 * bread uncertain on an Orthodox fast day. Messages not listed here stay
 * uncertain under every diet.
 */
export const AMBIGUITY_SCOPE: Record<string, Category[]> = {
  [GRAIN]: ['refined-grain'],
  'Bran is the outer layer of a grain; Daniel Fast guides differ on whether it counts as whole grain.': ['refined-grain'],
  'Malt is sprouted, dried grain, often used as a sweetener; diets differ on it.': ['added-sugar', 'refined-grain'],
  'Starch can come from grains such as wheat or corn, or from roots such as potato; the label does not say which.': ['grain', 'gluten', 'refined-grain'],
  'The label does not say whether this fat comes from plants or animals.': ['animal-fat', 'meat-derived', 'dairy'],
  'The label does not say whether this plant fat is a liquid oil or a solid fat.': ['solid-fat', 'hydrogenated-fat'],
  'Margarine can contain milk ingredients; the label does not say.': ['dairy'],
  'Collagen can come from meat animals or fish; the label does not say which.': ['meat', 'meat-derived', 'fish'],
  [ANIMAL_OR_PLANT]: ANIMAL,
  'This is made from an animal source that Total Fast has not classified.': ANIMAL,
  [COLOR]: ['artificial-color', 'meat-derived'],
  'The name suggests a sweetener may be part of this ingredient.': ['added-sugar', 'artificial-sweetener', 'sugar-alcohol', 'honey'],
  'The name suggests alcohol may be part of this ingredient.': ['alcohol'],
};

