// Customer-facing catalog endpoints. All product output goes through
// toPublicProduct() — raw DB rows are never serialized directly.
//
//   GET /api/categories        → active tenant's categories (sortOrder asc)
//   GET /api/products          → active tenant's active products (+filters)
//   GET /api/products/:slug    → single active product by slug
//
// Mounted in src/index.ts alongside /api/health.

import { Router, type Request, type Response, type NextFunction } from 'express';
import { and, asc, desc, eq, gt, gte, ilike, lte, ne, or, type SQL } from 'drizzle-orm';
import { db } from '../db/index.js';
import { brands, categories, products } from '../db/schema.js';
import { getTenantId } from '../lib/tenant.js';
import { toPublicProduct } from '../lib/publicProduct.js';

export const catalogRouter = Router();

// Small async wrapper so thrown errors reach the central error handler.
function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

/** Parse a query value into a finite, non-negative number or null. */
function toFiniteNumber(raw: unknown): number | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// ---------- GET /api/categories ----------
catalogRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const tenantId = await getTenantId();

    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        sortOrder: categories.sortOrder,
      })
      .from(categories)
      .where(eq(categories.tenantId, tenantId))
      .orderBy(asc(categories.sortOrder));

    // defaultMarkupPercent intentionally not selected — internal pricing field.
    res.json(rows);
  }),
);

// ---------- GET /api/brands ----------
catalogRouter.get(
  '/brands',
  asyncHandler(async (_req, res) => {
    const tenantId = await getTenantId();

    const rows = await db
      .select({
        id: brands.id,
        name: brands.name,
        slug: brands.slug,
        logoUrl: brands.logoUrl,
      })
      .from(brands)
      .where(eq(brands.tenantId, tenantId))
      .orderBy(asc(brands.name));

    res.json(rows);
  }),
);

// ---------- GET /api/products ----------
catalogRouter.get(
  '/products',
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();

    const categorySlug =
      typeof req.query.category === 'string' ? req.query.category : undefined;
    const brandSlug =
      typeof req.query.brand === 'string' ? req.query.brand : undefined;
    const inStockOnly = req.query.inStock === 'true';
    const search =
      typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const minPrice = toFiniteNumber(req.query.minPrice);
    const maxPrice = toFiniteNumber(req.query.maxPrice);
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'name';

    const conditions: SQL[] = [
      eq(products.tenantId, tenantId),
      eq(products.status, 'active'),
    ];

    if (search.length > 0) {
      conditions.push(ilike(products.name, `%${search}%`));
    }
    if (minPrice !== null) {
      conditions.push(gte(products.finalPrice, String(minPrice)));
    }
    if (maxPrice !== null) {
      conditions.push(lte(products.finalPrice, String(maxPrice)));
    }

    // Resolve optional category/brand slug filters to ids. An unknown slug
    // matches nothing → return an empty array.
    if (categorySlug !== undefined) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.tenantId, tenantId),
            eq(categories.slug, categorySlug),
          ),
        )
        .limit(1);
      if (!cat) {
        res.json([]);
        return;
      }
      conditions.push(eq(products.categoryId, cat.id));
    }

    if (brandSlug !== undefined) {
      const [br] = await db
        .select({ id: brands.id })
        .from(brands)
        .where(and(eq(brands.tenantId, tenantId), eq(brands.slug, brandSlug)))
        .limit(1);
      if (!br) {
        res.json([]);
        return;
      }
      conditions.push(eq(products.brandId, br.id));
    }

    // inStock=true → dropship items are always available, otherwise stockQty > 0.
    if (inStockOnly) {
      const stockCond = or(
        eq(products.fulfillmentType, 'dropship'),
        gt(products.stockQty, 0),
      );
      if (stockCond) conditions.push(stockCond);
    }

    const orderBy =
      sort === 'price_asc'
        ? [asc(products.finalPrice)]
        : sort === 'price_desc'
          ? [desc(products.finalPrice)]
          : sort === 'newest'
            ? [desc(products.createdAt)]
            : [asc(products.name)];

    const rows = await db.query.products.findMany({
      where: and(...conditions),
      with: {
        brand: { columns: { name: true, slug: true } },
        category: { columns: { name: true, slug: true } },
      },
      orderBy,
    });

    const payload = rows.map((row) =>
      toPublicProduct({
        product: row,
        brand: row.brand,
        category: row.category,
      }),
    );

    res.json(payload);
  }),
);

// ---------- GET /api/products/:slug ----------
catalogRouter.get(
  '/products/:slug',
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const { slug } = req.params;

    const row = await db.query.products.findFirst({
      where: and(
        eq(products.tenantId, tenantId),
        eq(products.status, 'active'),
        eq(products.slug, slug),
      ),
      with: {
        brand: { columns: { name: true, slug: true } },
        category: { columns: { name: true, slug: true } },
      },
    });

    if (!row) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    res.json(
      toPublicProduct({
        product: row,
        brand: row.brand,
        category: row.category,
      }),
    );
  }),
);

// ---------- GET /api/products/:slug/related ----------
// Cross-sell: other active products in the same category (newest first),
// falling back to newest overall when the product has no category or too few
// siblings. Never returns the product itself.
catalogRouter.get(
  '/products/:slug/related',
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const { slug } = req.params;
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 4, 1),
      12,
    );

    const base = await db.query.products.findFirst({
      where: and(
        eq(products.tenantId, tenantId),
        eq(products.status, 'active'),
        eq(products.slug, slug),
      ),
      columns: { id: true, categoryId: true },
    });
    if (!base) {
      res.json([]);
      return;
    }

    const withRels = {
      brand: { columns: { name: true, slug: true } },
      category: { columns: { name: true, slug: true } },
    } as const;

    const sameCategory = base.categoryId
      ? await db.query.products.findMany({
          where: and(
            eq(products.tenantId, tenantId),
            eq(products.status, 'active'),
            eq(products.categoryId, base.categoryId),
            ne(products.id, base.id),
          ),
          with: withRels,
          orderBy: [desc(products.createdAt)],
          limit,
        })
      : [];

    // Top up with newest overall if the category didn't yield enough.
    let rows = sameCategory;
    if (rows.length < limit) {
      const exclude = new Set([base.id, ...rows.map((r) => r.id)]);
      const fillers = await db.query.products.findMany({
        where: and(
          eq(products.tenantId, tenantId),
          eq(products.status, 'active'),
          ne(products.id, base.id),
        ),
        with: withRels,
        orderBy: [desc(products.createdAt)],
        limit: limit + exclude.size,
      });
      rows = rows.concat(
        fillers.filter((f) => !exclude.has(f.id)).slice(0, limit - rows.length),
      );
    }

    res.json(
      rows.map((row) =>
        toPublicProduct({ product: row, brand: row.brand, category: row.category }),
      ),
    );
  }),
);
