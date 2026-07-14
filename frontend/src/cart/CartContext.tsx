import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getProduct, NotFoundError, type PublicProduct } from '../lib/api';

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image?: string;
  fulfillmentType: 'stock' | 'dropship';
  quantity: number;
};

export type CartRefreshResult = {
  /** En az bir ürünün fiyatı değişti. */
  priceChanged: boolean;
  /** Artık satışta olmadığı için sepetten çıkarılan ürün adları. */
  removedNames: string[];
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (product: PublicProduct, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** Sepetteki fiyat/isim/görselleri sunucudan tazeler; kaldırılanları bildirir. */
  refresh: () => Promise<CartRefreshResult>;
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
    return parsed
      .filter(
        (i): i is CartItem =>
          i &&
          typeof i.id === 'string' &&
          typeof i.slug === 'string' &&
          i.slug.length > 0 &&
          typeof i.name === 'string' &&
          typeof i.price === 'number' &&
          Number.isFinite(i.price) &&
          i.price >= 0 &&
          typeof i.quantity === 'number' &&
          (i.fulfillmentType === 'stock' || i.fulfillmentType === 'dropship'),
      )
      .map((i) => ({ ...i, quantity: clampQty(i.quantity) }));
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
  // refresh() async çalışır; güncel listeye state üzerinden değil ref'ten ulaşır.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }, [items]);

  const refresh = useCallback(async (): Promise<CartRefreshResult> => {
    const current = itemsRef.current;
    if (current.length === 0) return { priceChanged: false, removedNames: [] };

    const results = await Promise.all(
      current.map(async (item) => {
        try {
          const p = await getProduct(item.slug);
          return { item, product: p, removed: false };
        } catch (err) {
          // Ürün yayından kalkmış → sepetten çıkar. Ağ hatasında mevcut
          // veriyi koru (yanlışlıkla sepet boşaltma).
          return { item, product: null, removed: err instanceof NotFoundError };
        }
      }),
    );

    let priceChanged = false;
    const removedNames: string[] = [];
    const next: CartItem[] = [];
    for (const r of results) {
      if (r.removed) {
        removedNames.push(r.item.name);
        continue;
      }
      if (!r.product) {
        next.push(r.item);
        continue;
      }
      if (r.product.price !== r.item.price) priceChanged = true;
      const primary =
        r.product.images.find((img) => img.isPrimary) ?? r.product.images[0];
      next.push({
        ...r.item,
        name: r.product.name,
        price: r.product.price,
        image: primary?.url ?? r.item.image,
        fulfillmentType: r.product.fulfillmentType,
      });
    }
    setItems(next);
    return { priceChanged, removedNames };
  }, []);

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

    return { items, count, subtotal, add, setQuantity, remove, clear, refresh };
  }, [items, refresh]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
