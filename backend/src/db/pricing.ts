// Effective-price engine. Mirrors the rule documented at the top of schema.ts:
//
//   effectiveMarkup = product.markupPercent
//                     ?? supplier.defaultMarkupPercent
//                     ?? category.defaultMarkupPercent
//                     ?? tenant.defaultMarkup × 100        (sabit %22 dönemi)
//                     ?? FALLBACK_MARGIN_PCT
//
// USD maliyetli ürün (costUsd dolu):
//   saleUSD = round2(costUsd × (1 + markup))
//   saleTRY = round2(saleUSD × fxUsdTry × (1 + fxBufferPct/100))   // kur tamponu
// TRY maliyetli ürün (costUsd boş):
//   saleTRY = round2(costPrice × (1 + markup))
//
// Her iki yolda da guardrail'ler uygulanır:
//   tavan: competitorPrice (₺) doluysa finalPrice onu aşamaz
//   taban: maliyet₺ × (1 + minProfitPct/100) altına inilmez (taban tavandan
//          önceliklidir — zararına satış engellenir)
//
// finalPrice/saleUsd DB'ye snapshot yazılır; cost, marj veya kur değişince
// yeniden hesaplanır (npm run db:recompute). Girdiler Drizzle'ın `numeric`
// kolonlar için döndürdüğü `string | number | null` şekillerinde tutulur.

const FALLBACK_MARGIN_PCT = 25; // zincirde hiçbir marj yoksa (tenant dahil)

type Numericish = string | number | null | undefined;

function toNum(v: Numericish): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export interface TenantPricingSettings {
  defaultMarkup: Numericish; // ORAN (0.22 = %22) — tenants.default_markup
  fxUsdTry: Numericish; // USD/TRY kuru
  fxBufferPct: Numericish; // kur tamponu (%)
  minProfitPct: Numericish; // maliyet+min kâr tabanı (%)
}

export interface PriceInputs {
  costPrice: Numericish; // ₺ maliyet (TRY yolu)
  costUsd?: Numericish; // $ maliyet — doluysa USD yolu kullanılır
  competitorPrice?: Numericish; // ₺ rakip tavanı
  productMarkupPct: Numericish; // product.markupPercent (null = override yok)
  supplierMarkupPct: Numericish; // supplier.defaultMarkupPercent
  categoryMarkupPct: Numericish; // category.defaultMarkupPercent
}

export type MarkupSource =
  | "product"
  | "supplier"
  | "category"
  | "tenant"
  | "fallback";

export type PriceRule = "markup" | "ceiling" | "floor";

export interface PriceBreakdown {
  finalPrice: number; // ₺ satış (snapshot)
  saleUsd: number | null; // $ satış (yalnız USD yolunda)
  markupPct: number;
  source: MarkupSource;
  rule: PriceRule; // hangi kural fiyatı belirledi
}

/** Marj zincirini çöz: product → supplier → category → tenant → fallback. */
export function resolveMarkupPct(
  inputs: Pick<PriceInputs, "productMarkupPct" | "supplierMarkupPct" | "categoryMarkupPct">,
  settings?: TenantPricingSettings,
): { markupPct: number; source: MarkupSource } {
  const product = toNum(inputs.productMarkupPct);
  if (product !== null) return { markupPct: product, source: "product" };

  const supplier = toNum(inputs.supplierMarkupPct);
  if (supplier !== null) return { markupPct: supplier, source: "supplier" };

  const category = toNum(inputs.categoryMarkupPct);
  if (category !== null) return { markupPct: category, source: "category" };

  const tenant = toNum(settings?.defaultMarkup);
  if (tenant !== null) return { markupPct: tenant * 100, source: "tenant" };

  return { markupPct: FALLBACK_MARGIN_PCT, source: "fallback" };
}

export function computeFinalPrice(
  inputs: PriceInputs,
  settings?: TenantPricingSettings,
): PriceBreakdown {
  const { markupPct, source } = resolveMarkupPct(inputs, settings);

  const costUsd = toNum(inputs.costUsd);
  const fx = toNum(settings?.fxUsdTry);
  const bufferPct = toNum(settings?.fxBufferPct) ?? 0;
  const minProfitPct = toNum(settings?.minProfitPct) ?? 0;
  const competitor = toNum(inputs.competitorPrice);

  let saleUsd: number | null = null;
  let rawTry: number;
  let costTry: number;

  if (costUsd !== null && fx !== null) {
    // USD yolu: iki aşamalı yuvarlama — önce $ satış, sonra tamponlu ₺.
    saleUsd = round2(costUsd * (1 + markupPct / 100));
    rawTry = round2(saleUsd * fx * (1 + bufferPct / 100));
    costTry = costUsd * fx;
  } else {
    // TRY yolu (eski davranış).
    const cost = toNum(inputs.costPrice) ?? 0;
    rawTry = round2(cost * (1 + markupPct / 100));
    costTry = cost;
  }

  // Guardrail'ler: önce rakip tavanı kırpar, sonra maliyet+min kâr tabanı
  // kazanır (taban > tavan ise taban geçerli — zararına satış yok).
  let finalPrice = rawTry;
  let rule: PriceRule = "markup";
  if (competitor !== null && finalPrice > competitor) {
    finalPrice = competitor;
    rule = "ceiling";
  }
  const floor = round2(costTry * (1 + minProfitPct / 100));
  if (costTry > 0 && finalPrice < floor) {
    finalPrice = floor;
    rule = "floor";
  }

  return { finalPrice, saleUsd, markupPct, source, rule };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export { FALLBACK_MARGIN_PCT, round2 };
