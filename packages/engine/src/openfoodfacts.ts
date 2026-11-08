import type { Checkable } from './types.ts';

/** The subset of an Open Food Facts v2 product response the engine uses. */
export interface OffProductResponse {
  code?: string;
  status?: number;
  product?: {
    product_name?: string;
    brands?: string;
    ingredients_text?: string;
    ingredients_text_en?: string;
  };
}

/**
 * Maps an Open Food Facts product (GET /api/v2/product/{barcode}.json) to a
 * Checkable. Returns undefined when the product or its ingredient list is
 * missing, which the app should show as "no data" rather than a verdict.
 * OFF data is crowd-sourced, so results feed the review layer.
 */
export function fromOpenFoodFacts(res: OffProductResponse): (Checkable & { barcode?: string }) | undefined {
  const p = res.product;
  const text = p?.ingredients_text_en?.trim() || p?.ingredients_text?.trim();
  if (!p || !text) return undefined;
  const name = [p.brands?.split(',')[0]?.trim(), p.product_name?.trim()].filter(Boolean).join(' ') || 'Unnamed product';
  return { name, ingredientsText: text, barcode: res.code };
}

/** One product in an Open Food Facts search response. */
export interface OffSearchProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  quantity?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
}

/** The subset of an Open Food Facts search response (/cgi/search.pl?json=1) the app uses. */
export interface OffSearchResponse {
  count?: number;
  products?: OffSearchProduct[];
}

/** A product found by name or brand, ready to show in a pick list. */
export interface ProductMatch {
  barcode: string;
  /** "Doritos Nacho Cheese", brand first. */
  name: string;
  brand?: string;
  /** Pack size as printed, e.g. "262.2 g". Helps tell regional versions apart. */
  quantity?: string;
  /** Undefined when the database has no ingredient list for it. */
  item?: Checkable;
}

/**
 * Maps a product search response to pick-list entries. Brand products like
 * Doritos are many products with different recipes (Nacho Cheese has milk,
 * some flavors have none, and recipes differ by country), so a brand name is
 * never treated as one ingredient: the user picks the product, and the
 * engine checks that product's own ingredient list. Products with an
 * ingredient list come first; duplicates (same barcode) are dropped.
 */
export function productsFromSearch(res: OffSearchResponse): ProductMatch[] {
  const seen = new Set<string>();
  const out: ProductMatch[] = [];
  for (const p of res.products ?? []) {
    const barcode = p.code?.trim();
    if (!barcode || seen.has(barcode)) continue;
    seen.add(barcode);
    const title = p.product_name_en?.trim() || p.product_name?.trim();
    const brand = p.brands?.split(',')[0]?.trim() || undefined;
    if (!title && !brand) continue;
    const name =
      brand && title && !title.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${title}` : title || brand!;
    const text = p.ingredients_text_en?.trim() || p.ingredients_text?.trim();
    out.push({
      barcode,
      name,
      brand,
      quantity: p.quantity?.trim() || undefined,
      item: text ? { name, ingredientsText: text } : undefined,
    });
  }
  return out.sort((a, b) => Number(!a.item) - Number(!b.item));
}
