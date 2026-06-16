// Admin API client. All requests send the session cookie (credentials:'include').
// A 401 throws AdminAuthError so the shell can bounce back to the login screen.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const BASE = `${API_URL}/api/admin`;

export class AdminAuthError extends Error {
  constructor() {
    super('unauthorized');
    this.name = 'AdminAuthError';
  }
}

export class AdminApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.fields = fields;
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) throw new AdminAuthError();

  if (!res.ok) {
    let payload: { error?: string; message?: string; fields?: Record<string, string> } = {};
    try {
      payload = await res.json();
    } catch {
      /* ignore */
    }
    throw new AdminApiError(
      payload.message ?? payload.error ?? `Hata (${res.status})`,
      res.status,
      payload.fields,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---- auth ----
export const adminAuth = {
  login: (username: string, password: string) =>
    request<{ ok: true }>('/login', { method: 'POST', body: { username, password } }),
  logout: () => request<{ ok: true }>('/logout', { method: 'POST' }),
  me: () => request<{ authenticated: boolean }>('/me'),
};

// ---- types ----
export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  brandId: string | null;
  categoryId: string | null;
  supplierId: string | null;
  supplierSku: string | null;
  sourceUrl: string | null;
  costPrice: number;
  markupPercent: number | null;
  finalPrice: number;
  currency: string;
  fulfillmentType: 'stock' | 'dropship';
  stockQty: number;
  images: { url: string; alt?: string; isPrimary?: boolean }[];
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
};

export type ProductInput = {
  name: string;
  slug?: string;
  description?: string | null;
  brandId?: string | null;
  categoryId?: string | null;
  supplierId?: string | null;
  supplierSku?: string | null;
  costPrice?: number;
  markupPercent?: number | null;
  fulfillmentType?: 'stock' | 'dropship';
  stockQty?: number;
  images?: { url: string; alt?: string; isPrimary?: boolean }[];
  status?: 'draft' | 'active' | 'archived';
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  defaultMarkupPercent: number;
  sortOrder: number;
};

export type AdminBrand = { id: string; name: string; slug: string; logoUrl: string | null };

export type AdminSupplier = {
  id: string;
  name: string;
  slug: string;
  defaultMarkupPercent: number | null;
  syncMethod: string;
};

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentMethod = 'bank_transfer' | 'cash_on_delivery' | 'card';
export type PaymentStatus = 'unpaid' | 'awaiting' | 'paid' | 'failed' | 'refunded';

export type AdminOrderListItem = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  city: string;
  district: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  total: number;
  currency: string;
  createdAt: string;
};

export type AdminOrderDetail = AdminOrderListItem & {
  customerEmail: string | null;
  addressLine: string;
  note: string | null;
  paymentRef: string | null;
  subtotal: number;
  shippingCost: number;
  items: {
    productId: string | null;
    name: string;
    slug: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[];
};

export type AdminStats = {
  products: { total: number; active: number };
  orders: {
    total: number;
    revenue: number;
    byStatus: Partial<Record<OrderStatus, number>>;
  };
  recentOrders: {
    orderNumber: string;
    customerName: string;
    total: number;
    status: OrderStatus;
    createdAt: string;
  }[];
};

// ---- endpoints ----
export const adminApi = {
  stats: () => request<AdminStats>('/stats'),

  products: {
    list: (params: { q?: string; status?: string } = {}) => {
      const s = new URLSearchParams();
      if (params.q) s.set('q', params.q);
      if (params.status) s.set('status', params.status);
      const qs = s.toString();
      return request<AdminProduct[]>(`/products${qs ? `?${qs}` : ''}`);
    },
    create: (body: ProductInput) =>
      request<AdminProduct>('/products', { method: 'POST', body }),
    update: (id: string, body: Partial<ProductInput>) =>
      request<AdminProduct>(`/products/${id}`, { method: 'PATCH', body }),
    remove: (id: string) => request<{ ok: true }>(`/products/${id}`, { method: 'DELETE' }),
  },

  categories: {
    list: () => request<AdminCategory[]>('/categories'),
    create: (body: Partial<AdminCategory>) =>
      request<AdminCategory>('/categories', { method: 'POST', body }),
    update: (id: string, body: Partial<AdminCategory>) =>
      request<AdminCategory>(`/categories/${id}`, { method: 'PATCH', body }),
    remove: (id: string) => request<{ ok: true }>(`/categories/${id}`, { method: 'DELETE' }),
  },

  brands: {
    list: () => request<AdminBrand[]>('/brands'),
    create: (body: Partial<AdminBrand>) =>
      request<AdminBrand>('/brands', { method: 'POST', body }),
    update: (id: string, body: Partial<AdminBrand>) =>
      request<AdminBrand>(`/brands/${id}`, { method: 'PATCH', body }),
    remove: (id: string) => request<{ ok: true }>(`/brands/${id}`, { method: 'DELETE' }),
  },

  suppliers: {
    list: () => request<AdminSupplier[]>('/suppliers'),
    create: (body: Partial<AdminSupplier>) =>
      request<AdminSupplier>('/suppliers', { method: 'POST', body }),
    update: (id: string, body: Partial<AdminSupplier>) =>
      request<AdminSupplier>(`/suppliers/${id}`, { method: 'PATCH', body }),
    remove: (id: string) => request<{ ok: true }>(`/suppliers/${id}`, { method: 'DELETE' }),
  },

  orders: {
    list: (status?: string) => {
      const qs = status ? `?status=${encodeURIComponent(status)}` : '';
      return request<AdminOrderListItem[]>(`/orders${qs}`);
    },
    get: (id: string) => request<AdminOrderDetail>(`/orders/${id}`),
    setStatus: (id: string, status: OrderStatus) =>
      request<{ ok: true; status: OrderStatus }>(`/orders/${id}`, {
        method: 'PATCH',
        body: { status },
      }),
    setPaymentStatus: (id: string, paymentStatus: PaymentStatus) =>
      request<{ ok: true; paymentStatus: PaymentStatus }>(`/orders/${id}`, {
        method: 'PATCH',
        body: { paymentStatus },
      }),
  },
};
