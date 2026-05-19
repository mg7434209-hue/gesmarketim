// Effective-price resolver. Mirrors the rule documented at the top of schema.ts.
//
// Inputs are kept as strings (matching Drizzle's `numeric` return type for postgres.js).
// We do math in `number` for now; if precision becomes a concern, switch to a Decimal lib.

const FALLBACK_MARGIN_PCT = 25; // 25% — used when no margin is set anywhere

type Numericish = string | number | null | undefined;

function toNum(v: Numericish): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export interface PriceInputs {
  costPrice: Numericish;
  manualPriceOverride: Numericish;
  productMarginPctOverride: Numericish;
  supplierMarginPct: Numericish;
  categoryMarginPct: Numericish;
}

export interface PriceBreakdown {
  effectivePrice: number;
  source: 'manual' | 'product_margin' | 'supplier_margin' | 'category_margin' | 'fallback';
  marginPct: number | null; // null when source === 'manual'
}

export function computeEffectivePrice(inputs: PriceInputs): PriceBreakdown {
  const manual = toNum(inputs.manualPriceOverride);
  if (manual !== null) {
    return { effectivePrice: round2(manual), source: 'manual', marginPct: null };
  }

  const cost = toNum(inputs.costPrice) ?? 0;

  const productMargin = toNum(inputs.productMarginPctOverride);
  if (productMargin !== null) {
    return {
      effectivePrice: applyMargin(cost, productMargin),
      source: 'product_margin',
      marginPct: productMargin,
    };
  }

  const supplierMargin = toNum(inputs.supplierMarginPct);
  if (supplierMargin !== null) {
    return {
      effectivePrice: applyMargin(cost, supplierMargin),
      source: 'supplier_margin',
      marginPct: supplierMargin,
    };
  }

  const categoryMargin = toNum(inputs.categoryMarginPct);
  if (categoryMargin !== null) {
    return {
      effectivePrice: applyMargin(cost, categoryMargin),
      source: 'category_margin',
      marginPct: categoryMargin,
    };
  }

  return {
    effectivePrice: applyMargin(cost, FALLBACK_MARGIN_PCT),
    source: 'fallback',
    marginPct: FALLBACK_MARGIN_PCT,
  };
}

function applyMargin(cost: number, marginPct: number): number {
  return round2(cost * (1 + marginPct / 100));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
