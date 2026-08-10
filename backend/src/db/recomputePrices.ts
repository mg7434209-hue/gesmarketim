// Tüm ürünlerin finalPrice/saleUsd snapshot'larını marj zinciri + tenant
// fiyat ayarlarından (sabit marj, kur, tampon, taban) yeniden hesaplar.
// Marj modeli veya kur değiştiğinde çalıştırılır:
//   - CLI: `npm run db:recompute` (bkz. recomputePricesCli.ts)
//   - API: PATCH /api/admin/pricing { recompute: true }
//
// Salt-okur girdiler tek sorguda çekilir, yalnız değeri DEĞİŞEN satırlar
// güncellenir; dryRun ile önizleme yapılabilir.

import { and, eq } from "drizzle-orm";
import { db } from "./index.js";
import { products, suppliers, categories } from "./schema.js";
import { computeFinalPrice } from "./pricing.js";
import { getTenantPricing, invalidateTenantPricing } from "./resolvePrice.js";

export interface RecomputeSummary {
  total: number;
  changed: number;
  unchanged: number;
  dryRun: boolean;
  samples: { slug: string; from: string; to: string; saleUsd: string | null }[];
}

export async function recomputeTenantPrices(
  tenantId: string,
  opts: { dryRun?: boolean } = {},
): Promise<RecomputeSummary> {
  const dryRun = opts.dryRun === true;
  invalidateTenantPricing(tenantId); // ayarlar az önce değişmiş olabilir
  const settings = await getTenantPricing(tenantId);

  const [supplierRows, categoryRows, productRows] = await Promise.all([
    db
      .select({ id: suppliers.id, m: suppliers.defaultMarkupPercent })
      .from(suppliers)
      .where(eq(suppliers.tenantId, tenantId)),
    db
      .select({ id: categories.id, m: categories.defaultMarkupPercent })
      .from(categories)
      .where(eq(categories.tenantId, tenantId)),
    db.select().from(products).where(eq(products.tenantId, tenantId)),
  ]);
  const supplierMarkup = new Map(supplierRows.map((s) => [s.id, s.m]));
  const categoryMarkup = new Map(categoryRows.map((c) => [c.id, c.m]));

  const summary: RecomputeSummary = {
    total: productRows.length,
    changed: 0,
    unchanged: 0,
    dryRun,
    samples: [],
  };

  for (const p of productRows) {
    const { finalPrice, saleUsd } = computeFinalPrice(
      {
        costPrice: p.costPrice,
        costUsd: p.costUsd,
        competitorPrice: p.competitorPrice,
        productMarkupPct: p.markupPercent,
        supplierMarkupPct: p.supplierId ? supplierMarkup.get(p.supplierId) ?? null : null,
        categoryMarkupPct: p.categoryId ? categoryMarkup.get(p.categoryId) ?? null : null,
      },
      settings,
    );
    const nextFinal = finalPrice.toFixed(2);
    const nextSaleUsd = saleUsd === null ? null : saleUsd.toFixed(2);

    const sameFinal = Number(p.finalPrice) === Number(nextFinal);
    const sameUsd =
      (p.saleUsd === null && nextSaleUsd === null) ||
      (p.saleUsd !== null && nextSaleUsd !== null && Number(p.saleUsd) === Number(nextSaleUsd));
    if (sameFinal && sameUsd) {
      summary.unchanged++;
      continue;
    }

    summary.changed++;
    if (summary.samples.length < 20) {
      summary.samples.push({
        slug: p.slug,
        from: String(p.finalPrice),
        to: nextFinal,
        saleUsd: nextSaleUsd,
      });
    }
    if (!dryRun) {
      await db
        .update(products)
        .set({ finalPrice: nextFinal, saleUsd: nextSaleUsd, updatedAt: new Date() })
        .where(and(eq(products.tenantId, tenantId), eq(products.id, p.id)));
    }
  }

  return summary;
}
