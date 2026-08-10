// Resolve a product's snapshot prices (finalPrice ₺ + saleUsd $) from its cost
// + the markup chain (product → supplier → category → tenant default) and the
// tenant's FX/guardrail settings. Shared by admin writes, the supplier sync
// engine and the recompute CLI so pricing stays consistent everywhere.

import { and, eq } from "drizzle-orm";
import { db } from "./index.js";
import { suppliers, categories, tenants } from "./schema.js";
import { computeFinalPrice, type TenantPricingSettings } from "./pricing.js";

// Tenant fiyat ayarları process içinde kısa süre önbelleğe alınır (toplu
// import/recompute'ta satır başına sorgu atmamak için). Admin PATCH sonrası
// invalidateTenantPricing() çağrılır.
const TTL_MS = 60_000;
const cache = new Map<string, { at: number; settings: TenantPricingSettings }>();

export async function getTenantPricing(
  tenantId: string,
): Promise<TenantPricingSettings> {
  const hit = cache.get(tenantId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.settings;

  const [row] = await db
    .select({
      defaultMarkup: tenants.defaultMarkup,
      fxUsdTry: tenants.fxUsdTry,
      fxBufferPct: tenants.fxBufferPct,
      minProfitPct: tenants.minProfitPct,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const settings: TenantPricingSettings = row ?? {
    defaultMarkup: "0.22",
    fxUsdTry: null,
    fxBufferPct: "2",
    minProfitPct: "10",
  };
  cache.set(tenantId, { at: Date.now(), settings });
  return settings;
}

export function invalidateTenantPricing(tenantId?: string): void {
  if (tenantId) cache.delete(tenantId);
  else cache.clear();
}

export interface ResolvePriceArgs {
  tenantId: string;
  costPrice: string | null;
  costUsd?: string | null;
  competitorPrice?: string | null;
  markupPercent: string | null;
  categoryId: string | null;
  supplierId: string | null;
}

export interface ResolvedPrices {
  finalPrice: string; // ₺ snapshot
  saleUsd: string | null; // $ snapshot (yalnız USD maliyetli ürünlerde)
}

export async function resolvePrices(args: ResolvePriceArgs): Promise<ResolvedPrices> {
  let supplierMarkup: string | null = null;
  let categoryMarkup: string | null = null;

  if (args.supplierId) {
    const [s] = await db
      .select({ m: suppliers.defaultMarkupPercent })
      .from(suppliers)
      .where(and(eq(suppliers.tenantId, args.tenantId), eq(suppliers.id, args.supplierId)))
      .limit(1);
    supplierMarkup = s?.m ?? null;
  }
  if (args.categoryId) {
    const [c] = await db
      .select({ m: categories.defaultMarkupPercent })
      .from(categories)
      .where(and(eq(categories.tenantId, args.tenantId), eq(categories.id, args.categoryId)))
      .limit(1);
    categoryMarkup = c?.m ?? null;
  }

  const settings = await getTenantPricing(args.tenantId);
  const { finalPrice, saleUsd } = computeFinalPrice(
    {
      costPrice: args.costPrice,
      costUsd: args.costUsd,
      competitorPrice: args.competitorPrice,
      productMarkupPct: args.markupPercent,
      supplierMarkupPct: supplierMarkup,
      categoryMarkupPct: categoryMarkup,
    },
    settings,
  );
  return {
    finalPrice: finalPrice.toFixed(2),
    saleUsd: saleUsd === null ? null : saleUsd.toFixed(2),
  };
}

/** Geriye dönük uyum: yalnız ₺ snapshot isteyen çağrılar için. */
export async function resolveFinalPrice(args: ResolvePriceArgs): Promise<string> {
  const { finalPrice } = await resolvePrices(args);
  return finalPrice;
}
