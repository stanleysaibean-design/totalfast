import type { Category } from '../../src/types.ts';

/**
 * How Open Food Facts ingredient classes map onto Total Fast categories.
 *
 * An imported ingredient takes its categories from its nearest mapped
 * ancestor on each parent path (its own entry counts), and the paths are
 * unioned. So "en:whole-grain-rice" uses its own row, not "en:rice"'s.
 *
 * - `categories` are what every rule set matches on.
 * - `ambiguous` marks the class as one where the label alone doesn't settle
 *   a question some diet asks (whole or refined grain, source of a starch).
 *   Such items are uncertain wherever no rule decides them.
 * - `skip` marks compound or prepared classes (sauces, doughs, flavourings)
 *   whose contents vary. Nothing at or below them is imported, so they stay
 *   "not in the database" and therefore uncertain.
 *
 * Classes not listed here pass through to their parents. An entry with no
 * mapped ancestor at all is not imported.
 */
export interface ClassMapping {
  categories?: Category[];
  ambiguous?: string;
  skip?: true;
}

export const GRAIN_AMBIGUOUS = 'The label does not say whether this grain is whole or refined.';
const STARCH_AMBIGUOUS = 'Starch can come from grains such as wheat or corn, or from roots such as potato; the label does not say which.';
const FAT_AMBIGUOUS = 'The label does not say whether this fat comes from plants or animals.';
const SKIP: ClassMapping = { skip: true };

export const OFF_CLASS_MAP: Record<string, ClassMapping> = {
  // vegetables
  'en:vegetable': { categories: ['vegetable'] },
  'en:root-vegetable': { categories: ['vegetable', 'root-vegetable'] },
  'en:taproot-vegetable': { categories: ['vegetable', 'root-vegetable'] },
  'en:tuber': { categories: ['vegetable', 'root-vegetable'] },
  'en:starchy-root-vegetable': { categories: ['vegetable', 'root-vegetable'] },
  'en:onion': { categories: ['vegetable', 'root-vegetable'] },
  'en:garlic': { categories: ['vegetable', 'root-vegetable'] },
  'en:leaf-vegetable': { categories: ['vegetable', 'leafy-green'] },
  'en:salad': { categories: ['vegetable', 'leafy-green'] },
  'en:vegetable-juice': { categories: ['vegetable'] },
  'en:mushroom': { categories: ['mushroom', 'vegetable'] },
  'en:algae': { categories: ['vegetable'] },
  'en:tomato': { categories: ['vegetable', 'fruit'] },
  'en:olive': { categories: ['fruit'] },
  'en:sweetcorn': { categories: ['grain', 'whole-grain', 'vegetable'] },

  // legumes
  'en:legume': { categories: ['legume'] },
  'en:pea': { categories: ['legume', 'green-legume', 'vegetable'] },
  'en:green-bean': { categories: ['legume', 'green-legume', 'vegetable'] },
  'en:soya': { categories: ['legume', 'soy'] },
  'en:soya-bean': { categories: ['legume', 'soy'] },
  'en:peanut': { categories: ['legume', 'peanut'] },
  'en:miso': SKIP, // often made with rice or barley

  // fruit
  'en:fruit': { categories: ['fruit'] },
  'en:fruit-juice': { categories: ['fruit', 'fruit-juice'] },
  'en:concentrated-juice': SKIP, // fruit or vegetable, unspecified

  // grains
  'en:cereal': { categories: ['grain'], ambiguous: GRAIN_AMBIGUOUS },
  'en:cereal-flour': { categories: ['grain'], ambiguous: GRAIN_AMBIGUOUS },
  'en:wholemeal-cereal': { categories: ['grain', 'whole-grain'] },
  'en:wheat': { categories: ['grain', 'gluten'], ambiguous: GRAIN_AMBIGUOUS },
  'en:spelt': { categories: ['grain', 'gluten'], ambiguous: GRAIN_AMBIGUOUS },
  'en:khorasan-wheat': { categories: ['grain', 'gluten'], ambiguous: GRAIN_AMBIGUOUS },
  'en:rye': { categories: ['grain', 'gluten'], ambiguous: GRAIN_AMBIGUOUS },
  'en:barley': { categories: ['grain', 'gluten'], ambiguous: GRAIN_AMBIGUOUS },
  'en:triticale': { categories: ['grain', 'gluten'], ambiguous: GRAIN_AMBIGUOUS },
  'en:malt': { categories: ['grain', 'gluten'], ambiguous: 'Malt is sprouted, dried grain, often used as a sweetener; diets differ on it.' },
  'en:corn': { categories: ['grain'], ambiguous: GRAIN_AMBIGUOUS },
  'en:corn-flour': { categories: ['grain'], ambiguous: GRAIN_AMBIGUOUS },
  'en:oat': { categories: ['grain', 'whole-grain'] },
  'en:rice': { categories: ['grain'], ambiguous: GRAIN_AMBIGUOUS },
  'en:rice-flour': { categories: ['grain', 'refined-grain'] },
  'en:white-rice': { categories: ['grain', 'refined-grain'] },
  'en:whole-grain-rice': { categories: ['grain', 'whole-grain'] },
  'en:red-rice': { categories: ['grain', 'whole-grain'] },
  'en:black-rice': { categories: ['grain', 'whole-grain'] },
  'en:wild-rice': { categories: ['grain', 'whole-grain'] },
  'en:millet': { categories: ['grain', 'whole-grain'] },
  'en:sorghum': { categories: ['grain', 'whole-grain'] },
  'en:teff': { categories: ['grain', 'whole-grain'] },
  'en:buckwheat': { categories: ['pseudo-grain', 'whole-grain'] },
  'en:buckwheat-flour': { categories: ['pseudo-grain', 'whole-grain'] },
  'en:amaranth': { categories: ['pseudo-grain', 'whole-grain'] },
  'en:quinoa': { categories: ['pseudo-grain', 'whole-grain'] },
  'en:quinoa-flour': { categories: ['pseudo-grain', 'whole-grain'] },
  'en:bran': { categories: ['grain'], ambiguous: 'Bran is the outer layer of a grain; Daniel Fast guides differ on whether it counts as whole grain.' },
  'en:cereal-flakes': SKIP,
  'en:puffed-cereal': SKIP,
  'en:cereal-extrudate': SKIP,
  'en:hydrolysed-cereal': SKIP,

  // starches
  'en:starch': { categories: ['thickener'], ambiguous: STARCH_AMBIGUOUS },
  'en:modified-starch': { categories: ['thickener'], ambiguous: STARCH_AMBIGUOUS },
  'en:corn-starch': { categories: ['grain', 'refined-grain', 'thickener'] },
  'en:wheat-starch': { categories: ['grain', 'refined-grain', 'gluten', 'thickener'] },
  'en:rice-starch': { categories: ['grain', 'refined-grain', 'thickener'] },
  'en:barley-starch': { categories: ['grain', 'refined-grain', 'gluten', 'thickener'] },
  'en:potato-starch': { categories: ['thickener', 'root-vegetable'] },
  'en:sweet-potato-starch': { categories: ['thickener', 'root-vegetable'] },
  'en:tapioca': { categories: ['thickener', 'root-vegetable'] },
  'en:arrowroot-powder': { categories: ['thickener', 'root-vegetable'] },
  'en:pea-starch': { categories: ['thickener', 'legume'] },
  'en:mung-bean-starch': { categories: ['thickener', 'legume'] },

  // nuts and seeds
  'en:nut': { categories: ['nut'] },
  'en:tree-nut': { categories: ['nut'] },
  'en:coconut': { categories: ['fruit'] },
  'en:fruits-and-nuts': SKIP,
  'en:seed': { categories: ['seed'] },
  'en:pine-nuts': { categories: ['nut', 'seed'] },
  'en:cereal-and-seed-mixture': SKIP,

  // herbs and spices
  'en:herb': { categories: ['herb-spice'] },
  'en:spice': { categories: ['herb-spice'] },
  'en:pepper': { categories: ['herb-spice'] },
  'en:cumin': { categories: ['herb-spice'] },
  'en:aniseed': { categories: ['herb-spice'] },
  'en:coriander-seed': { categories: ['herb-spice'] },
  'en:fennel-seed': { categories: ['herb-spice'] },
  'en:celery-seed': { categories: ['herb-spice'] },
  'en:cardamom-seed': { categories: ['herb-spice'] },
  'en:fenugreek-seed': { categories: ['herb-spice'] },
  'en:dill-seed': { categories: ['herb-spice'] },
  'en:black-cumin': { categories: ['herb-spice'] },
  'en:aromatic-leaf': { categories: ['herb-spice'] },
  'en:vanilla': { categories: ['herb-spice'] },
  'en:vanilla-extract': { categories: ['herb-spice', 'alcohol'] },
  'en:cocoa': { categories: ['herb-spice'] },
  'en:cocoa-butter': { categories: ['plant-oil', 'solid-fat'] },
  'en:herbal-tea': SKIP,
  'en:herbs-and-spices': { categories: ['herb-spice'] },

  // stimulants
  'en:tea': { categories: ['caffeine'] },
  'en:mate': { categories: ['caffeine'] },
  'en:guarana': { categories: ['caffeine'] },
  'en:coffee': { categories: ['caffeine'] },
  'en:coffee-preparation': SKIP,

  // fats and oils
  'en:vegetable-oil-and-fat': { categories: ['plant-oil'], ambiguous: 'The label does not say whether this plant fat is a liquid oil or a solid fat.' },
  'en:vegetable-oil': { categories: ['plant-oil'] },
  'en:refined-vegetable-oil': { categories: ['plant-oil'] },
  'en:rapeseed-oil': { categories: ['plant-oil'] },
  'en:vegetable-fat': { categories: ['plant-oil', 'solid-fat'] },
  'en:palm-oil-and-fat': { categories: ['plant-oil', 'solid-fat'] },
  'en:palm-kernel-oil-and-fat': { categories: ['plant-oil', 'solid-fat'] },
  'en:fat': { categories: [], ambiguous: FAT_AMBIGUOUS },
  'en:oil': { categories: [], ambiguous: FAT_AMBIGUOUS },
  'en:shortening': { categories: ['solid-fat'], ambiguous: FAT_AMBIGUOUS },
  'en:hydrogenated-fat': { categories: ['solid-fat', 'hydrogenated-fat'] },
  'en:hydrogenated-oil': { categories: ['solid-fat', 'hydrogenated-fat'] },
  'en:animal-fat': { categories: ['animal-fat', 'solid-fat', 'meat-derived'] },
  'en:poultry-fat': { categories: ['animal-fat', 'meat-derived'] },
  'en:fish-oil': { categories: ['fish'] },
  'en:marine-oil': { categories: ['fish'] },
  'en:margarine': { categories: ['solid-fat'], ambiguous: 'Margarine can contain milk ingredients; the label does not say.' },

  // sweeteners
  'en:added-sugar': { categories: ['added-sugar'] },
  'en:syrup': { categories: ['added-sugar'] },
  'en:honey': { categories: ['added-sugar', 'honey'] },
  'en:lactose': { categories: ['added-sugar', 'dairy'] },
  'en:maltodextrin': { categories: ['added-sugar', 'refined-grain'] },

  // alcohol, vinegar
  'en:alcohol': { categories: ['alcohol'] },
  'en:beer': { categories: ['alcohol', 'gluten'] },
  'en:vinegar': { categories: ['vinegar'] },

  // water, salt, yeast
  'en:water': { categories: ['water'] },
  'en:salt': { categories: ['salt'] },
  'en:yeast': { categories: ['yeast'] },
  'en:nutritional-yeast': { categories: ['yeast', 'vitamin-mineral'] },
  'en:red-yeast-rice': SKIP,

  // meat
  'en:meat': { categories: ['meat'] },
  'en:pork': { categories: ['meat', 'red-meat'] },
  'en:pork-meat': { categories: ['meat', 'red-meat'] },
  'en:beef': { categories: ['meat', 'red-meat'] },
  'en:beef-meat': { categories: ['meat', 'red-meat'] },
  'en:veal-meat': { categories: ['meat', 'red-meat'] },
  'en:sheep': { categories: ['meat', 'red-meat'] },
  'en:lamb-meat': { categories: ['meat', 'red-meat'] },
  'en:mutton': { categories: ['meat', 'red-meat'] },
  'en:goat': { categories: ['meat', 'red-meat'] },
  'en:game-animal': { categories: ['meat'] },
  'en:rabbit': { categories: ['meat'] },
  'en:horse': { categories: ['meat', 'red-meat'] },
  'en:camel': { categories: ['meat', 'red-meat'] },
  'en:caribou': { categories: ['meat', 'red-meat'] },
  'en:kangaroo': { categories: ['meat', 'red-meat'] },
  'en:donkey': { categories: ['meat', 'red-meat'] },
  'en:offal': { categories: ['meat'] },
  'en:frog-legs': { categories: ['meat'] },
  'en:poultry': { categories: ['meat', 'poultry'] },
  'en:animal-derivatives': SKIP,
  'en:meat-and-animal-derivatives': SKIP,
  'en:animal-protein': SKIP,
  'en:jellyfish': SKIP,
  'en:green-turtle': SKIP,
  'en:gelatin': { categories: ['gelatin', 'meat-derived'] },
  'en:collagen': { categories: ['gelatin', 'meat-derived'], ambiguous: 'Collagen can come from meat animals or fish; the label does not say which.' },

  // fish and seafood
  'en:fish': { categories: ['fish'] },
  'en:roe': { categories: ['fish'] },
  'en:tuna-egg': { categories: ['fish'] },
  'en:lumpfish-egg': { categories: ['fish'] },
  'en:surimi': SKIP, // usually contains starch, sugar and egg white
  'en:fish-and-fish-derivatives': SKIP,
  'en:shellfish': { categories: ['shellfish'] },
  'en:mollusc': { categories: ['shellfish'] },
  'en:crustacean': { categories: ['shellfish'] },

  // dairy and eggs
  'en:dairy': { categories: ['dairy'] },
  'en:butter': { categories: ['dairy', 'solid-fat'] },
  'en:clarified-butter': { categories: ['dairy', 'clarified-butter'] },
  'en:ghee': { categories: ['dairy', 'clarified-butter'] },
  'en:egg': { categories: ['egg'] },

  // compound and prepared classes: contents vary, never imported
  'en:sauce': SKIP,
  'en:preparation': SKIP,
  'en:dough': SKIP,
  'en:bread': SKIP,
  'en:biscuit': SKIP,
  'en:wafer': SKIP,
  'en:chocolate': SKIP,
  'en:filling': SKIP,
  'en:coating': SKIP,
  'en:flavouring': SKIP,
  'en:jam': SKIP,
  'en:nougat': SKIP,
  'en:patty': SKIP,
  'en:panna-cotta': SKIP,
  'en:enzyme': SKIP, // rennet and other enzymes may be animal-derived
  'en:ferment': SKIP,
  'en:casing': SKIP,
  'en:broth': SKIP, // vegetable, meat or fish
  'en:fond': SKIP,
  'en:smoke': SKIP,
  'en:essential-oil': SKIP,
  'en:extract': SKIP,
  'en:fiber': SKIP,
  'en:protein': SKIP,
  'en:hydrolysed-protein': SKIP,
  'en:prebiotics': SKIP,
  'en:koji': SKIP,
  'en:mixed-fruit': SKIP,
  'en:vegetable-blend': SKIP,
  'en:vegetables-in-variable-proportion': SKIP,
  'en:mixed-mushrooms': SKIP,
  'en:mixed-condiments': SKIP,
  'en:barbecue-seasoning': SKIP,
};

/**
 * Words that mark a prepared or mixed ingredient. Its contents vary, so it is
 * imported but uncertain wherever no rule decides it.
 */
export const PREPARED_WORDS =
  /\b(sausages?|salami|chorizo|meatballs?|patty|patties|burgers?|nuggets?|puddings?|pate|terrine|sauces?|dressings?|marinated?|breaded|battered|coated|glazed|candied|sweetened|sugared|crystalli[sz]ed|in syrup|preserved|pickled?|cured|jerky|ketchup|jams?|jelly|compote|spreads?|mix|mixes|mixture|blend|seasoning|stuffing|crumbs|filling|cream of|with|and|or|style|flavou?red|flavou?ring|preparation|prepared|cooked|fried|instant|drinks?|beverages?|bean paste|nectar|smoothie)\b/;
export const PREPARED_AMBIGUOUS = 'This is a prepared ingredient whose recipe varies; it may contain sugar, starch or other ingredients the label does not list.';

/** Words naming a sweetener or alcohol, for items not already categorized as one. */
export const SUGAR_WORDS = /\b(sugars?|syrups?|honey|caramel|molasses|treacle|nectar|dextrose|glucose|fructose)\b/;
export const ALCOHOL_WORDS = /\b(wine|beer|ale|lager|rum|brandy|liqueur|whisk(e)?y|vodka|gin|cognac|armagnac|sake|mirin|kirsch|sherry|marsala|port|champagne|cider|spirits?|alcohol|grappa|calvados)\b/;

/** Words that turn a meat item into a meat-derived one (broth, fat, gelatin). */
export const MEAT_DERIVED_WORDS = /\b(broth|stock|bouillon|extract|juice|jus|powder|flavou?r|flavou?ring|bones?|essence|concentrate)\b/;
export const ANIMAL_FAT_WORDS = /\b(fat|tallow|lard|suet|dripping|grease|schmaltz)\b/;
export const GELATIN_WORDS = /\b(gelatine?|collagen)\b/;

export const WHOLE_GRAIN_WORDS = /\b(whole ?(grain|meal|wheat)?s?|wholegrain|wholemeal|wholewheat|brown)\b/;
export const REFINED_GRAIN_WORDS = /\b(white|refined|enriched|semolina|starch|bleached|pearl(ed)?|polished|degermed|instant|puffed|flakes?)\b/;
