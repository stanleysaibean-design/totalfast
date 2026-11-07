/** One ingredient name read from a label. */
export interface ParsedIngredient {
  name: string;
  /** Sub-ingredients listed in parentheses after this one. */
  children: ParsedIngredient[];
}

/** An ingredient statement split into its parts. */
export interface ParsedLabel {
  ingredients: ParsedIngredient[];
  /**
   * Allergens the label declares in a trailing "Contains: milk, wheat."
   * statement. "May contain" and facility statements are not included.
   */
  declared: string[];
}

// A statement after the ingredient list: ". Contains: milk, soy." Requires the
// period so "contains 2% or less of: salt" inside the list survives.
const TRAILING_STATEMENT =
  /\.\s*(\*\s*(certified )?organic\.?\s*)?(may contain|contains(?!\s*(\d|less|one or more))|manufactured (in|on)|produced (in|on)|processed (in|on)|allergens?)\b[\s\S]*$/i;
const CONTAINS_STATEMENT =
  /\bcontains(?!\s*(\d|less|one or more))\s*:?\s*(.*?)(?=\.|\bmay contain\b|\b(manufactured|produced|processed) (in|on)\b|$)/i;

/**
 * Splits a printed ingredient statement into a tree of ingredient names.
 *
 * Handles nesting ("enriched flour (wheat flour, niacin)"), "contains 2% or
 * less of" preambles, "and/or" alternatives, OFF-style percentages
 * ("milk powder 8.7%"), stray closing brackets, and trailing allergen
 * statements ("Contains: milk.").
 */
export function parseLabel(text: string): ParsedLabel {
  const withoutHeader = decodeEntities(text).replace(/^\s*ingredients?\s*:\s*/i, '');
  const trailing = withoutHeader.match(TRAILING_STATEMENT);
  const declared = trailing ? parseDeclared(trailing[0]) : [];
  const body = withoutHeader
    .replace(TRAILING_STATEMENT, '')
    // European decimal commas: "almonds (2,3%)" is one number, not two items.
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/[[{]/g, '(')
    .replace(/[\]}]/g, ')');

  let pos = 0;
  const parseList = (nested: boolean): ParsedIngredient[] => {
    const items: ParsedIngredient[] = [];
    let current = '';
    let children: ParsedIngredient[] = [];
    const flush = () => {
      for (const name of splitAlternatives(cleanName(current))) {
        if (name) items.push({ name, children });
        else if (children.length) items.push(...children);
      }
      current = '';
      children = [];
    };
    while (pos < body.length) {
      const ch = body[pos++];
      if (ch === '(') children = children.concat(parseList(true));
      else if (ch === ')') {
        // A stray ")" at the top level is a typo; skipping it keeps the rest
        // of the list instead of silently dropping it.
        if (nested) break;
      } else if (ch === ',' || ch === ';') flush();
      else if (ch === ':') current = ''; // "contains 2% or less of: salt" -> "salt"
      else current += ch;
    }
    flush();
    return items;
  };

  return { ingredients: parseList(false), declared };
}

/** The ingredient tree only; see parseLabel. */
export function parseIngredients(text: string): ParsedIngredient[] {
  return parseLabel(text).ingredients;
}

function parseDeclared(statement: string): string[] {
  const m = statement.match(CONTAINS_STATEMENT);
  if (!m) return [];
  return m[2]
    .replace(/[()]/g, ',')
    .split(/,|;|\band\b|&|\//i)
    .map((w) => w.trim().toLowerCase().replace(/\.+$/, ''))
    .filter(Boolean);
}

/** Labels copied from web pages often carry HTML entities: "FD&amp;C Red 40". */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/gi, '&')
    .replace(/&(quot|#34);/gi, '"')
    .replace(/&(apos|#39);/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&(quot|amp|lt|gt|apos)\b/gi, (m) => ({ quot: '"', amp: '&', lt: '<', gt: '>', apos: "'" })[m.slice(1).toLowerCase()] ?? m);
}

/** Flattens a parsed tree into label order, parents before children. */
export function flatten(items: ParsedIngredient[]): ParsedIngredient[] {
  return items.flatMap((it) => [it, ...flatten(it.children)]);
}

const PREAMBLE =
  /^(and |or )?(contains |containing )?(\d+(\.\d+)?\s*%\s*(or less|and less)?\s*(of)?|(less than|under) \d+(\.\d+)?\s*(%|percent)?\s*(of)?|(one|two|three|five) (percent|%) or less( of)?)\s*/i;

function cleanName(raw: string): string {
  let s = raw.trim().replace(/\.+$/, '').trim();
  s = s.replace(PREAMBLE, '').trim();
  // Open Food Facts often appends a share: "milk powder 8.7%".
  s = s.replace(/\s*\d+(?:[.,]\d+)?\s*%$/, '').trim();
  s = s.replace(/^(and\s*\/\s*or|and|or)\s+/i, '').trim();
  // Functional notes: "citric acid to preserve freshness", "annatto for color"
  s = s.replace(/(^|\s+)(to (preserve|maintain|protect|retain|promote)|for (color|freshness|flavor|tartness)|as a preservative)\b.*$/i, '');
  s = s.replace(/[*†‡_]+/g, '').trim();
  // Notes that describe the ingredient before them rather than naming one.
  if (NOT_AN_INGREDIENT.test(s)) return '';
  s = s.replace(/\s+in varying proportions?$/i, '').trim();
  // Inline sources and allergen notes: "lactose (from milk)", "(contains milk)",
  // "soy drink (with added calcium)" -> "milk", "milk", "calcium".
  s = s.replace(/^(from|contains?|with( added)?|made (from|with)|derived from|of)\s+/i, '').trim();
  // "soy lecithin, an emulsifier": a note on the item before it
  if (/^(an?|as an?|as)\s+(natural\s+|artificial\s+)?(emulsifier|preservative|antioxidant|stabili[sz]er|thickener|anti ?caking agent|colou?r|leavening agent|sweetener|dough conditioner|flavou?r enhancer|mou?ld inhibitor|humectant|acidulant|processing aid)s?$/i.test(s)) return '';
  s = s.replace(/^(an?|the)\s+/i, '').replace(/\s+added$/i, '').trim();
  s = s.replace(/\s+(cured|pickled|packed|canned) (with|in) .*$/i, '').replace(/\s+(in (its own |their own )?juice|with juice|in water|in brine)$/i, '').trim();
  s = s.replace(new RegExp(`\\s+(of|from) (${ORIGINS})( (or|and) (${ORIGINS}))*( origin)?$`, 'i'), '').trim();
  s = s.replace(/^(trace of|traces of|not more than \d+(\.\d+)?\s*%?( of)?)\s+/i, '').trim();
  s = s.replace(/\s+as an? (natural )?[a-z ]*(additive|agent|aid|enzyme)$/i, '').trim();
  // "vitamin b5 (as calcium d-pantothenate)" names the form; "(as a preservative)" names a role.
  s = s.replace(/^as\s+(an?\s+)?/i, '').replace(/^(enriched|fortified) with\s+/i, '').replace(/^includes?\s+/i, '').trim();
  // "potassium sorbate preservative", "soy lecithin (an emulsifier)" -> the substance.
  const role = s.match(/^(.+?)\s+(an?\s+|as\s+an?\s+|as\s+)?(natural\s+|artificial\s+)?(emulsifier|preservative|antioxidant|stabili[sz]er|thickener|anti ?caking agent|colou?r|leavening agent|sweetener|dough conditioner|artificial flavou?r|flavou?r enhancer)s?$/i);
  if (role && !/(\s|^)(and|&|or|with|and\/or)$/i.test(role[1].trim()) && !/^(natural|artificial|vegetable|food|fruit|plant|added|certified|caramel|non nutritive|nonnutritive|high intensity|beet|annatto|paprika|turmeric|carmine|fruit and vegetable|vegetable juice)$/i.test(role[1].trim())) s = role[1].trim();
  s = s.replace(/\s+added$/i, '').trim();
  s = s.replace(/\s+(added\s+)?(as|to|for)\s+(an?\s+)?(preservative|emulsifier|dough conditioner|antioxidant|colou?r|thickener|stabili[sz]er|make|prevent|retard|maintain|keep|protect|help|promote|preserve)\b.*$/i, '').trim();
  s = s.replace(/^(roasted|fried|cooked|packed|preserved|canned|stored|stuffed) in\s+(an?\s+)?/i, '');
  s = s.replace(/^including\s+/i, '');
  // footnote marks stuck to a name: "cocoa mass1", "cocoa butter'"
  s = s.replace(/([a-z]{3,})(['"¹²³]+|\d)$/i, '$1').trim();
  s = s.replace(/^(colou?red with|sources? of|naturally derived|derived from)\s+/i, '');
  s = s.replace(/\s+(from concentrate|\d+(\.\d+)?\s*%?\s*(minimum|min|maximum|max)|(minimum|min) \d+(\.\d+)?\s*%?)$/i, '').trim();
  if (NOT_AN_INGREDIENT.test(s)) return '';
  if (NOT_AN_INGREDIENT.test(s)) return '';
  return s;
}

/** Places and origin words: "pork (british or irish)", "cocoa (eu and non-eu)". */
const ORIGINS =
  'france|french|italy|italian|spain|spanish|germany|german|uk|united kingdom|british|irish|scottish|welsh|english|ireland|great britain|' +
  'usa|us|united states|american|eu|non[ -]?eu|european|canada|canadian|mexico|china|india|thailand|vietnam|peru|chile|brazil|argentina|' +
  'netherlands|belgium|poland|greece|turkey origin|new zealand|australia|origin|various origins|different origins|several countries';

const NOT_AN_INGREDIENT = new RegExp(
  '^(' +
    [
      '[\\d.\\s%]*', // a stray number or share
      'in varying proportions?',
      '(for allergens|allergy advice|allergens?)\\b.*',
      '(see|including) .*\\b(bold|capitals|underlined|gluten)\\b.*',
      '.*\\bingredients? in (bold|capitals)\\b.*',
      '(may|may also) contain\\b.*',
      'contain [a-z ]*traces?\\b.*',
      '(traces? of|produced|manufactured|made|packed|packaged) (in|on) .*',
      '(from|made from|reconstituted from) concentrate',
      'reconstituted',
      'processed with alkali',
      'dutch(ed)?( processed)?',
      'alkali(sed|zed)?',
      'non[ -]?gmo( project verified)?',
      'organic|certified organic',
      '(added )?(to|for) (prevent|retard|preserve|maintain|protect|retain|promote|keep|help|enhance|improve|reduce|control|prevent)\\b.*',
      'added',
      'used( as| for| to)?.*',
      '(made|produced|grown|packed|sourced|caught|raised) in .*',
      `((${ORIGINS})( or | and |/|, | )?)+`,
      '(origin|country of origin)\\b.*',
      'cured with .*',
      '(we|this product|product|suitable for|not suitable|keep|store|best before|once opened|serving suggestion)\\b.*',
      'preserves? freshness',
      '(provides?|controls?|prevents?|maintains?|helps?|retains?|promotes?|protects?|improves?|stabili[sz]es?|keeps?|enhances?|adds?) .*',
      'if colou?red|(added )?to make .*|for (a )?(fresh|free flowing).*',
      // a lone descriptor, such as "tomatoes (dried)"
      '(dried|dehydrated|unbleached|bleached|unenriched|enriched|boneless|skinless|natural|vegan|vegetarian|non dairy|dairy free|gluten free|' +
        'kosher|halal|raw|cooked|roasted|toasted|ground|powdered|frozen|fresh|smoked|cured|uncured|salted|unsalted|pitted|peeled|shelled|' +
        'unsulphured|unsulfured|sulphured|sulfured|pasteurized|pasteurised|homogenized|fortified|sliced|diced|chopped|minced|whole|rehydrated|' +
        'bpa free|gmo free|non gmo|no msg|preservative free|kosher for passover|certified gluten free|wild caught|farm raised|grass fed|' +
        'lactose free|minimum|maximum|germ removed|equivalent to .*|per serving.*|approx.*|not from .*|without .*|some may remain|following|' +
        'dry place|sold|actual|diluted with water.*|plant derived|vegetable source|find out more.*|rainforest alliance.*|\\d+ ?(g|mg|kcal|calories).*|' +
        '.*calories a day.*|for (thickening|anti foaming|stability|texture|flavou?r|colou?r)|(to|added to) (ensure|stabili[sz]e)\\b.*|preserves whiteness)',
      'for (color|colour|flavor|flavour|freshness|tartness|texture)',
      'dv|daily value|rdi|ri',
      'emulsifying salts?', // a role word left from "emulsifying salts (sodium citrate)"; children are judged
    ].join('|') +
    ')$',
  'i',
);

/** "soybean and/or canola oil" -> ["soybean oil", "canola oil"]. */
function splitAlternatives(name: string): string[] {
  const m = name.match(/^(.*?)\s+and\/or\s+(.*)$/i);
  if (!m) return [name];
  const left = m[1].trim();
  const right = m[2].trim();
  const rightWords = right.split(/\s+/);
  // Share a trailing noun ("oil") when the left side is a bare modifier.
  const leftFull = !left.includes(' ') && rightWords.length > 1 ? `${left} ${rightWords.at(-1)}` : left;
  return [leftFull, right];
}
