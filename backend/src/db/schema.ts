// ============================================================================
// GES MARKETİM — Drizzle Schema (PostgreSQL)
// ----------------------------------------------------------------------------
// Kar marjı çözümleme (markup resolution):
//   effectiveMarkup = product.markupPercent
//                     ?? supplier.defaultMarkupPercent
//                     ?? category.defaultMarkupPercent
//   finalPrice = round(costPrice * (1 + effectiveMarkup / 100))   // snapshot
//
// finalPrice DB'ye snapshot olarak yazılır (cost/markup değişince yeniden
// hesaplanır). Pricing helper'ı endpoint adımında ekleyeceğiz.
//
// Multi-tenant: her satırda tenantId var (Gespa OS planına uygun).
// Para birimi: numeric(12,2), exact decimal — float yok.
// ============================================================================

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  numeric,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const fulfillmentTypeEnum = pgEnum("fulfillment_type", [
  "stock", // Manavgat depo, 1-2 gün
  "dropship", // siparişe özel, 5-7 gün
]);

export const productStatusEnum = pgEnum("product_status", [
  "draft",
  "active",
  "archived",
]);

export const syncMethodEnum = pgEnum("sync_method", [
  "manual", // elle güncelleme
  "csv", // bayi panelinden CSV/Excel export
  "api", // tedarikçi API/feed
  "scrape", // son çare: authenticated panel scrape
]);

export const syncStatusEnum = pgEnum("sync_status", [
  "ok",
  "price_changed",
  "out_of_stock",
  "not_found",
  "error",
]);

// ---------------------------------------------------------------------------
// tenants — multi-tenant kök
// ---------------------------------------------------------------------------
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// suppliers — admin-only, müşteriye görünmez (Mexxsun, Enerji Pazarı, Lexron)
// ---------------------------------------------------------------------------
export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    // supplier seviyesi varsayılan marj (kategori default'unu ezer)
    defaultMarkupPercent: numeric("default_markup_percent", {
      precision: 6,
      scale: 2,
    }),
    // sync yapılandırması
    syncMethod: syncMethodEnum("sync_method").notNull().default("manual"),
    // feedUrl, apiKeyRef, login alanları, scrape selector'ları, schedule vb.
    syncConfig: jsonb("sync_config").notNull().default({}),
    // KRİTİK: false = müşteriye asla sızma
    isVisibleToCustomer: boolean("is_visible_to_customer")
      .notNull()
      .default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantSlugIdx: uniqueIndex("suppliers_tenant_slug_idx").on(
      t.tenantId,
      t.slug,
    ),
  }),
);

// ---------------------------------------------------------------------------
// brands — DEYE, LEXRON, EVE, HUAWEI ...
// ---------------------------------------------------------------------------
export const brands = pgTable(
  "brands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logoUrl: text("logo_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantSlugIdx: uniqueIndex("brands_tenant_slug_idx").on(t.tenantId, t.slug),
  }),
);

// ---------------------------------------------------------------------------
// categories — gunes-paneli, inverter, batarya, solar-kablo, montaj, aksesuar
// ---------------------------------------------------------------------------
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    // kategori seviyesi varsayılan marj (en alt fallback)
    defaultMarkupPercent: numeric("default_markup_percent", {
      precision: 6,
      scale: 2,
    })
      .notNull()
      .default("0"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantSlugIdx: uniqueIndex("categories_tenant_slug_idx").on(
      t.tenantId,
      t.slug,
    ),
  }),
);

// ---------------------------------------------------------------------------
// products
// ---------------------------------------------------------------------------
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),

    // ilişkiler
    brandId: uuid("brand_id").references(() => brands.id, {
      onDelete: "set null",
    }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    supplierId: uuid("supplier_id").references(() => suppliers.id, {
      onDelete: "set null",
    }),

    // tedarikçi eşleştirme — sync sırasında ürünü bulmak için
    supplierSku: text("supplier_sku"),
    sourceUrl: text("source_url"), // tedarikçi ürün sayfası (sync/scrape)

    // --- KAR MARJI MOTORU ---
    costPrice: numeric("cost_price", { precision: 12, scale: 2 })
      .notNull()
      .default("0"), // bayi alış fiyatı (asla müşteriye gösterilmez)
    markupPercent: numeric("markup_percent", { precision: 6, scale: 2 }), // null = override yok
    finalPrice: numeric("final_price", { precision: 12, scale: 2 })
      .notNull()
      .default("0"), // snapshot — müşteriye gösterilen
    currency: text("currency").notNull().default("TRY"),

    // --- HİBRİT MODEL + STOK ---
    fulfillmentType: fulfillmentTypeEnum("fulfillment_type")
      .notNull()
      .default("stock"),
    stockQty: integer("stock_qty").notNull().default(0),

    // görseller: [{ url, alt, isPrimary }]
    images: jsonb("images").notNull().default([]),

    status: productStatusEnum("status").notNull().default("draft"),

    // --- SYNC METADATA ---
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    syncStatus: syncStatusEnum("sync_status"),
    autoDisableOnOos: boolean("auto_disable_on_oos").notNull().default(true), // stok 0 → status archived

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantSlugIdx: uniqueIndex("products_tenant_slug_idx").on(
      t.tenantId,
      t.slug,
    ),
    categoryIdx: index("products_category_idx").on(t.categoryId),
    brandIdx: index("products_brand_idx").on(t.brandId),
    supplierIdx: index("products_supplier_idx").on(t.supplierId),
    statusIdx: index("products_status_idx").on(t.status),
    supplierSkuIdx: index("products_supplier_sku_idx").on(
      t.supplierId,
      t.supplierSku,
    ),
  }),
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const tenantsRelations = relations(tenants, ({ many }) => ({
  suppliers: many(suppliers),
  brands: many(brands),
  categories: many(categories),
  products: many(products),
}));

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [suppliers.tenantId],
    references: [tenants.id],
  }),
  products: many(products),
}));

export const brandsRelations = relations(brands, ({ one, many }) => ({
  tenant: one(tenants, { fields: [brands.tenantId], references: [tenants.id] }),
  products: many(products),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [categories.tenantId],
    references: [tenants.id],
  }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  tenant: one(tenants, {
    fields: [products.tenantId],
    references: [tenants.id],
  }),
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id],
  }),
}));

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;
export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

// product.images jsonb şekli
export type ProductImage = {
  url: string;
  alt?: string;
  isPrimary?: boolean;
};
