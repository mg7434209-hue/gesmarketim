// CLI: tedarikçi fiyat listesi CSV'sini sync engine ile içeri al.
//
//   npm run db:import-csv                          → data/gesmarketim_fiyatlar_marj22.csv
//   npm run db:import-csv -- path/to/file.csv      → başka dosya
//   npm run db:import-csv -- --supplier=lexron     → tedarikçi (varsayılan lexron)
//   npm run db:import-csv -- --match-by-name       → SKU yerine ürün ADI (slug) ile
//                                                    tenant genelinde eşleş + eşleşen
//                                                    ürünün tedarikçisini buna devret
//   npm run db:import-csv -- --cleanup=slug1,slug2 → import sonrası bu tedarikçilerin
//                                                    listede OLMAYAN/fiyatsız aktif
//                                                    ürünlerini yayından kaldır
//                                                    (Mexxsun + Paket Sistemler korunur)
//   npm run db:import-csv -- --dry-run             → önizleme (yazmaz)
//   npm run db:import-csv -- --no-recompute        → import sonrası recompute atla
//
// Kurallar (spec B2):
//   - Motor SADECE cost_usd kolonunu kullanır; sale_usd / sale_tl* kolonları
//     doğrulama içindir (sapma varsa summary detayına not düşülür).
//   - Maliyetler supplier_prices arşivine tarihli yazılır (CSV price_date
//     kolonu; yoksa bugün). costUsd değişiyorsa eski değer de arşivlenir.
//   - Fiyatı olmayan yeni ürün satırı atlanır ve loglanır.
//   - "Paket Sistemler" kategorisi ŞİMDİLİK yayın dışı: satırları draft gelir
//     (veri durur, vitrine çıkmaz; yerine "kendi projeni oluştur" akışı
//     frontend oturumunda yapılacak — bkz. docs/anasayfa-v2-spec.md BÖLÜM A).
//   - Diğer in_stock satırlar doğrudan "active" yayınlanır; ürünler dropship
//     modelinde açılır (sayısal stok bilgisi listede yok).
//   - Import bitince finalPrice/saleUsd snapshot'ları yeniden hesaplanır.

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "./index.js";
import { suppliers, products } from "./schema.js";
import { getTenantId } from "../lib/tenant.js";
import { parseCsv } from "../lib/sync/csv.js";
import { runCsvSync } from "../lib/sync/engine.js";
import { deactivateMissingProducts } from "../lib/sync/cleanup.js";
import { recomputeTenantPrices } from "./recomputePrices.js";
import { slugify } from "../lib/util.js";

const HIDDEN_CATEGORIES = new Set(["paket-sistemler"]); // şimdilik yayın dışı
// Temizlik korumaları: Mexxsun ayrı tedarikçidir (bu listelerde olmaması
// normal); Paket Sistemler kendi bundle'larımızdır.
const PROTECTED_SUPPLIERS = ["mexxsun"];
const PROTECTED_CATEGORIES = ["paket-sistemler"];

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const skipRecompute = args.includes("--no-recompute");
const matchByName = args.includes("--match-by-name");
const cleanupSlugs = (args.find((a) => a.startsWith("--cleanup="))?.slice("--cleanup=".length) ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const supplierSlug =
  args.find((a) => a.startsWith("--supplier="))?.slice("--supplier=".length) ?? "lexron";
const fileArg = args.find((a) => !a.startsWith("--"));

const here = path.dirname(fileURLToPath(import.meta.url));
const csvPath = fileArg
  ? path.resolve(fileArg)
  : path.resolve(here, "../../data/gesmarketim_fiyatlar_marj22.csv");

try {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV bulunamadı: ${csvPath}`);
  }
  const tenantId = await getTenantId();

  // Tedarikçiyi çöz (yoksa oluştur — kademeli marj boş, sabit %22 dönemi).
  let [supplier] = await db
    .select({ id: suppliers.id, name: suppliers.name })
    .from(suppliers)
    .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.slug, supplierSlug)))
    .limit(1);
  if (!supplier) {
    if (dryRun) throw new Error(`Tedarikçi yok: ${supplierSlug} (dry-run oluşturmaz)`);
    const [created] = await db
      .insert(suppliers)
      .values({
        tenantId,
        name: supplierSlug,
        slug: supplierSlug,
        defaultMarkupPercent: null,
        isVisibleToCustomer: false,
      })
      .returning({ id: suppliers.id, name: suppliers.name });
    supplier = created;
    console.log(`[import] tedarikçi oluşturuldu: ${supplierSlug}`);
  }

  const { rows } = parseCsv(fs.readFileSync(csvPath, "utf8"));
  if (rows.length === 0) throw new Error("CSV satırı bulunamadı.");

  // Satır bazında yayın durumu enjekte et: engine "status" kolonunu tanır.
  // Paket Sistemler → draft (şimdilik gizli); stokta olan diğerleri → active.
  for (const row of rows) {
    if (row.status || row.durum) continue; // dosyadaki açık değere karışma
    const cat = slugify(row.category ?? row.kategori ?? "");
    const oos = slugify(row.stock_status ?? row.stok_durumu ?? "") === "out-of-stock";
    if (HIDDEN_CATEGORIES.has(cat)) row.status = "draft";
    else if (!oos) row.status = "active";
  }

  console.log(
    `[import] ${path.basename(csvPath)} → tedarikçi "${supplier.name}" ` +
      `(${rows.length} satır${dryRun ? ", dry-run" : ""})`,
  );

  const summary = await runCsvSync(tenantId, supplier.id, rows, {
    createMissing: true,
    defaultFulfillment: "dropship",
    matchByName,
    reassignSupplier: matchByName, // ad eşleşmesi = fiyat kaynağı devri
    archivePrices: true,
    dryRun,
  });

  console.log(
    `[import] +${summary.created} yeni, ~${summary.updated} güncellendi, ` +
      `=${summary.unchanged} aynı, ${summary.skipped} atlandı`,
  );
  for (const e of summary.errors) {
    console.warn(`  ! satır ${e.row} (${e.sku || "-"}): ${e.reason}`);
  }
  for (const d of summary.details) {
    if (d.note?.includes("sale_usd doğrulama")) {
      console.warn(`  ? satır ${d.row} (${d.sku}): ${d.note}`);
    }
  }

  // Katalog temizliği: kapsam tedarikçilerinin listede olmayan aktif ürünleri
  if (cleanupSlugs.length > 0) {
    const cl = await deactivateMissingProducts({
      tenantId,
      supplierSlugs: cleanupSlugs,
      keepIds: new Set(summary.matchedIds),
      protectedSupplierSlugs: PROTECTED_SUPPLIERS,
      protectedCategorySlugs: PROTECTED_CATEGORIES,
      dryRun,
    });
    console.log(
      `[cleanup]${dryRun ? " (dry-run)" : ""} ${cl.scanned} aktif ürün tarandı — ` +
        `${cl.deactivated.length} yayından kaldırıldı, ${cl.protectedSkipped} korumalı atlandı`,
    );
  }

  if (!skipRecompute && !dryRun) {
    const rc = await recomputeTenantPrices(tenantId);
    console.log(
      `[recompute] toplam ${rc.total} ürün — ${rc.changed} değişti, ${rc.unchanged} aynı`,
    );
  }

  // Tedarikçi bazında aktif ürün raporu (doğrulama için).
  const supAll = await db
    .select({ id: suppliers.id, slug: suppliers.slug })
    .from(suppliers)
    .where(eq(suppliers.tenantId, tenantId));
  const activeRows = await db
    .select({ supplierId: products.supplierId })
    .from(products)
    .where(and(eq(products.tenantId, tenantId), eq(products.status, "active"),
      inArray(products.supplierId, supAll.map((s) => s.id))));
  const bySup: Record<string, number> = {};
  activeRows.forEach((r) => {
    const slug = supAll.find((s) => s.id === r.supplierId)?.slug ?? "?";
    bySup[slug] = (bySup[slug] || 0) + 1;
  });
  console.log("[rapor] aktif ürün / tedarikçi:", JSON.stringify(bySup));

  await pool.end();
  process.exit(summary.errors.length > 0 && summary.created + summary.updated === 0 ? 1 : 0);
} catch (err) {
  console.error("[import] hata:", err);
  await pool.end();
  process.exit(1);
}
