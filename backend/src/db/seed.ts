import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "./index.js";
import { tenants, suppliers, categories, brands } from "./schema.js";

async function main() {
  console.log("Seed baÅŸlÄ±yor...");

  // 1) Tenant
  await db
    .insert(tenants)
    .values({ name: "GES MARKETÄ°M", slug: "gesmarketim" })
    .onConflictDoNothing();
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, "gesmarketim"));
  if (!tenant) throw new Error("Tenant oluÅŸturulamadÄ±");
  const tenantId = tenant.id;
  console.log("âœ“ tenant:", tenant.slug);

  // 2) Suppliers (admin-only, mÃ¼ÅŸteriye gÃ¶rÃ¼nmez)
  await db
    .insert(suppliers)
    .values([
      { tenantId, name: "Lexron", slug: "lexron", isVisibleToCustomer: false },
      { tenantId, name: "Mexxsun", slug: "mexxsun", isVisibleToCustomer: false },
      {
        tenantId,
        name: "Enerji PazarÄ±",
        slug: "enerji-pazari",
        isVisibleToCustomer: false,
      },
    ])
    .onConflictDoNothing();
  console.log("âœ“ suppliers: 3");

  // 3) Categories
  await db
    .insert(categories)
    .values([
      { tenantId, name: "GÃ¼neÅŸ Paneli", slug: "gunes-paneli", sortOrder: 1 },
      { tenantId, name: "Ä°nverter", slug: "inverter", sortOrder: 2 },
      { tenantId, name: "Batarya", slug: "batarya", sortOrder: 3 },
      { tenantId, name: "Solar Kablo", slug: "solar-kablo", sortOrder: 4 },
      { tenantId, name: "Montaj AparatÄ±", slug: "montaj-aparati", sortOrder: 5 },
      { tenantId, name: "Aksesuar", slug: "aksesuar", sortOrder: 6 },
    ])
    .onConflictDoNothing();
  console.log("âœ“ categories: 6");

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
  console.log("âœ“ brands: 4");

  console.log("Seed tamamlandÄ± âœ…");
  await pool.end();
}

main().catch((err) => {
  console.error("Seed hatasÄ±:", err);
  process.exit(1);
});

