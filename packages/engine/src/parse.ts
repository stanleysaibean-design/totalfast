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
  /\.\s*(may contain|contains(?!\s*(\d|less|one or more))|manufactured (in|on)|produced (in|on)|processed (in|on)|allergens?)\b[\s\S]*$/i;
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
  const withoutHeader = text.replace(/^\s*ingredients?\s*:\s*/i, '');
  const trailing = withoutHeader.match(TRAILING_STATEMENT);
  const declared = trailing ? parseDeclared(trailing[0]) : [];
  const body = withoutHeader
    .replace(TRAILING_STATEMENT, '')
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

/** Flattens a parsed tree into label order, parents before children. */
export function flatten(items: ParsedIngredient[]): ParsedIngredient[] {
  return items.flatMap((it) => [it, ...flatten(it.children)]);
}

const PREAMBLE =
  /^(and |or )?(contains |containing )?(\d+(\.\d+)?\s*%\s*(or less|and less)?\s*(of)?|less than \d+(\.\d+)?\s*%\s*of)\s*/i;

function cleanName(raw: string): string {
  let s = raw.trim().replace(/\.+$/, '').trim();
  s = s.replace(PREAMBLE, '').trim();
  // Open Food Facts often appends a share: "milk powder 8.7%".
  s = s.replace(/\s*\d+(?:[.,]\d+)?\s*%$/, '').trim();
  s = s.replace(/^(and|or)\s+/i, '').trim();
  // Functional notes: "citric acid to preserve freshness", "annatto for color"
  s = s.replace(/(^|\s+)(to (preserve|maintain|protect|retain|promote)|for (color|freshness|flavor|tartness)|as a preservative)\b.*$/i, '');
  s = s.replace(/[*†‡]+/g, '').trim();
  return s;
}

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
