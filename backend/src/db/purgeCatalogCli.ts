// CLI: KALICI katalog temizliği — hayali/demo verileri siler, markaları
// whitelist ile senkronize eder. (Deaktivasyondan farklıdır: silinen kayıtlar
// seed/demo kaynaklıdır, gerçek SKU geçmişi yoktur.)
//
//   npm run db:purge -- [--dry-run]
//
// KURALLAR:
//   1) MARKA WHITELIST (slug): lexron, mexxsun, havensis, arcelik, bakirlar,
//      smart, jinko, deye, eve, sorotec, ecosol.
//      Whitelist DIŞI markalı ürünler KALICI SİLİNİR — istisnalar:
//      Mexxsun/Havensis tedarikçili ürünler ve Paket Sistemler (DOKUNULMAZ),
//      son ACS import'unda eşleşen ürünler (fiyat kaynağı var → kalır).
//   2) KAYNAK KURALI: bir ürün şu üç kaynaktan HİÇBİRİNE bağlanamıyorsa
//      KALICI SİLİNİR: (a) ACS fiyat listesi (supplier_prices'ta ACS kaydı),
//      (b) supplier=MEXXSUN, (c) supplier=HAVENSIS.
//      İstisna: ACS/Lexron tedarikçili olup listede olmayanlar SİLİNMEZ,
//      arşivde tutulur (fiyat dönerse tek adımda açılır) — zaten
//      deactivateMissingProducts bunu yapar.
//   3) brands tablosu whitelist ile senkronlanır: listede olmayan marka
//      kaydı silinir (üründeki brandId FK "set null" ile düşer), eksik
//      whitelist markası eklenir. Müşteri marka filtresi bu tablodan
//      beslendiği için filtre kendiliğinden düzelir.
//   4) Her silinen/deaktive edilen kayıt ayrı ayrı loglanır.

import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "./index.js";
import { products, brands, suppliers, categories, supplierPrices } from "./schema.js";
import { getTenantId } from "../lib/tenant.js";

// Geçerli markalar: genel + panel kategorisi ek + ACS listesinden gelenler
const BRAND_WHITELIST: { name: string; slug: string }[] = [
  { name: "LEXRON", slug: "lexron" },
  { name: "MEXXSUN", slug: "mexxsun" },
  { name: "HAVENSIS", slug: "havensis" },
  { name: "ARÇELİK", slug: "arcelik" },
  { name: "BAKIRLAR", slug: "bakirlar" },
  { name: "SMART", slug: "smart" },
  { name: "JINKO", slug: "jinko" },
  { name: "DEYE", slug: "deye" },
  { name: "EVE", slug: "eve" },
  { name: "SOROTEC", slug: "sorotec" },
  { name: "ECOSOL", slug: "ecosol" },
];
const WL_SLUGS = new Set(BRAND_WHITELIST.map((b) => b.slug));

// Tedarikçi rolleri
const PROTECTED_SUPPLIERS = ["mexxsun", "havensis"]; // DOKUNMA
const ARCHIVE_SUPPLIERS = ["acs-enerji", "lexron"]; // listede yoksa arşiv (silme)
const PROTECTED_CATEGORIES = ["paket-sistemler"]; // kendi bundle'larımız

const dryRun = process.argv.includes("--dry-run");

try {
  const tenantId = await getTenantId();

  const supRows = await db
    .select({ id: suppliers.id, slug: suppliers.slug })
    .from(suppliers)
    .where(eq(suppliers.tenantId, tenantId));
  const supIdsOf = (slugs: string[]) =>
    supRows.filter((s) => slugs.includes(s.slug)).map((s) => s.id);
  const protectedSupIds = supIdsOf(PROTECTED_SUPPLIERS);
  const archiveSupIds = supIdsOf(ARCHIVE_SUPPLIERS);
  const acsId = supRows.find((s) => s.slug === "acs-enerji")?.id ?? null;

  const catRows = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories)
    .where(eq(categories.tenantId, tenantId));
  const protectedCatIds = catRows
    .filter((c) => PROTECTED_CATEGORIES.includes(c.slug))
    .map((c) => c.id);

  const brandRows = await db
    .select({ id: brands.id, slug: brands.slug, name: brands.name })
    .from(brands)
    .where(eq(brands.tenantId, tenantId));
  const offListBrandIds = brandRows.filter((b) => !WL_SLUGS.has(b.slug)).map((b) => b.id);

  // ACS fiyat listesine bağlı ürünler (import'un yazdığı arşiv kayıtları)
  const acsPriced = new Set<string>();
  if (acsId) {
    const rows = await db
      .selectDistinct({ productId: supplierPrices.productId })
      .from(supplierPrices)
      .where(and(eq(supplierPrices.tenantId, tenantId), eq(supplierPrices.supplierId, acsId)));
    rows.forEach((r) => acsPriced.add(r.productId));
  }

  // Önce/sonra raporu için korunan tedarikçi sayıları
  async function countBySup(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const rows = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.tenantId, tenantId), inArray(products.supplierId, ids)));
    return rows.length;
  }
  const beforeMexxsun = await countBySup(supIdsOf(["mexxsun"]));
  const beforeHavensis = await countBySup(supIdsOf(["havensis"]));
  console.log(`[önce] Mexxsun ürün: ${beforeMexxsun} · Havensis ürün: ${beforeHavensis}`);

  // ---- SİLME ADAYLARI ----
  // (A) whitelist dışı markalı ürünler + (B) üç kaynağa da bağlanamayanlar.
  // Korumalar: mexxsun/havensis tedarikçisi, paket-sistemler kategorisi,
  // ACS listesinde eşleşenler, ACS/Lexron tedarikçili olanlar (onlar arşive).
  const all = await db
    .select({
      id: products.id,
      name: products.name,
      status: products.status,
      brandId: products.brandId,
      supplierId: products.supplierId,
      categoryId: products.categoryId,
    })
    .from(products)
    .where(eq(products.tenantId, tenantId));

  const brandName = new Map(brandRows.map((b) => [b.id, b.name]));
  const supSlug = new Map(supRows.map((s) => [s.id, s.slug]));
  const offBrand = new Set(offListBrandIds);
  const protSup = new Set(protectedSupIds);
  const archSup = new Set(archiveSupIds);
  const protCat = new Set(protectedCatIds);

  const toDelete: typeof all = [];
  const toArchive: typeof all = [];
  for (const p of all) {
    if (p.supplierId && protSup.has(p.supplierId)) continue; // Mexxsun/Havensis DOKUNMA
    if (p.categoryId && protCat.has(p.categoryId)) continue; // Paket Sistemler DOKUNMA
    if (acsPriced.has(p.id)) continue; // ACS listesinde → kalır

    const badBrand = p.brandId !== null && offBrand.has(p.brandId);
    const fromArchiveSup = p.supplierId !== null && archSup.has(p.supplierId);

    if (badBrand) { toDelete.push(p); continue; } // hayali marka → KALICI SİL
    if (!fromArchiveSup) { toDelete.push(p); continue; } // hiçbir kaynağa bağlı değil → SİL
    if (p.status === "active") toArchive.push(p); // ACS/Lexron ama listede yok → arşiv
  }

  for (const p of toDelete) {
    console.log(
      `DELETED: ${p.name} (marka: ${p.brandId ? brandName.get(p.brandId) : "-"}, ` +
        `tedarikçi: ${p.supplierId ? supSlug.get(p.supplierId) : "-"}) — hayali/demo kayıt, kaynak yok`,
    );
  }
  if (!dryRun && toDelete.length > 0) {
    await db.delete(products).where(
      and(eq(products.tenantId, tenantId), inArray(products.id, toDelete.map((p) => p.id))),
    );
  }

  for (const p of toArchive) {
    console.log(`DEACTIVATED: ${p.name} — ACS listesinde fiyat yok`);
  }
  if (!dryRun && toArchive.length > 0) {
    await db
      .update(products)
      .set({ status: "archived", syncStatus: "not_found", updatedAt: new Date() })
      .where(and(eq(products.tenantId, tenantId), inArray(products.id, toArchive.map((p) => p.id))));
  }

  // ---- MARKA SENKRONU ----
  for (const b of brandRows) {
    if (WL_SLUGS.has(b.slug)) continue;
    console.log(`BRAND DELETED: ${b.name} (${b.slug}) — whitelist dışı`);
    if (!dryRun) {
      await db.delete(brands).where(and(eq(brands.tenantId, tenantId), eq(brands.id, b.id)));
    }
  }
  const haveSlugs = new Set(brandRows.filter((b) => WL_SLUGS.has(b.slug)).map((b) => b.slug));
  for (const b of BRAND_WHITELIST) {
    if (haveSlugs.has(b.slug)) continue;
    console.log(`BRAND ADDED: ${b.name} (${b.slug})`);
    if (!dryRun) {
      await db.insert(brands).values({ tenantId, name: b.name, slug: b.slug }).onConflictDoNothing();
    }
  }

  const afterMexxsun = await countBySup(supIdsOf(["mexxsun"]));
  const afterHavensis = await countBySup(supIdsOf(["havensis"]));
  console.log(
    `[özet]${dryRun ? " (dry-run)" : ""} ${toDelete.length} ürün SİLİNDİ, ` +
      `${toArchive.length} ürün arşivlendi`,
  );
  console.log(`[sonra] Mexxsun ürün: ${afterMexxsun} · Havensis ürün: ${afterHavensis}`);
  if (afterMexxsun !== beforeMexxsun || afterHavensis !== beforeHavensis) {
    console.error("UYARI: korunan tedarikçi sayıları değişti!");
    process.exitCode = 1;
  }

  await pool.end();
} catch (err) {
  console.error("[purge] hata:", err);
  await pool.end();
  process.exit(1);
}
