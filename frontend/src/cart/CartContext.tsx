import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { PublicProduct } from '../lib/api';

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image?: string;
  fulfillmentType: 'stock' | 'dropship';
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (product: PublicProduct, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const STORAGE_KEY = 'gm_cart_v1';
const MAX_QTY = 99;

const CartContext = createContext<CartContextValue | null>(null);

function loadInitial(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is CartItem =>
        i &&
        typeof i.id === 'string' &&
        typeof i.name === 'string' &&
        typeof i.price === 'number' &&
        typeof i.quantity === 'number',
    );
  } catch {
    return [];
  }
}

function clampQty(q: number): number {
  if (!Number.isFinite(q)) return 1;
  return Math.min(MAX_QTY, Math.max(1, Math.floor(q)));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadInitial);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const add: CartContextValue['add'] = (product, quantity = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.id === product.id);
        if (existing) {
          return prev.map((i) =>
            i.id === product.id
              ? { ...i, quantity: clampQty(i.quantity + quantity) }
              : i,
          );
        }
        const primary =
          product.images.find((img) => img.isPrimary) ?? product.images[0];
        return [
          ...prev,
          {
            id: product.id,
            slug: product.slug,
            name: product.name,
            price: product.price,
            image: primary?.url,
            fulfillmentType: product.fulfillmentType,
            quantity: clampQty(quantity),
          },
        ];
      });
    };

    const setQuantity: CartContextValue['setQuantity'] = (id, quantity) => {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity: clampQty(quantity) } : i)),
      );
    };

    const remove: CartContextValue['remove'] = (id) =>
      setItems((prev) => prev.filter((i) => i.id !== id));

    const clear: CartContextValue['clear'] = () => setItems([]);

    const count = items.reduce((n, i) => n + i.quantity, 0);
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

    return { items, count, subtotal, add, setQuantity, remove, clear };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
