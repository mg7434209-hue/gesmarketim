// ============================================================================
// GES MARKETİM — Drizzle Schema (PostgreSQL)
// ----------------------------------------------------------------------------
// Kar marjı çözümleme (markup resolution):
//   effectiveMarkup = product.markupPercent
//                     ?? supplier.defaultMarkupPercent
//                     ?? category.defaultMarkupPercent
//                     ?? tenant.defaultMarkup × 100
//
// Sabit %22 dönemi: kademeli (tiered) kayıtlar migration 0005 ile NULL'a
// çekildi, tablo yapıları duruyor — bir kademeye değer yazmak o kademeyi
// yeniden devreye alır.
//
// Fiyat hesabı (USD maliyetli ürünler — costUsd dolu):
//   saleUSD  = round2(costUsd × (1 + markup))
//   saleTRY  = round2(saleUSD × tenant.fxUsdTry × (1 + fxBufferPct/100))
//   tavan    : competitorPrice (₺, doluysa) üstü kırpılır
//   taban    : costUsd × kur × (1 + minProfitPct/100) altına inilmez
// TRY maliyetli ürünlerde (costUsd boş) eski yol: costPrice × (1 + markup),
// tavan/taban kuralları orada da uygulanır.
//
// finalPrice (ve saleUsd) DB'ye snapshot olarak yazılır (cost/markup/kur
// değişince `npm run db:recompute` ile yeniden hesaplanır).
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
  date,
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
  // Sabit kâr marjı — ORAN olarak (0.22 = %22). Kademeli kayıtlar boşken tüm
  // ürünler bu marja düşer.
  defaultMarkup: numeric("default_markup", { precision: 6, scale: 4 })
    .notNull()
    .default("0.22"),
  // USD/TRY kuru — USD maliyetli ürünlerin ₺ satış fiyatı bu kurdan üretilir.
  // Kur değişince PATCH /api/admin/pricing (recompute:true) ya da
  // `npm run db:recompute` ile snapshot'lar tazelenir.
  fxUsdTry: numeric("fx_usd_try", { precision: 12, scale: 4 })
    .notNull()
    .default("47.20"),
  // Kur tamponu (%) — saleTRY hesabına çarpan olarak girer (%2 varsayılan).
  fxBufferPct: numeric("fx_buffer_pct", { precision: 6, scale: 2 })
    .notNull()
    .default("2.00"),
  // Maliyet + minimum kâr tabanı (%) — rakip tavanı fiyatı ne kadar aşağı
  // çekerse çeksin satış fiyatı maliyetin bu kadar üstünde kalır.
  minProfitPct: numeric("min_profit_pct", { precision: 6, scale: 2 })
    .notNull()
    .default("10.00"),
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
    // kategori seviyesi varsayılan marj — null = kademe boş, tenant
    // default'una düşülür (sabit %22 dönemi; 0005 migration'ı boşalttı)
    defaultMarkupPercent: numeric("default_markup_percent", {
      precision: 6,
      scale: 2,
    }),
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
      .default("0"), // bayi alış fiyatı ₺ (asla müşteriye gösterilmez)
    // USD maliyet — doluysa fiyat USD yolundan hesaplanır (asla müşteriye
    // gösterilmez); costPrice ₺ alanı bu ürünlerde kullanılmaz.
    costUsd: numeric("cost_usd", { precision: 12, scale: 2 }),
    markupPercent: numeric("markup_percent", { precision: 6, scale: 2 }), // null = override yok
    finalPrice: numeric("final_price", { precision: 12, scale: 2 })
      .notNull()
      .default("0"), // snapshot ₺ — müşteriye gösterilen
    // USD satış snapshot'ı (costUsd × (1+marj)) — bilgi amaçlı müşteriye de
    // gösterilebilir (maliyet DEĞİLDİR, satış fiyatıdır).
    saleUsd: numeric("sale_usd", { precision: 12, scale: 2 }),
    // Rakip fiyat tavanı ₺ — doluysa finalPrice bunun üstüne çıkmaz
    // (maliyet+min kâr tabanı yine de korunur).
    competitorPrice: numeric("competitor_price", { precision: 12, scale: 2 }),
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
// supplier_prices — tedarikçi maliyet ARŞİVİ (fiyat listesi geçmişi)
// Her CSV import'u günün fiyatını tarihli satır olarak yazar; ürünün önceki
// maliyeti de değişmeden önce arşiv satırı olarak saklanır. products.costUsd
// her zaman GÜNCEL değerdir; bu tablo yalnız geçmiş/denetim içindir ve
// müşteriye ASLA gösterilmez.
// ---------------------------------------------------------------------------
export const supplierPrices = pgTable(
  "supplier_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id").references(() => suppliers.id, {
      onDelete: "set null",
    }),
    priceDate: date("price_date").notNull(), // fiyat listesinin tarihi
    costUsd: numeric("cost_usd", { precision: 12, scale: 2 }),
    costTry: numeric("cost_try", { precision: 12, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // Aynı ürün+tedarikçi+tarih bir kez yazılır — import idempotent kalır.
    uniqIdx: uniqueIndex("supplier_prices_product_supplier_date_idx").on(
      t.productId,
      t.supplierId,
      t.priceDate,
    ),
    productIdx: index("supplier_prices_product_idx").on(t.tenantId, t.productId),
    supplierIdx: index("supplier_prices_supplier_idx").on(t.supplierId),
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

    // opsiyonel müşteri hesabı bağlantısı (misafir siparişlerde null kalır).
    // Hesap silinse bile sipariş + snapshot bilgileri korunur.
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),

    // müşteri bilgileri (snapshot — hesaplı veya misafir, her zaman yazılır)
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
    // Müşteri sipariş geçmişi sorgusu (GET /api/account/orders) için.
    customerIdx: index("orders_customer_idx").on(t.tenantId, t.customerId),
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
// customers — opsiyonel müşteri hesapları (kayıt/giriş + sipariş geçmişi)
// ---------------------------------------------------------------------------
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    // e-posta küçük harfe normalize edilerek saklanır (tenant başına benzersiz)
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),

    name: text("name").notNull(),
    phone: text("phone"),

    // checkout'u hızlandırmak için opsiyonel varsayılan teslimat adresi
    defaultCity: text("default_city"),
    defaultDistrict: text("default_district"),
    defaultAddress: text("default_address"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantEmailIdx: uniqueIndex("customers_tenant_email_idx").on(
      t.tenantId,
      t.email,
    ),
  }),
);

// ---------------------------------------------------------------------------
// leads — Sistem Kur v2 potansiyel müşteri kayıtları
// dogrulama = keşif/doğrulama randevusu, whatsapp = WhatsApp'a geçiş,
// pdf = teklif PDF'i istedi. ozetJson: teklif/hesap özeti snapshot'ı.
// ---------------------------------------------------------------------------
export const leadTipEnum = pgEnum("lead_tip", ["dogrulama", "whatsapp", "pdf"]);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    tip: leadTipEnum("tip").notNull(),
    ad: text("ad").notNull(),
    telefon: text("telefon").notNull(),
    email: text("email"),

    // Sistem Kur teklif/hesap özeti (paket kalemleri, toplam, hesap girdileri)
    ozetJson: jsonb("ozet_json"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantCreatedIdx: index("leads_tenant_created_idx").on(t.tenantId, t.createdAt),
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
  customers: many(customers),
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
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [customers.tenantId],
    references: [tenants.id],
  }),
  orders: many(orders),
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
export type SupplierPrice = typeof supplierPrices.$inferSelect;
export type NewSupplierPrice = typeof supplierPrices.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

// product.images jsonb şekli
export type ProductImage = {
  url: string;
  alt?: string;
  isPrimary?: boolean;
};
