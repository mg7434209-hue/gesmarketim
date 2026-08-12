// CLI: KATALOĞU SIFIRDAN, AŞAMALI KURULUM — bu aşama SADECE LEXRON.
//
//   npm run db:rebuild -- [data/lexron_fiyatlar_10_08_2026_marj22.csv] [--dry-run]
//
// ADIMLAR:
//   1) YEDEK: products / brands / categories / supplier_prices tabloları
//      backup/<tablo>-<tarih>.json olarak dökülür (commit edilmek üzere).
//   2) TAM TEMİZLİK: products + supplier_prices + brands TAMAMEN boşaltılır
//      (Paket Sistemler dahil). Tek marka kurulur: LEXRON. categories yalnız
//      CSV'nin 7 kategorisi olacak şekilde senkronlanır (Paket Sistemler ve
//      diğer eski kategoriler silinir — boş kategori gösterilmez).
//   3) KURULUM: CSV'deki tüm ürünler SIFIRDAN oluşturulur (eşleştirme yok):
//      supplier=ACS, price_date CSV'den; saleUSD = costUSD × 1.22,
//      saleTRY = saleUSD × kur × 1.02 (tenant ayarlarından, resolvePrices);
//      slug üründen türetilir; supplier_prices'a tarihli maliyet yazılır.
//      out_of_stock satırlar AKTİF kalır (status=active, stockQty=0 →
//      müşteri API'sinde inStock=false: "Stokta Yok", sepete eklenemez);
//      in_stock satırlar dropship (her zaman sipariş edilebilir).
//
// Not: Sonraki marka aşamaları (Mexxsun, Havensis…) kendi listeleriyle
// db:import-csv üzerinden eklenecek; markaları da o aşamada kurulur.

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { db, pool } from "./index.js";
import { products, brands, categories, suppliers, supplierPrices, tenants } from "./schema.js";
import { getTenantId } from "../lib/tenant.js";
import { parseCsv } from "../lib/sync/csv.js";
import { resolvePrices, invalidateTenantPricing } from "./resolvePrice.js";
import { slugify } from "../lib/util.js";

// Bu aşamanın kategori seti (CSV kategori adı → slug + sıra)
const CATEGORIES = [
  { name: "Panel", slug: "panel", sortOrder: 1 },
  { name: "İnverter", slug: "inverter", sortOrder: 2 },
  { name: "Akü Batarya", slug: "aku-batarya", sortOrder: 3 },
  { name: "Şarj Kontrol", slug: "sarj-kontrol", sortOrder: 4 },
  { name: "Solar Pompa", slug: "solar-pompa", sortOrder: 5 },
  { name: "Aydınlatma", slug: "aydinlatma", sortOrder: 6 },
  { name: "Kablo Konnektör", slug: "kablo-konnektor", sortOrder: 7 },
];
const BRAND = { name: "LEXRON", slug: "lexron" };
const SUPPLIER_SLUG = "acs-enerji";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const fileArg = args.find((a) => !a.startsWith("--"));
const here = path.dirname(fileURLToPath(import.meta.url));
const csvPath = fileArg
  ? path.resolve(fileArg)
  : path.resolve(here, "../../data/lexron_fiyatlar_10_08_2026_marj22.csv");

try {
  if (!fs.existsSync(csvPath)) throw new Error("CSV bulunamadı: " + csvPath);
  const tenantId = await getTenantId();

  // ---- 1) YEDEK ----
  const backupDir = path.resolve(here, "../../backup");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const dump = async (name: string, rows: unknown[]) => {
    const f = path.join(backupDir, `${name}-${stamp}.json`);
    fs.writeFileSync(f, JSON.stringify(rows, null, 1));
    console.log(`[yedek] ${name}: ${rows.length} kayıt → ${path.relative(process.cwd(), f)}`);
  };
  await dump("products", await db.select().from(products).where(eq(products.tenantId, tenantId)));
  await dump("brands", await db.select().from(brands).where(eq(brands.tenantId, tenantId)));
  await dump("categories", await db.select().from(categories).where(eq(categories.tenantId, tenantId)));
  await dump("supplier_prices", await db.select().from(supplierPrices).where(eq(supplierPrices.tenantId, tenantId)));

  if (dryRun) {
    console.log("[dry-run] temizlik ve kurulum atlandı (yalnız yedek alındı)");
    await pool.end();
    process.exit(0);
  }

  // ---- 2) TAM TEMİZLİK ----
  await db.delete(supplierPrices).where(eq(supplierPrices.tenantId, tenantId));
  await db.delete(products).where(eq(products.tenantId, tenantId));
  await db.delete(brands).where(eq(brands.tenantId, tenantId));
  console.log("[temizlik] products + supplier_prices + brands boşaltıldı");

  const [lexron] = await db
    .insert(brands)
    .values({ tenantId, name: BRAND.name, slug: BRAND.slug })
    .returning({ id: brands.id });
  console.log("[marka] tek marka kuruldu: LEXRON");

  // Kategoriler: 7'liyi kur/güncelle, kalan her şeyi (Paket Sistemler dahil) sil
  const wantSlugs = new Set(CATEGORIES.map((c) => c.slug));
  const existingCats = await db.select().from(categories).where(eq(categories.tenantId, tenantId));
  for (const c of existingCats) {
    if (!wantSlugs.has(c.slug)) {
      await db.delete(categories).where(eq(categories.id, c.id));
      console.log(`[kategori] silindi: ${c.name} (${c.slug})`);
    }
  }
  const catId = new Map<string, string>();
  for (const c of CATEGORIES) {
    const found = existingCats.find((e) => e.slug === c.slug);
    if (found) {
      await db.update(categories)
        .set({ name: c.name, sortOrder: c.sortOrder, defaultMarkupPercent: null, updatedAt: new Date() })
        .where(eq(categories.id, found.id));
      catId.set(c.name, found.id);
    } else {
      const [row] = await db.insert(categories)
        .values({ tenantId, name: c.name, slug: c.slug, sortOrder: c.sortOrder, defaultMarkupPercent: null })
        .returning({ id: categories.id });
      catId.set(c.name, row.id);
    }
  }
  console.log(`[kategori] ${CATEGORIES.length} kategori hazır: ${CATEGORIES.map((c) => c.name).join(" · ")}`);

  // Tedarikçi: ACS
  let [acs] = await db.select({ id: suppliers.id }).from(suppliers)
    .where(eq(suppliers.slug, SUPPLIER_SLUG));
  if (!acs) {
    [acs] = await db.insert(suppliers)
      .values({ tenantId, name: "ACS Enerji", slug: SUPPLIER_SLUG, defaultMarkupPercent: null, isVisibleToCustomer: false })
      .returning({ id: suppliers.id });
  }

  // ---- 3) KURULUM ----
  invalidateTenantPricing(tenantId);
  const [t] = await db.select({ fx: tenants.fxUsdTry }).from(tenants).where(eq(tenants.id, tenantId));
  console.log(`[kurulum] kur: ${t?.fx} · marj: tenant default (%22) · tampon: %2`);

  const { rows } = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const usedSlugs = new Set<string>();
  let created = 0, oos = 0;
  for (const row of rows) {
    const name = row.name?.trim();
    const costUsd = parseFloat(row.cost_usd);
    if (!name || !Number.isFinite(costUsd) || costUsd <= 0) {
      console.warn(`[atla] fiyatsız/adsız satır: ${name ?? "?"}`);
      continue;
    }
    let slug = slugify(name);
    if (usedSlugs.has(slug)) slug = `${slug}-2`;
    usedSlugs.add(slug);

    const outOfStock = slugify(row.stock_status ?? "") === "out-of-stock";
    const priceDate = /^\d{4}-\d{2}-\d{2}$/.test(row.price_date ?? "") ? row.price_date : stamp;
    const costTl = parseFloat(row.cost_tl);

    const prices = await resolvePrices({
      tenantId,
      costPrice: Number.isFinite(costTl) ? costTl.toFixed(2) : null,
      costUsd: costUsd.toFixed(2),
      markupPercent: null,
      categoryId: catId.get(row.category) ?? null,
      supplierId: acs.id,
    });

    const [p] = await db.insert(products).values({
      tenantId,
      slug,
      name,
      brandId: lexron.id,
      categoryId: catId.get(row.category) ?? null,
      supplierId: acs.id,
      supplierSku: slug,
      costPrice: Number.isFinite(costTl) ? costTl.toFixed(2) : "0.00",
      costUsd: costUsd.toFixed(2),
      markupPercent: null,
      finalPrice: prices.finalPrice,
      saleUsd: prices.saleUsd,
      // Stokta olanlar dropship (sipariş üzerine, her zaman satılabilir);
      // out_of_stock AKTİF kalır ama stockQty=0 → "Stokta Yok", sepete eklenemez.
      fulfillmentType: outOfStock ? "stock" : "dropship",
      stockQty: 0,
      status: "active",
      autoDisableOnOos: false, // OOS ürün yayında kalsın (rozetli)
      lastSyncedAt: new Date(),
      syncStatus: outOfStock ? "out_of_stock" : "ok",
    }).returning({ id: products.id });

    await db.insert(supplierPrices).values({
      tenantId,
      productId: p.id,
      supplierId: acs.id,
      priceDate,
      costUsd: costUsd.toFixed(2),
      costTry: Number.isFinite(costTl) ? costTl.toFixed(2) : null,
    }).onConflictDoNothing();

    created++;
    if (outOfStock) oos++;
  }

  console.log(`[kurulum] ${created} ürün oluşturuldu (${oos} tanesi Stokta Yok rozetli)`);

  // Kategori bazında rapor
  const all = await db.select({ categoryId: products.categoryId }).from(products)
    .where(eq(products.tenantId, tenantId));
  const perCat: Record<string, number> = {};
  for (const c of CATEGORIES) perCat[c.name] = all.filter((p) => p.categoryId === catId.get(c.name)).length;
  console.log("[rapor] kategori dağılımı:", JSON.stringify(perCat));

  await pool.end();
} catch (err) {
  console.error("[rebuild] hata:", err);
  await pool.end();
  process.exit(1);
}
