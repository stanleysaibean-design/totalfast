/**
 * Parser for Open Food Facts taxonomy files (taxonomies/*.txt in
 * openfoodfacts-server). Each blank-line separated block is one entry:
 *
 *   < en:parent             parent entries (by any of their names)
 *   en: name, synonym, ...  names per language; the first one is canonical
 *   vegan:en: no            properties
 */

export interface TaxonomyEntry {
  /** Canonical id, e.g. "en:kale". */
  id: string;
  /** Resolved parent ids. */
  parents: string[];
  /** Names per language code ("en", "fr", "xx" for language-neutral). */
  names: Record<string, string[]>;
  /** Properties with their language suffix dropped, e.g. { vegan: 'no' }. */
  props: Record<string, string>;
}

export interface Taxonomy {
  entries: Map<string, TaxonomyEntry>;
  children: Map<string, string[]>;
}

/** Open Food Facts' tag normalization: lowercase, unaccented, dash-joined. */
export function offKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseTaxonomy(text: string): Taxonomy {
  const raw: { parents: string[]; names: Record<string, string[]>; props: Record<string, string> }[] = [];
  for (const block of text.split(/\r?\n\s*\r?\n/)) {
    const e = { parents: [] as string[], names: {} as Record<string, string[]>, props: {} as Record<string, string> };
    for (const rawLine of block.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      let m = line.match(/^<\s*([a-z]{2,3}|xx)\s*:\s*(.+)$/);
      if (m) {
        e.parents.push(`${m[1]}:${offKey(m[2])}`);
        continue;
      }
      m = line.match(/^([a-z][a-z0-9_]*):([a-z]{2,3}|xx)\s*:\s*(.*)$/);
      if (m && m[1].length > 3) {
        e.props[m[1]] = m[3].trim();
        continue;
      }
      if (m && ['vegan', 'nova'].includes(m[1])) {
        e.props[m[1]] = m[3].trim();
        continue;
      }
      m = line.match(/^([a-z]{2,3}|xx)\s*:\s*(.*)$/);
      if (m) {
        const names = m[2]
          .split(/(?<!\\),/)
          .map((n) => n.replace(/\\,/g, ',').trim())
          .filter(Boolean);
        if (names.length) e.names[m[1]] = names;
      }
    }
    if (Object.keys(e.names).length) raw.push(e);
  }

  // Parents may be named by any synonym, so index every name.
  const byName = new Map<string, string>();
  const entries = new Map<string, TaxonomyEntry>();
  for (const e of raw) {
    const [lang, names] = Object.entries(e.names)[0];
    const id = `${lang}:${offKey(names[0])}`;
    if (entries.has(id)) continue;
    entries.set(id, { id, parents: e.parents, names: e.names, props: e.props });
  }
  for (const e of entries.values()) {
    for (const [lang, names] of Object.entries(e.names)) {
      for (const n of names) {
        const k = `${lang}:${offKey(n)}`;
        if (!byName.has(k)) byName.set(k, e.id);
      }
    }
  }
  for (const e of entries.values()) byName.set(e.id, e.id);

  const children = new Map<string, string[]>();
  for (const e of entries.values()) {
    e.parents = [...new Set(e.parents.map((p) => byName.get(p)).filter((p): p is string => !!p && p !== e.id))];
    for (const p of e.parents) children.set(p, [...(children.get(p) ?? []), e.id]);
  }
  return { entries, children };
}

/**
 * A property, inherited from the nearest ancestors that set it. When parents
 * disagree the result is "maybe" (for yes/no/maybe properties) or undefined.
 */
export function inherited(tax: Taxonomy, id: string, prop: string, seen = new Set<string>()): string | undefined {
  const e = tax.entries.get(id);
  if (!e || seen.has(id)) return undefined;
  seen.add(id);
  if (e.props[prop] !== undefined) return e.props[prop];
  const values = new Set(e.parents.map((p) => inherited(tax, p, prop, new Set(seen))).filter((v) => v !== undefined));
  if (values.size === 0) return undefined;
  if (values.size === 1) return [...values][0];
  return values.has('no') || values.has('maybe') || values.has('yes') ? 'maybe' : undefined;
}
