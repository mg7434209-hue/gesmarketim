// Supplier CSV sync engine. Matches incoming rows to products by
// (supplierId, supplierSku), updates cost/stock/markup, recomputes finalPrice,
// auto-archives out-of-stock items (when product.autoDisableOnOos), and can
// create missing products as drafts. Returns a per-run summary.
//
// Accepted column headers (case-insensitive, TR/EN aliases):
//   sku|stok_kodu|supplier_sku   (yoksa slugify(name) anahtar olur)
//   name|ad|urun
//   cost|maliyet|alis|fiyat|price       (₺ maliyet)
//   cost_usd|maliyet_usd                ($ maliyet — doluysa ₺ cost YOK SAYILIR;
//                                        satış fiyatını motor kendisi hesaplar)
//   sale_usd, sale_tl*                  (SADECE doğrulama — asla fiyat kaynağı
//                                        değildir; sale_usd sapması not düşülür)
//   markup|marj
//   stock|stok|adet
//   stock_status|stok_durumu            (in_stock|out_of_stock|stokta|tükendi)
//   category|kategori                   (slug ya da ad — createMissing ile oluşur)
//   brand|marka                         (slug ya da ad — createMissing ile oluşur)
//   image|gorsel|resim                  (image URL)
//   status|durum                        (draft|active|archived)
//
// Fiyatı olmayan YENİ ürün satırı atlanır ve loglanır (summary.errors +
// console.warn) — mevcut ürünler fiyatsız satırla yalnız stok güncelleyebilir.

import { and, eq, or } from "drizzle-orm";
import { db } from "../../db/index.js";
import { products, categories, brands, supplierPrices } from "../../db/schema.js";
import { resolvePrices } from "../../db/resolvePrice.js";
import { slugify } from "../util.js";
import { parseNumber } from "./csv.js";

export interface SyncOptions {
  createMissing: boolean;
  defaultCategoryId?: string | null;
  /** createMissing ile oluşturulan ürünlerin tedarik modeli (varsayılan "stock"). */
  defaultFulfillment?: "stock" | "dropship";
  /** true → SKU yerine ürün ADI ile eşleştir: slugify(name), TENANT genelinde
   *  (supplierSku VEYA slug). Tedarikçi değişse de aynı ürün bulunur. */
  matchByName?: boolean;
  /** true → eşleşen ürünün supplierId'si bu import'un tedarikçisine devredilir
   *  (fiyat kaynağı değişimi — ör. Lexron listesinden ACS listesine geçiş). */
  reassignSupplier?: boolean;
  /** true → maliyetler supplier_prices arşivine yazılır: satırın price_date'i
   *  (yoksa bugün) ile günün fiyatı; costUsd DEĞİŞİYORSA eski değer de eski
   *  tedarikçi + son senkron tarihiyle arşivlenir. */
  archivePrices?: boolean;
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
  /** Bu import'ta eşleşen/oluşturulan ürün id'leri (katalog temizliği bunun
   *  DIŞINDA kalan ürünleri hedefler). dryRun'da da dolar. */
  matchedIds: string[];
}

function pick(row: Record<string, string>, keys: string[]): string | undefined {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== "") return row[k];
  }
  return undefined;
}

/** stock_status kolonunu normalize et: "in" | "out" | undefined. */
function parseStockStatus(raw: string | undefined): "in" | "out" | undefined {
  if (!raw) return undefined;
  const v = slugify(raw);
  if (["in-stock", "instock", "stokta", "var", "mevcut"].includes(v)) return "in";
  if (["out-of-stock", "outofstock", "oos", "stok-yok", "yok", "tukendi"].includes(v)) return "out";
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
    matchedIds: [],
  };

  // Günün maliyetini (ve değişiyorsa eski maliyeti) fiyat arşivine yaz.
  // (productId, supplierId, priceDate) benzersizdir — tekrar import idempotent.
  async function archivePriceRow(
    productId: string,
    supId: string | null,
    priceDate: string,
    costUsdVal: string | null,
    costTryVal: string | null,
  ): Promise<void> {
    if (options.dryRun) return;
    await db
      .insert(supplierPrices)
      .values({ tenantId, productId, supplierId: supId, priceDate, costUsd: costUsdVal, costTry: costTryVal })
      .onConflictDoNothing();
  }

  // Prefetch slug → id maps for category/brand resolution.
  const [catRows, brandRows] = await Promise.all([
    db.select({ id: categories.id, slug: categories.slug }).from(categories).where(eq(categories.tenantId, tenantId)),
    db.select({ id: brands.id, slug: brands.slug }).from(brands).where(eq(brands.tenantId, tenantId)),
  ]);
  const catBySlug = new Map(catRows.map((c) => [c.slug, c.id]));
  const brandBySlug = new Map(brandRows.map((b) => [b.slug, b.id]));

  // Kategori/marka "slug ya da ad" olarak gelebilir; ad geldiyse slug'ına
  // indirger, eşleşme yoksa (createMissing + yazma modunda) oluşturur.
  // Kademeli marj boş bırakılır — fiyat tenant default marjından çözülür.
  async function resolveCategoryId(raw: string | undefined): Promise<string | null> {
    if (!raw) return null;
    const slug = catBySlug.has(raw) ? raw : slugify(raw);
    const hit = catBySlug.get(slug);
    if (hit) return hit;
    if (!options.createMissing || options.dryRun) return null;
    const [created] = await db
      .insert(categories)
      .values({ tenantId, name: raw.trim(), slug })
      .onConflictDoNothing()
      .returning({ id: categories.id });
    if (created) {
      catBySlug.set(slug, created.id);
      return created.id;
    }
    return null;
  }

  async function resolveBrandId(raw: string | undefined): Promise<string | null> {
    if (!raw) return null;
    const slug = brandBySlug.has(raw) ? raw : slugify(raw);
    const hit = brandBySlug.get(slug);
    if (hit) return hit;
    if (!options.createMissing || options.dryRun) return null;
    const [created] = await db
      .insert(brands)
      .values({ tenantId, name: raw.trim(), slug })
      .onConflictDoNothing()
      .returning({ id: brands.id });
    if (created) {
      brandBySlug.set(slug, created.id);
      return created.id;
    }
    return null;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNo = i + 2; // +1 header, +1 to 1-index
    const name = pick(row, ["name", "ad", "urun", "ürün"]);
    // SKU yoksa (yeni fiyat listesi formatı) ürün adı slug'ı anahtar olur —
    // aynı tedarikçide ad sabit kaldıkça sonraki import'lar da eşleşir.
    const sku =
      pick(row, ["sku", "stok_kodu", "supplier_sku", "stokkodu"]) ??
      (name ? slugify(name) : undefined);
    if (!sku) {
      summary.skipped++;
      summary.errors.push({ row: rowNo, sku: "", reason: "SKU ve ürün adı eksik" });
      continue;
    }

    const costUsd = parseNumber(pick(row, ["cost_usd", "maliyet_usd", "usd_maliyet"]));
    // USD maliyet varken ₺ cost kolonu YOK SAYILIR — fiyatı motor hesaplar.
    const cost =
      costUsd !== null
        ? null
        : parseNumber(pick(row, ["cost", "maliyet", "alis", "alış", "fiyat", "price"]));
    // sale_* kolonları yalnız doğrulama içindir; fiyat kaynağı DEĞİLDİR.
    const saleUsdCsv = parseNumber(pick(row, ["sale_usd", "satis_usd", "satış_usd"]));
    // Arşiv alanları: liste tarihi (YYYY-MM-DD) + bilgi amaçlı ₺ maliyet.
    const priceDateRaw = pick(row, ["price_date", "tarih", "fiyat_tarihi"]);
    const priceDate =
      priceDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(priceDateRaw)
        ? priceDateRaw
        : new Date().toISOString().slice(0, 10);
    const costTl = parseNumber(pick(row, ["cost_tl", "maliyet_tl", "cost_try"]));
    const markup = parseNumber(pick(row, ["markup", "marj"]));
    const stock = parseNumber(pick(row, ["stock", "stok", "adet"]));
    const stockStatus = parseStockStatus(pick(row, ["stock_status", "stok_durumu"]));
    const categoryRaw = pick(row, ["category", "kategori"]);
    const brandRaw = pick(row, ["brand", "marka"]);
    const image = pick(row, ["image", "gorsel", "görsel", "resim"]);
    const statusRaw = pick(row, ["status", "durum"]);
    const status =
      statusRaw === "active" || statusRaw === "archived" || statusRaw === "draft"
        ? statusRaw
        : undefined;

    try {
      const categoryId = await resolveCategoryId(categoryRaw);
      const brandId = await resolveBrandId(brandRaw);

      // matchByName: tedarikçiden bağımsız, tenant genelinde ad slug'ı ile
      // eşleş (önceki import'lar supplierSku'yu slugify(name) yazar; slug da
      // aynı addan türetilir). Aksi halde klasik (supplierId, supplierSku).
      const [existing] = await db
        .select()
        .from(products)
        .where(
          options.matchByName
            ? and(
                eq(products.tenantId, tenantId),
                or(eq(products.supplierSku, sku), eq(products.slug, sku)),
              )
            : and(
                eq(products.tenantId, tenantId),
                eq(products.supplierId, supplierId),
                eq(products.supplierSku, sku),
              ),
        )
        .limit(1);

      if (existing) {
        summary.matchedIds.push(existing.id);
        const update: Record<string, unknown> = {};
        let changed = false;

        if (cost !== null && Number(existing.costPrice) !== cost) {
          update.costPrice = cost.toFixed(2);
          changed = true;
        }
        if (
          costUsd !== null &&
          (existing.costUsd === null || Number(existing.costUsd) !== costUsd)
        ) {
          // Eski maliyeti, eski tedarikçisi + son senkron tarihiyle arşivle.
          if (options.archivePrices && existing.costUsd !== null) {
            const oldDate = (existing.lastSyncedAt ?? existing.createdAt)
              .toISOString()
              .slice(0, 10);
            await archivePriceRow(existing.id, existing.supplierId, oldDate, existing.costUsd, null);
          }
          update.costUsd = costUsd.toFixed(2);
          changed = true;
        }
        // Fiyat kaynağı devri: ürün artık bu import'un tedarikçisinden geliyor.
        if (options.reassignSupplier && existing.supplierId !== supplierId) {
          update.supplierId = supplierId;
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

        // Günün maliyetini fiyat arşivine yaz (değişmese de tarihli kayıt).
        if (options.archivePrices && (costUsd !== null || costTl !== null)) {
          await archivePriceRow(
            existing.id,
            supplierId,
            priceDate,
            costUsd !== null ? costUsd.toFixed(2) : null,
            costTl !== null ? costTl.toFixed(2) : null,
          );
        }

        // Recompute snapshot prices when pricing inputs changed.
        let computedSaleUsd: string | null = null;
        if (
          "costPrice" in update ||
          "costUsd" in update ||
          "markupPercent" in update ||
          "categoryId" in update ||
          "supplierId" in update
        ) {
          const prices = await resolvePrices({
            tenantId,
            costPrice: (update.costPrice as string | undefined) ?? existing.costPrice,
            costUsd: (update.costUsd as string | undefined) ?? existing.costUsd,
            competitorPrice: existing.competitorPrice,
            markupPercent:
              "markupPercent" in update ? (update.markupPercent as string) : existing.markupPercent,
            categoryId: ("categoryId" in update ? update.categoryId : existing.categoryId) as string | null,
            supplierId,
          });
          update.finalPrice = prices.finalPrice;
          update.saleUsd = prices.saleUsd;
          computedSaleUsd = prices.saleUsd;
        }

        // Stock-driven availability. Tedarikçinin stock_status kolonu sayısal
        // stok gibi davranır: out → stok yok, in → satışta.
        const effectiveStock = stock !== null ? stock : existing.stockQty;
        const supplierOos =
          stockStatus === "out" ||
          (stockStatus === undefined && effectiveStock === 0 && existing.fulfillmentType === "stock");
        let syncStatus: "ok" | "price_changed" | "out_of_stock" = "ok";
        if (supplierOos) {
          syncStatus = "out_of_stock";
          if (existing.autoDisableOnOos && existing.status === "active") {
            update.status = "archived";
            changed = true;
          }
        } else if ("costPrice" in update || "costUsd" in update) {
          syncStatus = "price_changed";
        }
        // Re-activate an OOS-archived product when stock returns.
        const supplierBack =
          stockStatus === "in" || (stockStatus === undefined && effectiveStock > 0);
        if (
          supplierBack &&
          !supplierOos &&
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
          summary.details.push({
            row: rowNo,
            sku,
            action: "updated",
            note: appendDriftNote(syncStatus, computedSaleUsd, saleUsdCsv),
          });
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
      if (!name || (cost === null && costUsd === null)) {
        // Fiyatı olmayan ürün atlanır ve loglanır (spec B2 kuralı).
        const reason = !name
          ? "Yeni ürün için ad gerekli"
          : "Fiyat yok (cost_usd/maliyet boş) — atlandı";
        summary.skipped++;
        summary.errors.push({ row: rowNo, sku, reason });
        console.warn(`[sync] satır ${rowNo} (${sku}): ${reason}`);
        continue;
      }

      const resolvedCategory = categoryId ?? options.defaultCategoryId ?? null;
      const prices = await resolvePrices({
        tenantId,
        costPrice: cost !== null ? cost.toFixed(2) : null,
        costUsd: costUsd !== null ? costUsd.toFixed(2) : null,
        markupPercent: markup !== null ? markup.toFixed(2) : null,
        categoryId: resolvedCategory,
        supplierId,
      });

      // Yeni üründe stock_status=in iken sayısal stok bilinmiyorsa "stock"
      // modelinde ürün stoksuz görünmesin diye dropship önerilir; karar
      // çağırana bırakılır (defaultFulfillment).
      const fulfillment = options.defaultFulfillment ?? "stock";
      const createdStatus =
        status ?? (stockStatus === "out" ? "archived" : "draft");

      if (!options.dryRun) {
        const newId = await insertWithUniqueSlug(tenantId, slugify(name), sku, {
          tenantId,
          name,
          supplierId,
          supplierSku: sku,
          categoryId: resolvedCategory,
          brandId,
          costPrice: cost !== null ? cost.toFixed(2) : "0.00",
          costUsd: costUsd !== null ? costUsd.toFixed(2) : null,
          markupPercent: markup !== null ? markup.toFixed(2) : null,
          finalPrice: prices.finalPrice,
          saleUsd: prices.saleUsd,
          stockQty: stock ?? 0,
          images: image ? [{ url: image, isPrimary: true }] : [],
          status: createdStatus,
          fulfillmentType: fulfillment,
          lastSyncedAt: new Date(),
          syncStatus: stockStatus === "out" ? "out_of_stock" : "ok",
        });
        summary.matchedIds.push(newId);
        if (options.archivePrices && (costUsd !== null || costTl !== null)) {
          await archivePriceRow(
            newId,
            supplierId,
            priceDate,
            costUsd !== null ? costUsd.toFixed(2) : null,
            costTl !== null ? costTl.toFixed(2) : null,
          );
        }
      }
      summary.created++;
      summary.details.push({
        row: rowNo,
        sku,
        action: "created",
        note: appendDriftNote(undefined, prices.saleUsd, saleUsdCsv),
      });
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

// CSV'nin sale_usd doğrulama kolonu ile motorun hesabı 1 kuruştan fazla
// ayrışırsa nota düşülür — fiyat kaynağı yine motor hesabıdır.
function appendDriftNote(
  base: string | undefined,
  computedSaleUsd: string | null,
  saleUsdCsv: number | null,
): string | undefined {
  if (computedSaleUsd === null || saleUsdCsv === null) return base;
  const drift = Math.abs(Number(computedSaleUsd) - saleUsdCsv);
  if (drift <= 0.01) return base;
  const note = `sale_usd doğrulama: CSV=${saleUsdCsv.toFixed(2)} hesap=${computedSaleUsd}`;
  return base ? `${base}; ${note}` : note;
}

// Insert a product, retrying with a sku-suffixed slug on unique collision.
// Returns the new product's id.
async function insertWithUniqueSlug(
  _tenantId: string,
  baseSlug: string,
  sku: string,
  values: Record<string, unknown>,
): Promise<string> {
  const candidates = [baseSlug, `${baseSlug}-${slugify(sku)}`, `${baseSlug}-${Date.now()}`];
  let lastErr: unknown;
  for (const slug of candidates) {
    try {
      const [row] = await db
        .insert(products)
        .values({ ...values, slug } as typeof products.$inferInsert)
        .returning({ id: products.id });
      return row.id;
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
