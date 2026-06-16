// Admin API — auth-gated CRUD for the catalog + order management.
//
//   POST /api/admin/login            { username, password }  → sets session cookie
//   POST /api/admin/logout
//   GET  /api/admin/me
//   GET  /api/admin/stats            dashboard summary
//
//   GET/POST            /api/admin/products            (+ ?q,?status,?category)
//   GET/PATCH/DELETE    /api/admin/products/:id
//   GET/POST            /api/admin/categories
//   PATCH/DELETE        /api/admin/categories/:id
//   GET/POST            /api/admin/brands
//   PATCH/DELETE        /api/admin/brands/:id
//   GET/POST            /api/admin/suppliers
//   PATCH/DELETE        /api/admin/suppliers/:id
//   GET                 /api/admin/orders             (+ ?status)
//   GET                 /api/admin/orders/:id
//   PATCH               /api/admin/orders/:id         { status }
//
// Write rule (README): every multi-field write intersects the incoming keys
// with an explicit ALLOWED_FIELDS set before touching the DB. finalPrice is
// ALWAYS recomputed server-side from the markup chain — never client-supplied.

import { Router, json, type Request, type Response, type NextFunction } from "express";
import { and, asc, desc, eq, ilike, sql, type SQL } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  brands,
  categories,
  suppliers,
  products,
  orders,
  type ProductImage,
} from "../db/schema.js";
import { getTenantId } from "../lib/tenant.js";
import { resolveFinalPrice } from "../db/resolvePrice.js";
import { slugify } from "../lib/util.js";
import { isUploadConfigured, uploadImage, activeProvider, UploadError } from "../lib/storage/index.js";
import { parseCsv } from "../lib/sync/csv.js";
import { runCsvSync } from "../lib/sync/engine.js";
import {
  verifyCredentials,
  issueToken,
  setAdminCookie,
  clearAdminCookie,
  requireAdmin,
} from "../lib/auth.js";

export const adminRouter = Router();

function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Keep only allowed keys from a payload (the README allowlist rule). */
function pick<T extends string>(
  body: Record<string, unknown>,
  allowed: readonly T[],
): Partial<Record<T, unknown>> {
  const out: Partial<Record<T, unknown>> = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key)) out[key] = body[key];
  }
  return out;
}

function asNumericStr(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : null;
}

function asInt(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isInteger(n) ? n : fallback;
}

function sanitizeImages(v: unknown): ProductImage[] {
  if (!Array.isArray(v)) return [];
  const out: ProductImage[] = [];
  for (const raw of v) {
    if (typeof raw !== "object" || raw === null) continue;
    const url = (raw as Record<string, unknown>).url;
    if (typeof url !== "string" || url.trim() === "") continue;
    const alt = (raw as Record<string, unknown>).alt;
    const isPrimary = (raw as Record<string, unknown>).isPrimary;
    out.push({
      url: url.trim(),
      alt: typeof alt === "string" ? alt : undefined,
      isPrimary: Boolean(isPrimary),
    });
  }
  // exactly one primary (first one wins if none flagged)
  if (out.length > 0 && !out.some((i) => i.isPrimary)) out[0].isPrimary = true;
  return out;
}

const PG_UNIQUE_VIOLATION = "23505";
function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === PG_UNIQUE_VIOLATION;
}

// ===========================================================================
// AUTH
// ===========================================================================
adminRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const username = typeof body.username === "string" ? body.username : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!verifyCredentials(username, password)) {
      res.status(401).json({ error: "invalid_credentials" });
      return;
    }
    setAdminCookie(res, issueToken());
    res.json({ ok: true });
  }),
);

adminRouter.post("/logout", (_req, res) => {
  clearAdminCookie(res);
  res.json({ ok: true });
});

adminRouter.get("/me", requireAdmin, (_req, res) => {
  res.json({ authenticated: true });
});

// Everything below requires a valid admin session.
adminRouter.use(requireAdmin);

// ===========================================================================
// DASHBOARD STATS
// ===========================================================================
adminRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const tenantId = await getTenantId();

    const [[productCount], [activeCount], [orderAgg], recentOrders, statusRows] =
      await Promise.all([
        db.select({ n: sql<number>`count(*)::int` }).from(products).where(eq(products.tenantId, tenantId)),
        db
          .select({ n: sql<number>`count(*)::int` })
          .from(products)
          .where(and(eq(products.tenantId, tenantId), eq(products.status, "active"))),
        db
          .select({
            count: sql<number>`count(*)::int`,
            revenue: sql<string>`coalesce(sum(${orders.total}), 0)`,
          })
          .from(orders)
          .where(eq(orders.tenantId, tenantId)),
        db
          .select({
            orderNumber: orders.orderNumber,
            customerName: orders.customerName,
            total: orders.total,
            status: orders.status,
            createdAt: orders.createdAt,
          })
          .from(orders)
          .where(eq(orders.tenantId, tenantId))
          .orderBy(desc(orders.createdAt))
          .limit(8),
        db
          .select({ status: orders.status, n: sql<number>`count(*)::int` })
          .from(orders)
          .where(eq(orders.tenantId, tenantId))
          .groupBy(orders.status),
      ]);

    res.json({
      products: { total: productCount?.n ?? 0, active: activeCount?.n ?? 0 },
      orders: {
        total: orderAgg?.count ?? 0,
        revenue: Number(orderAgg?.revenue ?? 0),
        byStatus: Object.fromEntries(statusRows.map((r) => [r.status, r.n])),
      },
      recentOrders: recentOrders.map((o) => ({
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        total: Number(o.total),
        status: o.status,
        createdAt: o.createdAt,
      })),
    });
  }),
);

// ===========================================================================
// UPLOADS (image storage)
// ===========================================================================
adminRouter.get("/upload-config", (_req, res) => {
  res.json({ enabled: isUploadConfigured(), provider: activeProvider() });
});

// Larger JSON limit just for this route — base64 image payloads can be a few MB.
adminRouter.post(
  "/uploads",
  json({ limit: "12mb" }),
  asyncHandler(async (req, res) => {
    const dataUrl = (req.body ?? {}).dataUrl;
    if (typeof dataUrl !== "string") {
      res.status(400).json({ error: "validation", message: "dataUrl gerekli." });
      return;
    }
    try {
      const url = await uploadImage(dataUrl);
      res.status(201).json({ url });
    } catch (err) {
      if (err instanceof UploadError) {
        if (err.message === "not_configured") {
          res.status(501).json({
            error: "not_configured",
            message: "Dosya yükleme yapılandırılmamış. Görsel URL'si yapıştırabilirsiniz.",
          });
          return;
        }
        res.status(400).json({ error: "upload_failed", message: err.message });
        return;
      }
      throw err;
    }
  }),
);

// ===========================================================================
// PRODUCTS
// ===========================================================================
const PRODUCT_FIELDS = [
  "slug",
  "name",
  "description",
  "brandId",
  "categoryId",
  "supplierId",
  "supplierSku",
  "sourceUrl",
  "costPrice",
  "markupPercent",
  "currency",
  "fulfillmentType",
  "stockQty",
  "images",
  "status",
] as const;

function adminProductView(row: typeof products.$inferSelect) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    brandId: row.brandId,
    categoryId: row.categoryId,
    supplierId: row.supplierId,
    supplierSku: row.supplierSku,
    sourceUrl: row.sourceUrl,
    costPrice: Number(row.costPrice),
    markupPercent: row.markupPercent === null ? null : Number(row.markupPercent),
    finalPrice: Number(row.finalPrice),
    currency: row.currency,
    fulfillmentType: row.fulfillmentType,
    stockQty: row.stockQty,
    images: row.images as ProductImage[],
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

adminRouter.get(
  "/products",
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status : "";

    const conditions: SQL[] = [eq(products.tenantId, tenantId)];
    if (q) conditions.push(ilike(products.name, `%${q}%`));
    if (status === "draft" || status === "active" || status === "archived") {
      conditions.push(eq(products.status, status));
    }

    const rows = await db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(desc(products.updatedAt));

    res.json(rows.map(adminProductView));
  }),
);

adminRouter.get(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const [row] = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.id, req.params.id)))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(adminProductView(row));
  }),
);

adminRouter.post(
  "/products",
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const data = pick(req.body ?? {}, PRODUCT_FIELDS);

    const name = typeof data.name === "string" ? data.name.trim() : "";
    if (name.length < 2) {
      res.status(400).json({ error: "validation", fields: { name: "Ürün adı gerekli." } });
      return;
    }
    const slug =
      typeof data.slug === "string" && data.slug.trim() ? slugify(data.slug) : slugify(name);

    const costPrice = asNumericStr(data.costPrice) ?? "0";
    const markupPercent = asNumericStr(data.markupPercent);
    const categoryId = typeof data.categoryId === "string" && data.categoryId ? data.categoryId : null;
    const supplierId = typeof data.supplierId === "string" && data.supplierId ? data.supplierId : null;
    const brandId = typeof data.brandId === "string" && data.brandId ? data.brandId : null;

    const finalPrice = await resolveFinalPrice({
      tenantId,
      costPrice,
      markupPercent,
      categoryId,
      supplierId,
    });

    try {
      const [row] = await db
        .insert(products)
        .values({
          tenantId,
          slug,
          name,
          description: typeof data.description === "string" ? data.description : null,
          brandId,
          categoryId,
          supplierId,
          supplierSku: typeof data.supplierSku === "string" ? data.supplierSku : null,
          sourceUrl: typeof data.sourceUrl === "string" ? data.sourceUrl : null,
          costPrice,
          markupPercent,
          finalPrice,
          currency: typeof data.currency === "string" ? data.currency : "TRY",
          fulfillmentType: data.fulfillmentType === "dropship" ? "dropship" : "stock",
          stockQty: asInt(data.stockQty, 0),
          images: sanitizeImages(data.images),
          status:
            data.status === "active" || data.status === "archived" ? data.status : "draft",
        })
        .returning();
      res.status(201).json(adminProductView(row));
    } catch (err) {
      if (isUniqueViolation(err)) {
        res.status(409).json({ error: "duplicate_slug", message: `"${slug}" zaten kullanımda.` });
        return;
      }
      throw err;
    }
  }),
);

adminRouter.patch(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const [existing] = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.id, req.params.id)))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const data = pick(req.body ?? {}, PRODUCT_FIELDS);
    const update: Record<string, unknown> = { updatedAt: new Date() };

    if (typeof data.name === "string") update.name = data.name.trim();
    if (typeof data.slug === "string" && data.slug.trim()) update.slug = slugify(data.slug);
    if ("description" in data) update.description = typeof data.description === "string" ? data.description : null;
    if ("brandId" in data) update.brandId = typeof data.brandId === "string" && data.brandId ? data.brandId : null;
    if ("categoryId" in data) update.categoryId = typeof data.categoryId === "string" && data.categoryId ? data.categoryId : null;
    if ("supplierId" in data) update.supplierId = typeof data.supplierId === "string" && data.supplierId ? data.supplierId : null;
    if ("supplierSku" in data) update.supplierSku = typeof data.supplierSku === "string" ? data.supplierSku : null;
    if ("sourceUrl" in data) update.sourceUrl = typeof data.sourceUrl === "string" ? data.sourceUrl : null;
    if ("costPrice" in data) update.costPrice = asNumericStr(data.costPrice) ?? "0";
    if ("markupPercent" in data) update.markupPercent = asNumericStr(data.markupPercent);
    if (typeof data.currency === "string") update.currency = data.currency;
    if (data.fulfillmentType === "dropship" || data.fulfillmentType === "stock")
      update.fulfillmentType = data.fulfillmentType;
    if ("stockQty" in data) update.stockQty = asInt(data.stockQty, existing.stockQty);
    if ("images" in data) update.images = sanitizeImages(data.images);
    if (data.status === "active" || data.status === "archived" || data.status === "draft")
      update.status = data.status;

    // Recompute finalPrice when anything in the pricing chain changed.
    const pricingTouched =
      "costPrice" in update || "markupPercent" in update || "categoryId" in update || "supplierId" in update;
    if (pricingTouched) {
      update.finalPrice = await resolveFinalPrice({
        tenantId,
        costPrice: (update.costPrice as string | undefined) ?? existing.costPrice,
        markupPercent:
          "markupPercent" in update ? (update.markupPercent as string | null) : existing.markupPercent,
        categoryId: ("categoryId" in update ? update.categoryId : existing.categoryId) as string | null,
        supplierId: ("supplierId" in update ? update.supplierId : existing.supplierId) as string | null,
      });
    }

    try {
      const [row] = await db
        .update(products)
        .set(update)
        .where(and(eq(products.tenantId, tenantId), eq(products.id, req.params.id)))
        .returning();
      res.json(adminProductView(row));
    } catch (err) {
      if (isUniqueViolation(err)) {
        res.status(409).json({ error: "duplicate_slug" });
        return;
      }
      throw err;
    }
  }),
);

adminRouter.delete(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const deleted = await db
      .delete(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.id, req.params.id)))
      .returning({ id: products.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({ ok: true });
  }),
);

// ===========================================================================
// Generic taxonomy CRUD (categories / brands / suppliers)
// ===========================================================================

// ---- categories ----
adminRouter.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const tenantId = await getTenantId();
    const rows = await db
      .select()
      .from(categories)
      .where(eq(categories.tenantId, tenantId))
      .orderBy(asc(categories.sortOrder));
    res.json(
      rows.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        defaultMarkupPercent: Number(c.defaultMarkupPercent),
        sortOrder: c.sortOrder,
      })),
    );
  }),
);

adminRouter.post(
  "/categories",
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const data = pick(req.body ?? {}, ["name", "slug", "defaultMarkupPercent", "sortOrder"] as const);
    const name = typeof data.name === "string" ? data.name.trim() : "";
    if (name.length < 2) {
      res.status(400).json({ error: "validation", fields: { name: "Kategori adı gerekli." } });
      return;
    }
    try {
      const [row] = await db
        .insert(categories)
        .values({
          tenantId,
          name,
          slug: typeof data.slug === "string" && data.slug.trim() ? slugify(data.slug) : slugify(name),
          defaultMarkupPercent: asNumericStr(data.defaultMarkupPercent) ?? "0",
          sortOrder: asInt(data.sortOrder, 0),
        })
        .returning();
      res.status(201).json(row);
    } catch (err) {
      if (isUniqueViolation(err)) {
        res.status(409).json({ error: "duplicate_slug" });
        return;
      }
      throw err;
    }
  }),
);

adminRouter.patch(
  "/categories/:id",
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const data = pick(req.body ?? {}, ["name", "slug", "defaultMarkupPercent", "sortOrder"] as const);
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof data.name === "string") update.name = data.name.trim();
    if (typeof data.slug === "string" && data.slug.trim()) update.slug = slugify(data.slug);
    if ("defaultMarkupPercent" in data) update.defaultMarkupPercent = asNumericStr(data.defaultMarkupPercent) ?? "0";
    if ("sortOrder" in data) update.sortOrder = asInt(data.sortOrder, 0);
    const [row] = await db
      .update(categories)
      .set(update)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.id, req.params.id)))
      .returning();
    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(row);
  }),
);

adminRouter.delete(
  "/categories/:id",
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const deleted = await db
      .delete(categories)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.id, req.params.id)))
      .returning({ id: categories.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({ ok: true });
  }),
);

// ---- brands ----
adminRouter.get(
  "/brands",
  asyncHandler(async (_req, res) => {
    const tenantId = await getTenantId();
    const rows = await db
      .select()
      .from(brands)
      .where(eq(brands.tenantId, tenantId))
      .orderBy(asc(brands.name));
    res.json(rows.map((b) => ({ id: b.id, name: b.name, slug: b.slug, logoUrl: b.logoUrl })));
  }),
);

adminRouter.post(
  "/brands",
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const data = pick(req.body ?? {}, ["name", "slug", "logoUrl"] as const);
    const name = typeof data.name === "string" ? data.name.trim() : "";
    if (name.length < 1) {
      res.status(400).json({ error: "validation", fields: { name: "Marka adı gerekli." } });
      return;
    }
    try {
      const [row] = await db
        .insert(brands)
        .values({
          tenantId,
          name,
          slug: typeof data.slug === "string" && data.slug.trim() ? slugify(data.slug) : slugify(name),
          logoUrl: typeof data.logoUrl === "string" && data.logoUrl ? data.logoUrl : null,
        })
        .returning();
      res.status(201).json(row);
    } catch (err) {
      if (isUniqueViolation(err)) {
        res.status(409).json({ error: "duplicate_slug" });
        return;
      }
      throw err;
    }
  }),
);

adminRouter.patch(
  "/brands/:id",
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const data = pick(req.body ?? {}, ["name", "slug", "logoUrl"] as const);
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof data.name === "string") update.name = data.name.trim();
    if (typeof data.slug === "string" && data.slug.trim()) update.slug = slugify(data.slug);
    if ("logoUrl" in data) update.logoUrl = typeof data.logoUrl === "string" && data.logoUrl ? data.logoUrl : null;
    const [row] = await db
      .update(brands)
      .set(update)
      .where(and(eq(brands.tenantId, tenantId), eq(brands.id, req.params.id)))
      .returning();
    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(row);
  }),
);

adminRouter.delete(
  "/brands/:id",
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const deleted = await db
      .delete(brands)
      .where(and(eq(brands.tenantId, tenantId), eq(brands.id, req.params.id)))
      .returning({ id: brands.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({ ok: true });
  }),
);

// ---- suppliers (admin-only, never customer-visible) ----
adminRouter.get(
  "/suppliers",
  asyncHandler(async (_req, res) => {
    const tenantId = await getTenantId();
    const rows = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.tenantId, tenantId))
      .orderBy(asc(suppliers.name));
    res.json(
      rows.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        defaultMarkupPercent: s.defaultMarkupPercent === null ? null : Number(s.defaultMarkupPercent),
        syncMethod: s.syncMethod,
      })),
    );
  }),
);

adminRouter.post(
  "/suppliers",
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const data = pick(req.body ?? {}, ["name", "slug", "defaultMarkupPercent", "syncMethod"] as const);
    const name = typeof data.name === "string" ? data.name.trim() : "";
    if (name.length < 1) {
      res.status(400).json({ error: "validation", fields: { name: "Tedarikçi adı gerekli." } });
      return;
    }
    const syncMethod = ["manual", "csv", "api", "scrape"].includes(data.syncMethod as string)
      ? (data.syncMethod as "manual" | "csv" | "api" | "scrape")
      : "manual";
    try {
      const [row] = await db
        .insert(suppliers)
        .values({
          tenantId,
          name,
          slug: typeof data.slug === "string" && data.slug.trim() ? slugify(data.slug) : slugify(name),
          defaultMarkupPercent: asNumericStr(data.defaultMarkupPercent),
          syncMethod,
          isVisibleToCustomer: false,
        })
        .returning();
      res.status(201).json(row);
    } catch (err) {
      if (isUniqueViolation(err)) {
        res.status(409).json({ error: "duplicate_slug" });
        return;
      }
      throw err;
    }
  }),
);

adminRouter.patch(
  "/suppliers/:id",
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const data = pick(req.body ?? {}, ["name", "slug", "defaultMarkupPercent", "syncMethod"] as const);
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof data.name === "string") update.name = data.name.trim();
    if (typeof data.slug === "string" && data.slug.trim()) update.slug = slugify(data.slug);
    if ("defaultMarkupPercent" in data) update.defaultMarkupPercent = asNumericStr(data.defaultMarkupPercent);
    if (["manual", "csv", "api", "scrape"].includes(data.syncMethod as string))
      update.syncMethod = data.syncMethod;
    const [row] = await db
      .update(suppliers)
      .set(update)
      .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.id, req.params.id)))
      .returning();
    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(row);
  }),
);

adminRouter.delete(
  "/suppliers/:id",
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const deleted = await db
      .delete(suppliers)
      .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.id, req.params.id)))
      .returning({ id: suppliers.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({ ok: true });
  }),
);

// ===========================================================================
// SUPPLIER SYNC (CSV import)
// ===========================================================================
adminRouter.post(
  "/suppliers/:id/sync/csv",
  json({ limit: "8mb" }),
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const supplierId = req.params.id;

    // Supplier must belong to the active tenant.
    const [supplier] = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.id, supplierId)))
      .limit(1);
    if (!supplier) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const csv = typeof body.csv === "string" ? body.csv : "";
    if (csv.trim() === "") {
      res.status(400).json({ error: "validation", message: "CSV içeriği boş." });
      return;
    }

    const { rows } = parseCsv(csv);
    if (rows.length === 0) {
      res.status(400).json({ error: "validation", message: "CSV satırı bulunamadı." });
      return;
    }
    if (rows.length > 5000) {
      res.status(400).json({ error: "too_large", message: "En fazla 5000 satır." });
      return;
    }

    const defaultCategoryId =
      typeof body.defaultCategoryId === "string" && body.defaultCategoryId
        ? body.defaultCategoryId
        : null;

    const summary = await runCsvSync(tenantId, supplierId, rows, {
      createMissing: body.createMissing === true,
      defaultCategoryId,
      dryRun: body.dryRun === true,
    });

    // Bump supplier's lastSyncedAt-equivalent metadata via syncConfig timestamp.
    if (!summary.dryRun) {
      await db
        .update(suppliers)
        .set({ updatedAt: new Date() })
        .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.id, supplierId)));
    }

    res.json(summary);
  }),
);

// ===========================================================================
// ORDERS
// ===========================================================================
const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;

adminRouter.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const status = typeof req.query.status === "string" ? req.query.status : "";
    const conditions: SQL[] = [eq(orders.tenantId, tenantId)];
    if ((ORDER_STATUSES as readonly string[]).includes(status)) {
      conditions.push(eq(orders.status, status as (typeof ORDER_STATUSES)[number]));
    }
    const rows = await db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt));
    res.json(
      rows.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        city: o.city,
        district: o.district,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        total: Number(o.total),
        currency: o.currency,
        createdAt: o.createdAt,
      })),
    );
  }),
);

adminRouter.get(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const order = await db.query.orders.findFirst({
      where: and(eq(orders.tenantId, tenantId), eq(orders.id, req.params.id)),
      with: { items: true },
    });
    if (!order) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      city: order.city,
      district: order.district,
      addressLine: order.addressLine,
      note: order.note,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      paymentRef: order.paymentRef,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      total: Number(order.total),
      currency: order.currency,
      createdAt: order.createdAt,
      items: order.items.map((i) => ({
        productId: i.productId,
        name: i.productName,
        slug: i.productSlug,
        unitPrice: Number(i.unitPrice),
        quantity: i.quantity,
        lineTotal: Number(i.lineTotal),
      })),
    });
  }),
);

const PAYMENT_STATUSES = ["unpaid", "awaiting", "paid", "failed", "refunded"] as const;

adminRouter.patch(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const body = (req.body ?? {}) as Record<string, unknown>;

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if ("status" in body) {
      if (!(ORDER_STATUSES as readonly string[]).includes(body.status as string)) {
        res.status(400).json({ error: "validation", fields: { status: "Geçersiz durum." } });
        return;
      }
      update.status = body.status;
    }
    if ("paymentStatus" in body) {
      if (!(PAYMENT_STATUSES as readonly string[]).includes(body.paymentStatus as string)) {
        res.status(400).json({ error: "validation", fields: { paymentStatus: "Geçersiz ödeme durumu." } });
        return;
      }
      update.paymentStatus = body.paymentStatus;
    }
    if (Object.keys(update).length === 1) {
      res.status(400).json({ error: "validation", fields: { status: "Güncellenecek alan yok." } });
      return;
    }

    const [row] = await db
      .update(orders)
      .set(update)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.id, req.params.id)))
      .returning({ id: orders.id, status: orders.status, paymentStatus: orders.paymentStatus });
    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({ ok: true, status: row.status, paymentStatus: row.paymentStatus });
  }),
);
