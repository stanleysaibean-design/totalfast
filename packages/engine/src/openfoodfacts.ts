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
