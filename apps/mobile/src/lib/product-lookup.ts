import { fromOpenFoodFacts, type Checkable, type OffProductResponse } from '@total-fast/engine';
import { Platform } from 'react-native';

export type LookupResult =
  | { kind: 'found'; barcode: string; item: Checkable }
  | { kind: 'no-ingredients'; barcode: string; name?: string }
  | { kind: 'not-found'; barcode: string }
  | { kind: 'error'; barcode: string; message: string };

const FIELDS = 'code,product_name,brands,ingredients_text,ingredients_text_en';
const TIMEOUT_MS = 10_000;
// Open Food Facts asks API clients to identify themselves. Browsers don't let
// pages set User-Agent, so it is only sent from the native apps.
const USER_AGENT = 'TotalFast/0.1 (https://github.com/stanleysaibean-design/totalfast)';

/** Keeps only digits; UPC-E, EAN-8, UPC-A, EAN-13 and GTIN-14 are 8 to 14 digits. */
export function normalizeBarcode(raw: string): string | undefined {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 14 ? digits : undefined;
}

/**
 * Looks a barcode up in Open Food Facts. Crowd-sourced data, so the app
 * presents it as the label on file, not as a guarantee.
 */
export async function lookupBarcode(barcode: string): Promise<LookupResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${FIELDS}`, {
      signal: controller.signal,
      headers: Platform.OS === 'web' ? undefined : { 'User-Agent': USER_AGENT },
    });
    if (res.status === 404) return { kind: 'not-found', barcode };
    if (!res.ok) return { kind: 'error', barcode, message: `The product database returned an error (${res.status}).` };
    const body = (await res.json()) as OffProductResponse;
    if (body.status === 0 || !body.product) return { kind: 'not-found', barcode };
    const item = fromOpenFoodFacts(body);
    if (!item) return { kind: 'no-ingredients', barcode, name: body.product.product_name?.trim() || undefined };
    return { kind: 'found', barcode, item };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    return {
      kind: 'error',
      barcode,
      message: aborted
        ? "The product database didn't answer in time. Check your connection and try again."
        : "Couldn't reach the product database. Check your connection and try again.",
    };
  } finally {
    clearTimeout(timer);
  }
}
