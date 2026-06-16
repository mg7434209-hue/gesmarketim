// Supplier CSV sync engine. Matches incoming rows to products by
// (supplierId, supplierSku), updates cost/stock/markup, recomputes finalPrice,
// auto-archives out-of-stock items (when product.autoDisableOnOos), and can
// create missing products as drafts. Returns a per-run summary.
//
// Accepted column headers (case-insensitive, TR/EN aliases):
//   sku|stok_kodu|supplier_sku   (required)
//   name|ad|urun
//   cost|maliyet|alis|fiyat|price
//   markup|marj
//   stock|stok|adet
//   category|kategori            (category slug)
//   brand|marka                  (brand slug)
//   image|gorsel|resim           (image URL)
//   status|durum                 (draft|active|archived)

import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { products, categories, brands } from "../../db/schema.js";
import { resolveFinalPrice } from "../../db/resolvePrice.js";
import { slugify } from "../util.js";
import { parseNumber } from "./csv.js";

export interface SyncOptions {
  createMissing: boolean;
  defaultCategoryId?: string | null;
  dryRun: boolean;
}

export interface SyncSummary {
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
  dryRun: boolean;
  errors: { row: number; sku: string; reason: string }[];
  details: { row: number; sku: string; action: string; note?: string }[];
}

function pick(row: Record<string, string>, keys: string[]): string | undefined {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== "") return row[k];
  }
  return undefined;
}

export async function runCsvSync(
  tenantId: string,
  supplierId: string,
  rows: Record<string, string>[],
  options: SyncOptions,
): Promise<SyncSummary> {
  const summary: SyncSummary = {
    total: rows.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    dryRun: options.dryRun,
    errors: [],
    details: [],
  };

  // Prefetch slug → id maps for category/brand resolution.
  const [catRows, brandRows] = await Promise.all([
    db.select({ id: categories.id, slug: categories.slug }).from(categories).where(eq(categories.tenantId, tenantId)),
    db.select({ id: brands.id, slug: brands.slug }).from(brands).where(eq(brands.tenantId, tenantId)),
  ]);
  const catBySlug = new Map(catRows.map((c) => [c.slug, c.id]));
  const brandBySlug = new Map(brandRows.map((b) => [b.slug, b.id]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNo = i + 2; // +1 header, +1 to 1-index
    const sku = pick(row, ["sku", "stok_kodu", "supplier_sku", "stokkodu"]);
    if (!sku) {
      summary.skipped++;
      summary.errors.push({ row: rowNo, sku: "", reason: "SKU eksik" });
      continue;
    }

    const name = pick(row, ["name", "ad", "urun", "ürün"]);
    const cost = parseNumber(pick(row, ["cost", "maliyet", "alis", "alış", "fiyat", "price"]));
    const markup = parseNumber(pick(row, ["markup", "marj"]));
    const stock = parseNumber(pick(row, ["stock", "stok", "adet"]));
    const categorySlug = pick(row, ["category", "kategori"]);
    const brandSlug = pick(row, ["brand", "marka"]);
    const image = pick(row, ["image", "gorsel", "görsel", "resim"]);
    const statusRaw = pick(row, ["status", "durum"]);
    const status =
      statusRaw === "active" || statusRaw === "archived" || statusRaw === "draft"
        ? statusRaw
        : undefined;

    const categoryId = categorySlug ? catBySlug.get(categorySlug) ?? null : null;
    const brandId = brandSlug ? brandBySlug.get(brandSlug) ?? null : null;

    try {
      const [existing] = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.tenantId, tenantId),
            eq(products.supplierId, supplierId),
            eq(products.supplierSku, sku),
          ),
        )
        .limit(1);

      if (existing) {
        const update: Record<string, unknown> = {};
        let changed = false;

        if (cost !== null && Number(existing.costPrice) !== cost) {
          update.costPrice = cost.toFixed(2);
          changed = true;
        }
        if (markup !== null && (existing.markupPercent === null || Number(existing.markupPercent) !== markup)) {
          update.markupPercent = markup.toFixed(2);
          changed = true;
        }
        if (stock !== null && existing.stockQty !== stock) {
          update.stockQty = stock;
          changed = true;
        }
        if (categoryId && existing.categoryId !== categoryId) {
          update.categoryId = categoryId;
          changed = true;
        }
        if (brandId && existing.brandId !== brandId) {
          update.brandId = brandId;
          changed = true;
        }
        if (status && existing.status !== status) {
          update.status = status;
          changed = true;
        }

        // Recompute snapshot price when pricing inputs changed.
        if ("costPrice" in update || "markupPercent" in update || "categoryId" in update) {
          update.finalPrice = await resolveFinalPrice({
            tenantId,
            costPrice: (update.costPrice as string | undefined) ?? existing.costPrice,
            markupPercent:
              "markupPercent" in update ? (update.markupPercent as string) : existing.markupPercent,
            categoryId: ("categoryId" in update ? update.categoryId : existing.categoryId) as string | null,
            supplierId,
          });
        }

        // Stock-driven availability.
        const effectiveStock = stock !== null ? stock : existing.stockQty;
        let syncStatus: "ok" | "price_changed" | "out_of_stock" = "ok";
        if (effectiveStock === 0 && existing.fulfillmentType === "stock") {
          syncStatus = "out_of_stock";
          if (existing.autoDisableOnOos && existing.status === "active") {
            update.status = "archived";
            changed = true;
          }
        } else if ("costPrice" in update) {
          syncStatus = "price_changed";
        }
        // Re-activate an OOS-archived product when stock returns.
        if (
          effectiveStock > 0 &&
          existing.status === "archived" &&
          existing.autoDisableOnOos &&
          status === undefined
        ) {
          update.status = "active";
          changed = true;
        }

        update.lastSyncedAt = new Date();
        update.syncStatus = syncStatus;
        update.updatedAt = new Date();

        if (!options.dryRun) {
          await db
            .update(products)
            .set(update)
            .where(and(eq(products.tenantId, tenantId), eq(products.id, existing.id)));
        }

        if (changed) {
          summary.updated++;
          summary.details.push({ row: rowNo, sku, action: "updated", note: syncStatus });
        } else {
          summary.unchanged++;
        }
        continue;
      }

      // Not found → optionally create.
      if (!options.createMissing) {
        summary.skipped++;
        summary.details.push({ row: rowNo, sku, action: "skipped", note: "eşleşme yok" });
        continue;
      }
      if (!name || cost === null) {
        summary.skipped++;
        summary.errors.push({ row: rowNo, sku, reason: "Yeni ürün için ad ve maliyet gerekli" });
        continue;
      }

      const resolvedCategory = categoryId ?? options.defaultCategoryId ?? null;
      const finalPrice = await resolveFinalPrice({
        tenantId,
        costPrice: cost.toFixed(2),
        markupPercent: markup !== null ? markup.toFixed(2) : null,
        categoryId: resolvedCategory,
        supplierId,
      });

      if (!options.dryRun) {
        await insertWithUniqueSlug(tenantId, slugify(name), sku, {
          tenantId,
          name,
          supplierId,
          supplierSku: sku,
          categoryId: resolvedCategory,
          brandId,
          costPrice: cost.toFixed(2),
          markupPercent: markup !== null ? markup.toFixed(2) : null,
          finalPrice,
          stockQty: stock ?? 0,
          images: image ? [{ url: image, isPrimary: true }] : [],
          status: status ?? "draft",
          fulfillmentType: "stock",
          lastSyncedAt: new Date(),
          syncStatus: "ok",
        });
      }
      summary.created++;
      summary.details.push({ row: rowNo, sku, action: "created" });
    } catch (err) {
      summary.skipped++;
      summary.errors.push({
        row: rowNo,
        sku,
        reason: err instanceof Error ? err.message : "hata",
      });
    }
  }

  return summary;
}

// Insert a product, retrying with a sku-suffixed slug on unique collision.
async function insertWithUniqueSlug(
  _tenantId: string,
  baseSlug: string,
  sku: string,
  values: Record<string, unknown>,
): Promise<void> {
  const candidates = [baseSlug, `${baseSlug}-${slugify(sku)}`, `${baseSlug}-${Date.now()}`];
  let lastErr: unknown;
  for (const slug of candidates) {
    try {
      await db.insert(products).values({ ...values, slug } as typeof products.$inferInsert);
      return;
    } catch (err) {
      if (typeof err === "object" && err !== null && (err as { code?: string }).code === "23505") {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr ?? new Error("slug_collision");
}
