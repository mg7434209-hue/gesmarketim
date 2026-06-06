// Public product mapper — the ONLY place a product row becomes a customer-facing
// JSON object. Every customer-visible product response MUST pass through this.
//
// SECURITY: This function is an allowlist. It explicitly constructs the output
// object field-by-field and NEVER spreads the raw row. The following fields must
// never reach the customer and are intentionally absent here:
//   costPrice, markupPercent, supplierId, supplierSku, sourceUrl,
//   lastSyncedAt, syncStatus, and any other internal/sync metadata.
// Only the sale price (finalPrice) and safe presentation fields are exposed.

import type { Product, ProductImage } from '../db/schema.js';

// Minimal shapes of the joined relations the mapper needs. Kept narrow so a
// caller can't accidentally leak supplier/markup data through the relation.
export interface PublicBrandSource {
  name: string;
  slug: string;
}

export interface PublicCategorySource {
  name: string;
  slug: string;
}

export interface PublicProductInput {
  product: Product;
  brand?: PublicBrandSource | null;
  category?: PublicCategorySource | null;
}

export interface PublicProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  fulfillmentType: 'stock' | 'dropship';
  inStock: boolean;
  images: ProductImage[];
  brand: { name: string; slug: string } | null;
  category: { name: string; slug: string } | null;
}

export function toPublicProduct({
  product,
  brand,
  category,
}: PublicProductInput): PublicProduct {
  const images = Array.isArray(product.images)
    ? (product.images as ProductImage[])
    : [];

  const inStock =
    product.fulfillmentType === 'dropship' ? true : product.stockQty > 0;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    price: Number(product.finalPrice),
    currency: product.currency,
    fulfillmentType: product.fulfillmentType,
    inStock,
    images,
    brand: brand ? { name: brand.name, slug: brand.slug } : null,
    category: category ? { name: category.name, slug: category.slug } : null,
  };
}
