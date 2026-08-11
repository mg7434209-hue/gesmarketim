// Katalog temizliği: belirli tedarikçilerin ürünlerinden, son fiyat listesi
// import'unda EŞLEŞMEYEN veya geçerli USD maliyeti olmayanları yayından
// kaldırır (status="archived", syncStatus="not_found" — kayıt SİLİNMEZ;
// fiyat geri gelirse sonraki import in_stock satırıyla otomatik yeniden
// aktive eder, bkz. engine.ts re-activate bloğu).
//
// Korumalar:
//   - protectedSupplierSlugs (ör. mexxsun): bu tedarikçiye ait ürünler kapsam
//     dışıdır; ayrıca supplier_prices'ta bu tedarikçiden fiyat kaydı bulunan
//     ürünlere de DOKUNULMAZ (ayrı fiyat listesiyle beslenirler).
//   - protectedCategorySlugs (ör. paket-sistemler): kendi bundle'larımız —
//     tedarikçi listesinde olmamaları normaldir.

import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { products, suppliers, categories, supplierPrices } from "../../db/schema.js";

export interface CleanupOptions {
  tenantId: string;
  /** Temizlik kapsamındaki tedarikçi slug'ları (ör. ["acs-enerji","lexron"]). */
  supplierSlugs: string[];
  /** Son import'ta eşleşen/oluşturulan ürün id'leri — bunlar KALIR. */
  keepIds: Set<string>;
  protectedSupplierSlugs: string[];
  protectedCategorySlugs: string[];
  dryRun?: boolean;
}

export interface CleanupResult {
  scanned: number;
  deactivated: { id: string; name: string }[];
  protectedSkipped: number;
}

function toNum(v: string | null): number | null {
  if (v === null || v === "") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export async function deactivateMissingProducts(
  opts: CleanupOptions,
): Promise<CleanupResult> {
  const result: CleanupResult = { scanned: 0, deactivated: [], protectedSkipped: 0 };

  const supRows = await db
    .select({ id: suppliers.id, slug: suppliers.slug })
    .from(suppliers)
    .where(eq(suppliers.tenantId, opts.tenantId));
  const idsOf = (slugs: string[]) =>
    supRows.filter((s) => slugs.indexOf(s.slug) >= 0).map((s) => s.id);
  const scopeIds = idsOf(opts.supplierSlugs);
  const protectedSupIds = idsOf(opts.protectedSupplierSlugs);
  if (scopeIds.length === 0) return result;

  const catRows = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories)
    .where(eq(categories.tenantId, opts.tenantId));
  const protectedCatIds = new Set(
    catRows.filter((c) => opts.protectedCategorySlugs.indexOf(c.slug) >= 0).map((c) => c.id),
  );

  // Korumalı tedarikçiden fiyat kaydı olan ürünler (ör. Mexxsun beslemeli).
  const protectedPriced = new Set<string>();
  if (protectedSupIds.length > 0) {
    const rows = await db
      .selectDistinct({ productId: supplierPrices.productId })
      .from(supplierPrices)
      .where(
        and(
          eq(supplierPrices.tenantId, opts.tenantId),
          inArray(supplierPrices.supplierId, protectedSupIds),
        ),
      );
    rows.forEach((r) => protectedPriced.add(r.productId));
  }

  const candidates = await db
    .select({
      id: products.id,
      name: products.name,
      costUsd: products.costUsd,
      categoryId: products.categoryId,
    })
    .from(products)
    .where(
      and(
        eq(products.tenantId, opts.tenantId),
        eq(products.status, "active"),
        inArray(products.supplierId, scopeIds),
      ),
    );
  result.scanned = candidates.length;

  for (const p of candidates) {
    if (p.categoryId && protectedCatIds.has(p.categoryId)) {
      result.protectedSkipped++;
      continue;
    }
    if (protectedPriced.has(p.id)) {
      result.protectedSkipped++;
      continue;
    }
    const priced = (toNum(p.costUsd) ?? 0) > 0;
    if (opts.keepIds.has(p.id) && priced) continue;

    result.deactivated.push({ id: p.id, name: p.name });
    console.log(`DEACTIVATED: ${p.name} — ACS listesinde fiyat yok`);
    if (!opts.dryRun) {
      await db
        .update(products)
        .set({ status: "archived", syncStatus: "not_found", updatedAt: new Date() })
        .where(and(eq(products.tenantId, opts.tenantId), eq(products.id, p.id)));
    }
  }

  return result;
}
