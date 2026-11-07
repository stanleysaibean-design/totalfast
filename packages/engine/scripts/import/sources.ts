import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Every file the importer reads, pinned to an exact version and checksum so a
 * rebuild produces the same database. To move to a newer release, change the
 * URL and the sha256 together and review the diff of the generated file.
 */
export interface SourceFile {
  url: string;
  sha256: string;
  /** Read as latin1 instead of utf-8 (the USDA SR files are latin1). */
  latin1?: boolean;
}

export const OFF_COMMIT = '3ac7d13c1754e965fa7fd1490dd7e1164ca52976';
const OFF = `https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/${OFF_COMMIT}/taxonomies`;

// USDA does not serve SR28 through this environment's network, so the release
// files are read from a public GitHub mirror. Four independent mirrors of
// FOOD_DES.txt were compared byte for byte before choosing this one.
export const USDA_MIRROR_COMMIT = 'bcf642dad6cb983c19c9446deeee8d0c0f376142';
const USDA = `https://raw.githubusercontent.com/schirinos/nutrient-db/${USDA_MIRROR_COMMIT}/data/sr28`;

export const FILES = {
  offIngredients: { url: `${OFF}/food/ingredients.txt`, sha256: 'f92d72920e899b988cde88734451c9e8e0d524e99fc0be63f566c3bcda311637' },
  offAdditives: { url: `${OFF}/additives.txt`, sha256: 'adbb5769e850f5310a54cf117a001c155713f788450a87765024bd6c6dbdce2b' },
  usdaFoods: { url: `${USDA}/FOOD_DES.txt`, sha256: 'bb2047218cdad1d830da69e760386409fde3b7afabceae604c5479f280d4fa2e', latin1: true },
  usdaGroups: { url: `${USDA}/FD_GROUP.txt`, sha256: '1f497ae6b4b0127956d0eff4ec2d190d040bac8e6892ff0fb45773d4913033ba', latin1: true },
} satisfies Record<string, SourceFile>;

const CACHE = join(dirname(fileURLToPath(import.meta.url)), '../../.cache/datasets');

/** Downloads (once) and returns a source file's text, checking its sha256. */
export function load(file: SourceFile): string {
  mkdirSync(CACHE, { recursive: true });
  const path = join(CACHE, createHash('sha1').update(file.url).digest('hex'));
  if (!existsSync(path)) execFileSync('curl', ['-sSfL', '--retry', '3', '-o', path, file.url]);
  const bytes = readFileSync(path);
  const sha = createHash('sha256').update(bytes).digest('hex');
  if (file.sha256 && sha !== file.sha256) {
    throw new Error(`Checksum mismatch for ${file.url}: expected ${file.sha256}, got ${sha}. Delete ${path} to re-download.`);
  }
  if (!file.sha256) console.warn(`No pinned sha256 for ${file.url}; it is ${sha}`);
  return bytes.toString(file.latin1 ? 'latin1' : 'utf8');
}
