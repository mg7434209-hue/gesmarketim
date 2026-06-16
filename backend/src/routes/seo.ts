// SEO endpoints served at the site root (not under /api):
//
//   GET /sitemap.xml → static pages + every active category and product
//
// Mounted in src/index.ts before the SPA fallback so it is not swallowed by
// index.html. The storefront's robots.txt (frontend/public) points here.

import { Router, type Request, type Response, type NextFunction } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { categories, products } from "../db/schema.js";
import { getTenantId } from "../lib/tenant.js";
import { siteBaseUrl } from "../lib/siteUrl.js";

export const seoRouter = Router();

function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

const DEFAULT_BASE = "https://gesmarketim.com";

// Static, always-present storefront routes. Transactional pages (cart,
// checkout, order, admin) are intentionally excluded — see robots.txt.
const STATIC_ROUTES: { path: string; changefreq: string; priority: string }[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/urunler", changefreq: "daily", priority: "0.9" },
  { path: "/kategoriler", changefreq: "weekly", priority: "0.8" },
  { path: "/hakkimizda", changefreq: "monthly", priority: "0.5" },
  { path: "/iletisim", changefreq: "monthly", priority: "0.5" },
  { path: "/mesafeli-satis", changefreq: "yearly", priority: "0.3" },
  { path: "/on-bilgilendirme", changefreq: "yearly", priority: "0.3" },
  { path: "/kvkk", changefreq: "yearly", priority: "0.3" },
  { path: "/cerez-politikasi", changefreq: "yearly", priority: "0.3" },
];

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(
  base: string,
  loc: string,
  opts: { lastmod?: Date | null; changefreq?: string; priority?: string } = {},
): string {
  const parts = [`    <loc>${xmlEscape(base + loc)}</loc>`];
  if (opts.lastmod) parts.push(`    <lastmod>${opts.lastmod.toISOString().slice(0, 10)}</lastmod>`);
  if (opts.changefreq) parts.push(`    <changefreq>${opts.changefreq}</changefreq>`);
  if (opts.priority) parts.push(`    <priority>${opts.priority}</priority>`);
  return `  <url>\n${parts.join("\n")}\n  </url>`;
}

// ---------- GET /sitemap.xml ----------
seoRouter.get(
  "/sitemap.xml",
  asyncHandler(async (_req, res) => {
    const base = siteBaseUrl() || DEFAULT_BASE;
    const tenantId = await getTenantId();

    const [categoryRows, productRows] = await Promise.all([
      db
        .select({ slug: categories.slug, updatedAt: categories.updatedAt })
        .from(categories)
        .where(eq(categories.tenantId, tenantId))
        .orderBy(asc(categories.sortOrder)),
      db
        .select({ slug: products.slug, updatedAt: products.updatedAt })
        .from(products)
        .where(and(eq(products.tenantId, tenantId), eq(products.status, "active")))
        .orderBy(asc(products.name)),
    ]);

    const entries: string[] = [
      ...STATIC_ROUTES.map((r) =>
        urlEntry(base, r.path, { changefreq: r.changefreq, priority: r.priority }),
      ),
      ...categoryRows.map((c) =>
        urlEntry(base, `/kategori/${c.slug}`, {
          lastmod: c.updatedAt,
          changefreq: "weekly",
          priority: "0.7",
        }),
      ),
      ...productRows.map((p) =>
        urlEntry(base, `/urun/${p.slug}`, {
          lastmod: p.updatedAt,
          changefreq: "weekly",
          priority: "0.8",
        }),
      ),
    ];

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      entries.join("\n") +
      `\n</urlset>\n`;

    res.set("Content-Type", "application/xml; charset=utf-8");
    // Cache for an hour at the edge; catalog changes are not time-critical.
    res.set("Cache-Control", "public, max-age=3600");
    res.send(xml);
  }),
);
