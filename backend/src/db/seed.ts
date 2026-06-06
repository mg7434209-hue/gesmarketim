import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "./index";
import { tenants, suppliers, categories, brands } from "./schema";

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
    .values([
      { tenantId, name: "Lexron", slug: "lexron", isVisibleToCustomer: false },
      { tenantId, name: "Mexxsun", slug: "mexxsun", isVisibleToCustomer: false },
      {
        tenantId,
        name: "Enerji Pazarı",
        slug: "enerji-pazari",
        isVisibleToCustomer: false,
      },
    ])
    .onConflictDoNothing();
  console.log("✓ suppliers: 3");

  // 3) Categories
  await db
    .insert(categories)
    .values([
      { tenantId, name: "Güneş Paneli", slug: "gunes-paneli", sortOrder: 1 },
      { tenantId, name: "İnverter", slug: "inverter", sortOrder: 2 },
      { tenantId, name: "Batarya", slug: "batarya", sortOrder: 3 },
      { tenantId, name: "Solar Kablo", slug: "solar-kablo", sortOrder: 4 },
      { tenantId, name: "Montaj Aparatı", slug: "montaj-aparati", sortOrder: 5 },
      { tenantId, name: "Aksesuar", slug: "aksesuar", sortOrder: 6 },
    ])
    .onConflictDoNothing();
  console.log("✓ categories: 6");

  // 4) Brands
  await db
    .insert(brands)
    .values([
      { tenantId, name: "DEYE", slug: "deye" },
      { tenantId, name: "LEXRON", slug: "lexron" },
      { tenantId, name: "EVE", slug: "eve" },
      { tenantId, name: "HUAWEI", slug: "huawei" },
    ])
    .onConflictDoNothing();
  console.log("✓ brands: 4");

  console.log("Seed tamamlandı ✅");
  await pool.end();
}

main().catch((err) => {
  console.error("Seed hatası:", err);
  process.exit(1);
});
