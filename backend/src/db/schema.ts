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

export const orderStatusEnum = pgEnum("order_status", [
  "pending", // yeni sipariş, ödeme/onay bekliyor
  "confirmed", // onaylandı, hazırlanıyor
  "shipped", // kargoya verildi
  "delivered", // teslim edildi
  "cancelled", // iptal
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "bank_transfer", // havale/EFT
  "cash_on_delivery", // kapıda ödeme
  "card", // online kart (iyzico vb.)
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid", // ödeme bekleniyor (havale/kapıda)
  "awaiting", // kart: sağlayıcıya yönlendirildi, sonuç bekleniyor
  "paid", // ödendi
  "failed", // başarısız
  "refunded", // iade edildi
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
// orders — müşteri siparişleri (checkout ile oluşur)
// ---------------------------------------------------------------------------
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    // insana okunur sipariş numarası (müşteriye gösterilir): GM-XXXXXX
    orderNumber: text("order_number").notNull(),

    // müşteri bilgileri (snapshot — hesap sistemi yok)
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerEmail: text("customer_email"),

    // teslimat adresi
    city: text("city").notNull(),
    district: text("district").notNull(),
    addressLine: text("address_line").notNull(),
    note: text("note"),

    status: orderStatusEnum("status").notNull().default("pending"),

    // --- ödeme ---
    paymentMethod: paymentMethodEnum("payment_method")
      .notNull()
      .default("bank_transfer"),
    paymentStatus: paymentStatusEnum("payment_status")
      .notNull()
      .default("unpaid"),
    paymentRef: text("payment_ref"), // sağlayıcı işlem/ödeme kimliği (kart)

    // tutarlar — checkout sırasında sunucu tarafında hesaplanır (snapshot)
    subtotal: numeric("subtotal", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    shippingCost: numeric("shipping_cost", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    currency: text("currency").notNull().default("TRY"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantOrderNumberIdx: uniqueIndex("orders_tenant_order_number_idx").on(
      t.tenantId,
      t.orderNumber,
    ),
    tenantStatusIdx: index("orders_tenant_status_idx").on(t.tenantId, t.status),
    createdAtIdx: index("orders_created_at_idx").on(t.createdAt),
  }),
);

// ---------------------------------------------------------------------------
// order_items — sipariş satırları (fiyat/isim snapshot olarak yazılır)
// ---------------------------------------------------------------------------
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    // ürün silinse bile satır kalır → set null + snapshot alanları
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),

    // snapshot — sipariş anındaki değerler
    productName: text("product_name").notNull(),
    productSlug: text("product_slug").notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    quantity: integer("quantity").notNull(),
    lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    orderIdx: index("order_items_order_idx").on(t.orderId),
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
  orders: many(orders),
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

export const ordersRelations = relations(orders, ({ one, many }) => ({
  tenant: one(tenants, { fields: [orders.tenantId], references: [tenants.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
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
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

// product.images jsonb şekli
export type ProductImage = {
  url: string;
  alt?: string;
  isPrimary?: boolean;
};
