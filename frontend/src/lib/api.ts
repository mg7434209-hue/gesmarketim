const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
};

export type ProductImage = {
  url: string;
  alt?: string;
  isPrimary?: boolean;
};

export type FulfillmentType = 'stock' | 'dropship';

export type ProductRef = {
  name: string;
  slug: string;
};

export type PublicProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  currency: 'TRY';
  fulfillmentType: FulfillmentType;
  inStock: boolean;
  images: ProductImage[];
  brand: ProductRef | null;
  category: ProductRef | null;
};

/** Thrown by getProduct() when the API responds 404 { "error": "not_found" }. */
export class NotFoundError extends Error {
  constructor(message = 'not_found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`API ${res.status} — ${path}`);
  }
  return (await res.json()) as T;
}

export function getCategories(): Promise<PublicCategory[]> {
  return getJson<PublicCategory[]>('/api/categories');
}

export type ProductQuery = {
  category?: string;
  brand?: string;
  inStock?: boolean;
};

export function getProducts(params: ProductQuery = {}): Promise<PublicProduct[]> {
  const search = new URLSearchParams();
  if (params.category) search.set('category', params.category);
  if (params.brand) search.set('brand', params.brand);
  if (params.inStock) search.set('inStock', 'true');

  const qs = search.toString();
  return getJson<PublicProduct[]>(`/api/products${qs ? `?${qs}` : ''}`);
}

export async function getProduct(slug: string): Promise<PublicProduct> {
  const res = await fetch(
    `${API_URL}/api/products/${encodeURIComponent(slug)}`,
    { headers: { Accept: 'application/json' } },
  );
  if (res.status === 404) {
    throw new NotFoundError();
  }
  if (!res.ok) {
    throw new Error(`API ${res.status} — /api/products/${slug}`);
  }
  return (await res.json()) as PublicProduct;
}
