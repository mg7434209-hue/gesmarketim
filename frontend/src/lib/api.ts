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

export type PublicBrand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
};

export function getBrands(): Promise<PublicBrand[]> {
  return getJson<PublicBrand[]>('/api/brands');
}

export type ProductSort = 'name' | 'price_asc' | 'price_desc' | 'newest';

export type ProductQuery = {
  category?: string;
  brand?: string;
  inStock?: boolean;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
};

export function getProducts(params: ProductQuery = {}): Promise<PublicProduct[]> {
  const search = new URLSearchParams();
  if (params.category) search.set('category', params.category);
  if (params.brand) search.set('brand', params.brand);
  if (params.inStock) search.set('inStock', 'true');
  if (params.q) search.set('q', params.q);
  if (params.minPrice != null) search.set('minPrice', String(params.minPrice));
  if (params.maxPrice != null) search.set('maxPrice', String(params.maxPrice));
  if (params.sort && params.sort !== 'name') search.set('sort', params.sort);

  const qs = search.toString();
  return getJson<PublicProduct[]>(`/api/products${qs ? `?${qs}` : ''}`);
}

// ---------------------------------------------------------------------------
// Orders (checkout)
// ---------------------------------------------------------------------------

export type CheckoutItem = { productId: string; quantity: number };

export type PaymentMethod = 'bank_transfer' | 'cash_on_delivery' | 'card';
export type PaymentStatus = 'unpaid' | 'awaiting' | 'paid' | 'failed' | 'refunded';

export type BankTransferDetails = {
  bankName: string;
  accountHolder: string;
  iban: string;
};

export type PaymentMethodsInfo = {
  methods: PaymentMethod[];
  bankTransfer: BankTransferDetails | null;
  card: { enabled: boolean; provider: string };
};

export function getPaymentMethods(): Promise<PaymentMethodsInfo> {
  return getJson<PaymentMethodsInfo>('/api/payment/methods');
}

export type CheckoutPayload = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  city: string;
  district: string;
  addressLine: string;
  note?: string;
  paymentMethod: PaymentMethod;
  items: CheckoutItem[];
};

export type OrderLine = {
  name: string;
  slug: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type OrderResult = {
  orderNumber: string;
  status: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotal: number;
  shippingCost: number;
  total: number;
  currency: string;
  items: OrderLine[];
  payment?: {
    provider: string;
    paymentPageUrl?: string;
    error?: string;
  };
};

export type OrderDetail = OrderResult & {
  customerName: string;
  city: string;
  district: string;
  createdAt: string;
  bankTransfer: BankTransferDetails | null;
};

/** Thrown when checkout fails validation or an item became unavailable. */
export class CheckoutError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.name = 'CheckoutError';
    this.status = status;
    this.fields = fields;
  }
}

export async function createOrder(payload: CheckoutPayload): Promise<OrderResult> {
  const res = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let body: { message?: string; fields?: Record<string, string> } = {};
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    throw new CheckoutError(
      body.message ?? 'Sipariş oluşturulamadı.',
      res.status,
      body.fields,
    );
  }
  return (await res.json()) as OrderResult;
}

export async function getOrder(orderNumber: string): Promise<OrderDetail> {
  const res = await fetch(
    `${API_URL}/api/orders/${encodeURIComponent(orderNumber)}`,
    { headers: { Accept: 'application/json' } },
  );
  if (res.status === 404) throw new NotFoundError();
  if (!res.ok) throw new Error(`API ${res.status}`);
  return (await res.json()) as OrderDetail;
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
