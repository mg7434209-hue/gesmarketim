// Resolve a product's snapshot finalPrice from its cost + the markup chain
// (product → supplier → category → fallback). Shared by admin writes and the
// supplier sync engine so pricing stays consistent everywhere.

import { and, eq } from "drizzle-orm";
import { db } from "./index.js";
import { suppliers, categories } from "./schema.js";
import { computeFinalPrice } from "./pricing.js";

export async function resolveFinalPrice(args: {
  tenantId: string;
  costPrice: string | null;
  markupPercent: string | null;
  categoryId: string | null;
  supplierId: string | null;
}): Promise<string> {
  let supplierMarkup: string | null = null;
  let categoryMarkup: string | null = null;

  if (args.supplierId) {
    const [s] = await db
      .select({ m: suppliers.defaultMarkupPercent })
      .from(suppliers)
      .where(and(eq(suppliers.tenantId, args.tenantId), eq(suppliers.id, args.supplierId)))
      .limit(1);
    supplierMarkup = s?.m ?? null;
  }
  if (args.categoryId) {
    const [c] = await db
      .select({ m: categories.defaultMarkupPercent })
      .from(categories)
      .where(and(eq(categories.tenantId, args.tenantId), eq(categories.id, args.categoryId)))
      .limit(1);
    categoryMarkup = c?.m ?? null;
  }

  const { finalPrice } = computeFinalPrice({
    costPrice: args.costPrice,
    productMarkupPct: args.markupPercent,
    supplierMarkupPct: supplierMarkup,
    categoryMarkupPct: categoryMarkup,
  });
  return finalPrice.toFixed(2);
}
