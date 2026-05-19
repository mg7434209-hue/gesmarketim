// Drizzle schema — GES MARKETİM
//
// Visibility rule:
//   - `suppliers` rows are ADMIN ONLY. Never expose supplier name / id / supplier_sku
//     on storefront API responses or HTML. Use distinct PublicProduct vs AdminProduct DTOs.
//   - `brands` rows ARE customer-visible.
//
// Pricing resolution order (effective price for a product):
//   1. products.manual_price_override          ← if not null, wins
//   2. cost_price * (1 + margin_fraction), where margin_fraction is the FIRST non-null of:
//        a. products.margin_pct_override
//        b. suppliers.default_margin_pct
//        c. categories.default_margin_pct
//        d. fallback 25% (hard-coded floor; rename if you want a config var)
//
// All money columns use numeric(12,2) (TRY). All percent columns use numeric(5,2) where
// 25.00 means 25% — divide by 100 when computing.

import { relations } from 'drizzle-orm';
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// suppliers — ADMIN ONLY
// ---------------------------------------------------------------------------
export const suppliers = pgTable(
  'suppliers',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    notes: text('notes'),
    // 25.00 == 25%
    defaultMarginPct: numeric('default_margin_pct', { precision: 5, scale: 2 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    nameUniq: uniqueIndex('suppliers_name_uniq').on(t.name),
    slugUniq: uniqueIndex('suppliers_slug_uniq').on(t.slug),
  }),
);

// ---------------------------------------------------------------------------
// brands — CUSTOMER VISIBLE
// ---------------------------------------------------------------------------
export const brands = pgTable(
  'brands',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    logoUrl: text('logo_url'),
    description: text('description'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    nameUniq: uniqueIndex('brands_name_uniq').on(t.name),
    slugUniq: uniqueIndex('brands_slug_uniq').on(t.slug),
  }),
);

// ---------------------------------------------------------------------------
// categories — supports a single level of nesting via parent_id
// ---------------------------------------------------------------------------
export const categories = pgTable(
  'categories',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    parentId: integer('parent_id'),
    description: text('description'),
    imageUrl: text('image_url'),
    defaultMarginPct: numeric('default_margin_pct', { precision: 5, scale: 2 }),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugUniq: uniqueIndex('categories_slug_uniq').on(t.slug),
    parentIdx: index('categories_parent_idx').on(t.parentId),
  }),
);

// ---------------------------------------------------------------------------
// products — joins brand (public), supplier (admin-only), category
// ---------------------------------------------------------------------------
export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    sku: text('sku').notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),

    brandId: integer('brand_id').references(() => brands.id, { onDelete: 'set null' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    // Supplier link — ADMIN-ONLY data. Storefront responses must strip this field.
    supplierId: integer('supplier_id')
      .notNull()
      .references(() => suppliers.id, { onDelete: 'restrict' }),
    supplierSku: text('supplier_sku'), // admin only

    // Money (TRY)
    costPrice: numeric('cost_price', { precision: 12, scale: 2 }).notNull(),
    manualPriceOverride: numeric('manual_price_override', { precision: 12, scale: 2 }),
    marginPctOverride: numeric('margin_pct_override', { precision: 5, scale: 2 }),

    stock: integer('stock').notNull().default(0),
    weightKg: numeric('weight_kg', { precision: 8, scale: 3 }),

    images: jsonb('images').$type<string[]>().notNull().default([]),
    specs: jsonb('specs').$type<Record<string, string | number | boolean>>().notNull().default({}),

    isActive: boolean('is_active').notNull().default(true),
    isFeatured: boolean('is_featured').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    skuUniq: uniqueIndex('products_sku_uniq').on(t.sku),
    slugUniq: uniqueIndex('products_slug_uniq').on(t.slug),
    categoryIdx: index('products_category_idx').on(t.categoryId),
    brandIdx: index('products_brand_idx').on(t.brandId),
    supplierIdx: index('products_supplier_idx').on(t.supplierId),
    activeFeaturedIdx: index('products_active_featured_idx').on(t.isActive, t.isFeatured),
  }),
);

// ---------------------------------------------------------------------------
// admin_users — staff that can log into /admin
// ---------------------------------------------------------------------------
export const adminUsers = pgTable(
  'admin_users',
  {
    id: serial('id').primaryKey(),
    username: text('username').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').notNull().default('admin'), // 'admin' | 'editor'
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    usernameUniq: uniqueIndex('admin_users_username_uniq').on(t.username),
  }),
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
}));

export const categoriesRelations = relations(categories, ({ many, one }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'category_parent',
  }),
  children: many(categories, { relationName: 'category_parent' }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  supplier: one(suppliers, { fields: [products.supplierId], references: [suppliers.id] }),
}));

// ---------------------------------------------------------------------------
// Convenience types
// ---------------------------------------------------------------------------
export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;

export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;

// ---------------------------------------------------------------------------
// DTO helpers — keep supplier fields out of storefront responses.
// Use stripSupplierFields() on any product before returning it from a public route.
// ---------------------------------------------------------------------------
const SUPPLIER_FIELDS = ['supplierId', 'supplierSku'] as const;

export type PublicProduct = Omit<Product, (typeof SUPPLIER_FIELDS)[number]>;

export function stripSupplierFields<T extends Partial<Product>>(
  p: T,
): Omit<T, (typeof SUPPLIER_FIELDS)[number]> {
  const rest: Record<string, unknown> = { ...p };
  for (const f of SUPPLIER_FIELDS) {
    delete rest[f];
  }
  return rest as Omit<T, (typeof SUPPLIER_FIELDS)[number]>;
}

// ---------------------------------------------------------------------------
// Allowlist helpers — use these in seed / bulk-update endpoints.
// See: /memory feedback-seed-endpoints
// ---------------------------------------------------------------------------
export const PRODUCT_WRITABLE_FIELDS = [
  'sku',
  'name',
  'slug',
  'description',
  'brandId',
  'categoryId',
  'supplierId',
  'supplierSku',
  'costPrice',
  'manualPriceOverride',
  'marginPctOverride',
  'stock',
  'weightKg',
  'images',
  'specs',
  'isActive',
  'isFeatured',
] as const;

export const SUPPLIER_WRITABLE_FIELDS = [
  'name',
  'slug',
  'contactEmail',
  'contactPhone',
  'notes',
  'defaultMarginPct',
  'isActive',
] as const;

export const BRAND_WRITABLE_FIELDS = [
  'name',
  'slug',
  'logoUrl',
  'description',
  'sortOrder',
  'isActive',
] as const;

export const CATEGORY_WRITABLE_FIELDS = [
  'name',
  'slug',
  'parentId',
  'description',
  'imageUrl',
  'defaultMarginPct',
  'sortOrder',
  'isActive',
] as const;

export function allowlist<T extends readonly string[]>(
  allowed: T,
  payload: Record<string, unknown>,
): Partial<Record<T[number], unknown>> {
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in payload) out[key] = payload[key];
  }
  return out as Partial<Record<T[number], unknown>>;
}
