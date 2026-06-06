// Customer-facing catalog endpoints. All product output goes through
// toPublicProduct() — raw DB rows are never serialized directly.
//
//   GET /api/categories        → active tenant's categories (sortOrder asc)
//   GET /api/products          → active tenant's active products (+filters)
//   GET /api/products/:slug    → single active product by slug
//
// Mounted in src/index.ts alongside /api/health.

import { Router, type Request, type Response, type NextFunction } from 'express';
import { and, asc, eq, gt, or } from 'drizzle-orm';
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

    const conditions = [
      eq(products.tenantId, tenantId),
      eq(products.status, 'active'),
    ];

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

    const rows = await db.query.products.findMany({
      where: and(...conditions),
      with: {
        brand: { columns: { name: true, slug: true } },
        category: { columns: { name: true, slug: true } },
      },
      orderBy: (p, { asc: ascFn }) => [ascFn(p.name)],
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
