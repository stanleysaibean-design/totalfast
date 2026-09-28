/** One ingredient name read from a label. */
export interface ParsedIngredient {
  name: string;
  /** Sub-ingredients listed in parentheses after this one. */
  children: ParsedIngredient[];
}

/**
 * Splits a printed ingredient statement into a tree of ingredient names.
 *
 * Handles nesting ("enriched flour (wheat flour, niacin)"), "contains 2% or
 * less of" preambles, "and/or" alternatives, and trailing allergen
 * statements ("Contains: milk.").
 */
export function parseIngredients(text: string): ParsedIngredient[] {
  const body = text
    .replace(/^\s*ingredients?\s*:\s*/i, '')
    // Allergen statements after the list: ". Contains: milk, soy." Requires the
    // period so "contains 2% or less of: salt" inside the list survives.
    .replace(/\.\s*(may contain|contains(?!\s*(\d|less))|manufactured (in|on)|produced (in|on)|processed (in|on)|allergens?)\b[^()]*$/i, '')
    .replace(/[[{]/g, '(')
    .replace(/[\]}]/g, ')');

  let pos = 0;
  const parseList = (): ParsedIngredient[] => {
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
      if (ch === '(') children = children.concat(parseList());
      else if (ch === ')') break;
      else if (ch === ',' || ch === ';') flush();
      else if (ch === ':' ) current = ''; // "contains 2% or less of: salt" -> "salt"
      else current += ch;
    }
    flush();
    return items;
  };

  return parseList();
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
