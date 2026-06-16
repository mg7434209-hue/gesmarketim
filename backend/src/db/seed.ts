import "dotenv/config";
import { eq, and } from "drizzle-orm";
import { db, pool } from "./index.js";
import { tenants, suppliers, categories, brands, products } from "./schema.js";
import { computeFinalPrice } from "./pricing.js";
import { slugify } from "../lib/util.js";

// ---------------------------------------------------------------------------
// Idempotent seed: tenant + taxonomy + a representative product catalogue.
// Re-runnable; uses onConflictDoNothing and slug lookups.
// ---------------------------------------------------------------------------

type SeedProduct = {
  name: string;
  category: string; // category slug
  brand: string; // brand slug
  supplier: string; // supplier slug
  costPrice: number;
  markupPercent: number;
  fulfillmentType: "stock" | "dropship";
  stockQty: number;
  description: string;
};

const SUPPLIERS = [
  { name: "Lexron", slug: "lexron", defaultMarkupPercent: "20" },
  { name: "Mexxsun", slug: "mexxsun", defaultMarkupPercent: "22" },
  { name: "Enerji Pazarı", slug: "enerji-pazari", defaultMarkupPercent: "25" },
];

const CATEGORIES = [
  { name: "Güneş Paneli", slug: "gunes-paneli", defaultMarkupPercent: "18", sortOrder: 1 },
  { name: "İnverter", slug: "inverter", defaultMarkupPercent: "22", sortOrder: 2 },
  { name: "Batarya", slug: "batarya", defaultMarkupPercent: "20", sortOrder: 3 },
  { name: "Solar Kablo", slug: "solar-kablo", defaultMarkupPercent: "30", sortOrder: 4 },
  { name: "Montaj Aparatı", slug: "montaj-aparati", defaultMarkupPercent: "35", sortOrder: 5 },
  { name: "Aksesuar", slug: "aksesuar", defaultMarkupPercent: "40", sortOrder: 6 },
];

const BRANDS = [
  { name: "DEYE", slug: "deye" },
  { name: "LEXRON", slug: "lexron" },
  { name: "EVE", slug: "eve" },
  { name: "HUAWEI", slug: "huawei" },
];

const PRODUCTS: SeedProduct[] = [
  {
    name: "Lexron 550W Half-Cut Monokristal Güneş Paneli",
    category: "gunes-paneli", brand: "lexron", supplier: "lexron",
    costPrice: 3200, markupPercent: 18, fulfillmentType: "stock", stockQty: 48,
    description: "144 hücreli half-cut monokristal panel. Yüksek verim, düşük ışıkta güçlü performans. 12 yıl ürün, 25 yıl performans garantisi.",
  },
  {
    name: "DEYE 605W TopCon Güneş Paneli",
    category: "gunes-paneli", brand: "deye", supplier: "mexxsun",
    costPrice: 3850, markupPercent: 17, fulfillmentType: "stock", stockQty: 36,
    description: "Yeni nesil TOPCon hücre teknolojisi ile %22+ verim. Çatı ve arazi kurulumları için ideal.",
  },
  {
    name: "Lexron 450W Güneş Paneli",
    category: "gunes-paneli", brand: "lexron", supplier: "lexron",
    costPrice: 2650, markupPercent: 18, fulfillmentType: "stock", stockQty: 60,
    description: "Kompakt çatılar için 450W monokristal panel. Dengeli fiyat/performans.",
  },
  {
    name: "DEYE SUN-5K-SG04LP3 5kW Hibrit İnverter",
    category: "inverter", brand: "deye", supplier: "mexxsun",
    costPrice: 18500, markupPercent: 20, fulfillmentType: "stock", stockQty: 12,
    description: "Tek faz 5kW hibrit inverter. Akü entegrasyonu, WiFi izleme, MPPT çift giriş.",
  },
  {
    name: "DEYE SUN-12K-SG04LP3 12kW Trifaze Hibrit İnverter",
    category: "inverter", brand: "deye", supplier: "mexxsun",
    costPrice: 42000, markupPercent: 19, fulfillmentType: "dropship", stockQty: 0,
    description: "Trifaze 12kW hibrit inverter. Yüksek güçlü konut ve işletmeler için. Paralel bağlama desteği.",
  },
  {
    name: "HUAWEI SUN2000-5KTL-L1 5kW İnverter",
    category: "inverter", brand: "huawei", supplier: "enerji-pazari",
    costPrice: 24500, markupPercent: 18, fulfillmentType: "dropship", stockQty: 0,
    description: "Huawei akıllı string inverter. AFCI ark koruması, FusionSolar uygulama desteği.",
  },
  {
    name: "EVE 280Ah LiFePO4 Lityum Batarya Hücresi",
    category: "batarya", brand: "eve", supplier: "enerji-pazari",
    costPrice: 2900, markupPercent: 22, fulfillmentType: "stock", stockQty: 80,
    description: "3.2V 280Ah A+ sınıf LiFePO4 hücre. 6000+ çevrim ömrü. DIY batarya paketleri için.",
  },
  {
    name: "DEYE RW-M5.3 5.3kWh LiFePO4 Akü",
    category: "batarya", brand: "deye", supplier: "mexxsun",
    costPrice: 38000, markupPercent: 18, fulfillmentType: "dropship", stockQty: 0,
    description: "Duvar tipi 5.3kWh düşük voltaj batarya modülü. DEYE hibrit inverterlerle tam uyumlu.",
  },
  {
    name: "6mm² Solar Kablo - Kırmızı (100m)",
    category: "solar-kablo", brand: "lexron", supplier: "lexron",
    costPrice: 1450, markupPercent: 30, fulfillmentType: "stock", stockQty: 40,
    description: "TÜV sertifikalı 6mm² PV1-F solar DC kablo. UV ve hava koşullarına dayanıklı. 100 metre makara.",
  },
  {
    name: "4mm² Solar Kablo - Siyah (100m)",
    category: "solar-kablo", brand: "lexron", supplier: "lexron",
    costPrice: 1050, markupPercent: 30, fulfillmentType: "stock", stockQty: 55,
    description: "4mm² PV1-F solar kablo, 100 metre. Çift izolasyon, 1500V DC.",
  },
  {
    name: "MC4 Konnektör Çifti (10 Adet)",
    category: "aksesuar", brand: "lexron", supplier: "lexron",
    costPrice: 280, markupPercent: 40, fulfillmentType: "stock", stockQty: 120,
    description: "IP67 su geçirmez MC4 erkek-dişi konnektör seti. 10 çift. TÜV sertifikalı.",
  },
  {
    name: "Trapez Çatı Montaj Kiti (4 Panel)",
    category: "montaj-aparati", brand: "lexron", supplier: "enerji-pazari",
    costPrice: 1850, markupPercent: 35, fulfillmentType: "stock", stockQty: 25,
    description: "Sac/trapez çatılar için alüminyum montaj kiti. 4 panel kapasiteli, paslanmaz cıvatalar dahil.",
  },
  {
    name: "Alüminyum Montaj Rayı 4.2m",
    category: "montaj-aparati", brand: "lexron", supplier: "enerji-pazari",
    costPrice: 520, markupPercent: 35, fulfillmentType: "stock", stockQty: 90,
    description: "Anodize alüminyum güneş paneli montaj rayı, 4.2 metre. Tüm standart kelepçelerle uyumlu.",
  },
  {
    name: "DC Sigorta + Parafudr Koruma Kutusu",
    category: "aksesuar", brand: "lexron", supplier: "mexxsun",
    costPrice: 1650, markupPercent: 38, fulfillmentType: "dropship", stockQty: 0,
    description: "2 string DC kombiner kutu. Parafudr (SPD), DC sigortalar ve şalter dahil. IP65.",
  },
];

async function main() {
  console.log("Seed başlıyor...");

  // 1) Tenant
  await db
    .insert(tenants)
    .values({ name: "GES MARKETİM", slug: "gesmarketim" })
    .onConflictDoNothing();
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, "gesmarketim"));
  if (!tenant) throw new Error("Tenant oluşturulamadı");
  const tenantId = tenant.id;
  console.log("✓ tenant:", tenant.slug);

  // 2) Suppliers (admin-only, müşteriye görünmez)
  await db
    .insert(suppliers)
    .values(
      SUPPLIERS.map((s) => ({
        tenantId,
        name: s.name,
        slug: s.slug,
        defaultMarkupPercent: s.defaultMarkupPercent,
        isVisibleToCustomer: false,
      })),
    )
    .onConflictDoNothing();
  console.log(`✓ suppliers: ${SUPPLIERS.length}`);

  // 3) Categories
  await db
    .insert(categories)
    .values(CATEGORIES.map((c) => ({ tenantId, ...c })))
    .onConflictDoNothing();
  console.log(`✓ categories: ${CATEGORIES.length}`);

  // 4) Brands
  await db
    .insert(brands)
    .values(BRANDS.map((b) => ({ tenantId, ...b })))
    .onConflictDoNothing();
  console.log(`✓ brands: ${BRANDS.length}`);

  // Lookup maps for product foreign keys
  const catRows = await db.select().from(categories).where(eq(categories.tenantId, tenantId));
  const brandRows = await db.select().from(brands).where(eq(brands.tenantId, tenantId));
  const supRows = await db.select().from(suppliers).where(eq(suppliers.tenantId, tenantId));
  const catId = new Map(catRows.map((c) => [c.slug, c.id]));
  const brandId = new Map(brandRows.map((b) => [b.slug, b.id]));
  const supId = new Map(supRows.map((s) => [s.slug, s.id]));

  // 5) Products (finalPrice computed via the pricing engine)
  let created = 0;
  for (const p of PRODUCTS) {
    const slug = slugify(p.name);
    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.slug, slug)))
      .limit(1);
    if (existing.length > 0) continue;

    const { finalPrice } = computeFinalPrice({
      costPrice: p.costPrice,
      productMarkupPct: p.markupPercent,
      supplierMarkupPct: null,
      categoryMarkupPct: null,
    });

    await db.insert(products).values({
      tenantId,
      slug,
      name: p.name,
      description: p.description,
      brandId: brandId.get(p.brand) ?? null,
      categoryId: catId.get(p.category) ?? null,
      supplierId: supId.get(p.supplier) ?? null,
      costPrice: String(p.costPrice),
      markupPercent: String(p.markupPercent),
      finalPrice: finalPrice.toFixed(2),
      currency: "TRY",
      fulfillmentType: p.fulfillmentType,
      stockQty: p.stockQty,
      images: [],
      status: "active",
    });
    created++;
  }
  console.log(`✓ products: ${created} eklendi (${PRODUCTS.length - created} zaten vardı)`);

  console.log("Seed tamamlandı ✅");
  await pool.end();
}

main().catch((err) => {
  console.error("Seed hatası:", err);
  process.exit(1);
});
