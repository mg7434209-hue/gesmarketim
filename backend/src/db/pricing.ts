// Effective-price resolver. Mirrors the rule documented at the top of schema.ts:
//
//   effectiveMarkup = product.markupPercent
//                     ?? supplier.defaultMarkupPercent
//                     ?? category.defaultMarkupPercent
//                     ?? FALLBACK_MARGIN_PCT
//   finalPrice = round2(costPrice * (1 + effectiveMarkup / 100))
//
// finalPrice is written to the DB as a snapshot; recompute whenever cost or any
// markup in the chain changes. Inputs are kept as the `string | number | null`
// shapes Drizzle returns for `numeric` columns.

const FALLBACK_MARGIN_PCT = 25; // used when no markup is set anywhere in the chain

type Numericish = string | number | null | undefined;

function toNum(v: Numericish): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export interface PriceInputs {
  costPrice: Numericish;
  productMarkupPct: Numericish; // product.markupPercent (null = no override)
  supplierMarkupPct: Numericish; // supplier.defaultMarkupPercent
  categoryMarkupPct: Numericish; // category.defaultMarkupPercent
}

export type MarkupSource =
  | "product"
  | "supplier"
  | "category"
  | "fallback";

export interface PriceBreakdown {
  finalPrice: number;
  markupPct: number;
  source: MarkupSource;
}

export function computeFinalPrice(inputs: PriceInputs): PriceBreakdown {
  const cost = toNum(inputs.costPrice) ?? 0;

  const product = toNum(inputs.productMarkupPct);
  if (product !== null) {
    return { finalPrice: applyMarkup(cost, product), markupPct: product, source: "product" };
  }

  const supplier = toNum(inputs.supplierMarkupPct);
  if (supplier !== null) {
    return { finalPrice: applyMarkup(cost, supplier), markupPct: supplier, source: "supplier" };
  }

  const category = toNum(inputs.categoryMarkupPct);
  if (category !== null) {
    return { finalPrice: applyMarkup(cost, category), markupPct: category, source: "category" };
  }

  return {
    finalPrice: applyMarkup(cost, FALLBACK_MARGIN_PCT),
    markupPct: FALLBACK_MARGIN_PCT,
    source: "fallback",
  };
}

function applyMarkup(cost: number, markupPct: number): number {
  return round2(cost * (1 + markupPct / 100));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export { FALLBACK_MARGIN_PCT };
