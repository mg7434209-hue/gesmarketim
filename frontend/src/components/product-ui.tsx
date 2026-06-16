import { useState } from 'react';
import { Link } from 'react-router-dom';
import { WHATSAPP_URL } from '../config';
import type { FulfillmentType, PublicProduct } from '../lib/api';
import { useCart } from '../cart/CartContext';

const PRICE_FORMATTER = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
});

export function formatPrice(price: number): string {
  return PRICE_FORMATTER.format(price);
}

/** Build a wa.me link with a prefilled message about a product. */
export function whatsappProductUrl(productName: string): string {
  const text = `Merhaba, "${productName}" ürünü hakkında bilgi almak istiyorum.`;
  return `${WHATSAPP_URL}?text=${encodeURIComponent(text)}`;
}

// ---------------------------------------------------------------------------
// Glyphs (fallback when a product has no image)
// ---------------------------------------------------------------------------

export type GlyphCategory = 'panel' | 'inverter' | 'battery';

/** Map an API category slug to one of the built-in SVG placeholder glyphs. */
export function glyphFor(slug?: string | null): GlyphCategory {
  switch (slug) {
    case 'inverter':
      return 'inverter';
    case 'batarya':
    case 'battery':
    case 'aku':
      return 'battery';
    default:
      return 'panel';
  }
}

type ProductGlyphProps = { category: GlyphCategory; size?: string };

export function ProductGlyph({ category, size = '54%' }: ProductGlyphProps) {
  const common = {
    viewBox: '0 0 64 64',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false as const,
  };

  if (category === 'inverter') {
    return (
      <svg {...common}>
        <rect x="10" y="8" width="44" height="48" rx="3" />
        <path
          d="M32 16 L24 32 H30 L28 44 L40 28 H32 L36 16 Z"
          fill="currentColor"
          stroke="none"
        />
        <line x1="20" y1="50" x2="24" y2="50" />
        <line x1="40" y1="50" x2="44" y2="50" />
      </svg>
    );
  }

  if (category === 'battery') {
    return (
      <svg {...common}>
        <rect x="6" y="18" width="48" height="28" rx="3" />
        <line x1="58" y1="26" x2="58" y2="38" />
        <line x1="14" y1="24" x2="14" y2="40" />
        <line x1="22" y1="24" x2="22" y2="40" />
        <line x1="30" y1="24" x2="30" y2="40" />
        <line x1="38" y1="24" x2="38" y2="40" />
        <line x1="46" y1="24" x2="46" y2="40" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="6" y="10" width="52" height="40" rx="2" />
      <line x1="20" y1="10" x2="20" y2="50" />
      <line x1="32" y1="10" x2="32" y2="50" />
      <line x1="44" y1="10" x2="44" y2="50" />
      <line x1="6" y1="23" x2="58" y2="23" />
      <line x1="6" y1="36" x2="58" y2="36" />
      <line x1="28" y1="56" x2="36" y2="56" />
      <line x1="32" y1="50" x2="32" y2="56" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Fulfillment badge
// ---------------------------------------------------------------------------

type FulfillmentBadgeProps = {
  fulfillment: FulfillmentType;
  withTimeframe?: boolean;
};

export function FulfillmentBadge({
  fulfillment,
  withTimeframe = false,
}: FulfillmentBadgeProps) {
  const isStock = fulfillment === 'stock';
  const base = isStock ? 'Stokta' : 'Siparişe özel';
  const timeframe = isStock ? '1-2 gün' : '5-7 gün';
  const label = withTimeframe ? `${base} · ${timeframe}` : base;
  const cls = isStock ? 'bg-success text-white' : 'bg-warning text-primary';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/80" aria-hidden="true" />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Add-to-cart button (with brief confirmation feedback)
// ---------------------------------------------------------------------------

type AddToCartButtonProps = {
  product: PublicProduct;
  quantity?: number;
  size?: 'sm' | 'lg';
  className?: string;
};

export function AddToCartButton({
  product,
  quantity = 1,
  size = 'sm',
  className = '',
}: AddToCartButtonProps) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  const padding = size === 'lg' ? 'px-6 py-3.5 text-base' : 'px-3 py-2 text-xs';

  return (
    <button
      type="button"
      onClick={() => {
        add(product, quantity);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1600);
      }}
      aria-label={`${product.name} sepete ekle`}
      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg font-bold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${padding} ${
        added
          ? 'bg-success text-white'
          : 'bg-accent text-primary hover:bg-accent-dark'
      } ${className}`}
    >
      {added ? (
        <>
          <CheckIcon /> Sepete eklendi
        </>
      ) : (
        <>
          <CartPlusIcon /> Sepete ekle
        </>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Product card (shared across home grid, listing and category pages)
// ---------------------------------------------------------------------------

export function primaryImage(product: PublicProduct) {
  return product.images.find((img) => img.isPrimary) ?? product.images[0];
}

type ProductCardProps = { product: PublicProduct };

export function ProductCard({ product }: ProductCardProps) {
  const image = primaryImage(product);
  const href = `/urun/${product.slug}`;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border-2 border-border bg-white shadow-card transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent hover:shadow-lg">
      <Link
        to={href}
        className="block focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        aria-label={product.name}
      >
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-primary-light/10 via-surface to-accent/10">
          {image ? (
            <img
              src={image.url}
              alt={image.alt || product.name}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-primary/80 transition-transform duration-500 ease-out group-hover:scale-110">
              <ProductGlyph category={glyphFor(product.category?.slug)} />
            </div>
          )}
          <div className="absolute left-2.5 top-2.5">
            <FulfillmentBadge fulfillment={product.fulfillmentType} />
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {product.brand && (
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
            {product.brand.name}
          </p>
        )}
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-primary">
          <Link
            to={href}
            className="hover:text-accent-dark focus:outline-none focus:underline"
          >
            {product.name}
          </Link>
        </h3>

        <div className="mt-auto pt-2">
          <p className="text-xl font-extrabold text-primary">
            {formatPrice(product.price)}
            <span className="ml-1 text-[10px] font-medium text-text-secondary">
              KDV dahil
            </span>
          </p>

          <div className="mt-2.5 flex flex-col gap-2">
            <AddToCartButton product={product} />
            <Link
              to={href}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-border px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:border-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            >
              İncele
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Loading / empty / error states
// ---------------------------------------------------------------------------

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border-2 border-border bg-white shadow-card">
      <div className="aspect-square animate-pulse bg-border/50" />
      <div className="flex flex-col gap-2.5 p-4">
        <div className="h-2.5 w-1/3 animate-pulse rounded bg-border/60" />
        <div className="h-3.5 w-full animate-pulse rounded bg-border/60" />
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-border/60" />
        <div className="mt-3 h-6 w-1/2 animate-pulse rounded bg-border/60" />
        <div className="mt-2 h-8 w-full animate-pulse rounded-lg bg-border/50" />
      </div>
    </div>
  );
}

type ProductGridSkeletonProps = { count?: number };

export function ProductGridSkeleton({ count = 8 }: ProductGridSkeletonProps) {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <ProductCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

type ProductsEmptyProps = { title: string };

export function ProductsEmpty({ title }: ProductsEmptyProps) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-white p-10 text-center shadow-card sm:p-14">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-primary">
        <BoxIcon />
      </div>
      <h3 className="mt-5 text-lg font-bold text-primary sm:text-xl">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
        Stoğumuzu hazırlıyoruz. Aradığın ürünü hemen WhatsApp'tan sorabilir, fiyat ve
        teslimat bilgisi alabilirsin.
      </p>
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
      >
        <WhatsAppIcon />
        WhatsApp'tan sor
      </a>
    </div>
  );
}

type LoadErrorProps = { onRetry?: () => void };

export function LoadError({ onRetry }: LoadErrorProps) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-danger/40 bg-white p-10 text-center shadow-card sm:p-14">
      <h3 className="text-lg font-bold text-primary sm:text-xl">
        İçerik şu an yüklenemedi
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
        Bağlantıda bir sorun oluştu. Lütfen birazdan tekrar deneyin.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg border-2 border-primary px-5 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        >
          Tekrar dene
        </button>
      )}
    </div>
  );
}

export function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M.06 24l1.68-6.13A11.86 11.86 0 0 1 .16 11.9C.16 5.34 5.5 0 12.06 0a11.82 11.82 0 0 1 8.41 3.49 11.82 11.82 0 0 1 3.48 8.42c0 6.56-5.34 11.9-11.9 11.9a11.9 11.9 0 0 1-5.69-1.45L.06 24zM6.6 20.13c1.68.99 3.28 1.59 5.45 1.59 5.45 0 9.89-4.43 9.89-9.88 0-5.45-4.44-9.89-9.89-9.89S2.17 6.49 2.17 11.94a9.8 9.8 0 0 0 1.51 5.26l-.99 3.61 3.91-1.02zm11.39-5.46c-.07-.12-.27-.2-.56-.34-.29-.15-1.73-.85-2-.95-.27-.1-.46-.15-.66.15-.2.29-.76.94-.93 1.14-.17.2-.34.22-.63.07-.29-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.73-1.63-2.02-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.51-.07-.15-.66-1.59-.9-2.18-.24-.57-.48-.49-.66-.5l-.56-.01c-.2 0-.51.07-.78.37-.27.29-1.02 1-1.02 2.44s1.05 2.83 1.2 3.02c.15.2 2.06 3.14 4.99 4.41.7.3 1.24.48 1.66.62.7.22 1.34.19 1.84.12.56-.08 1.73-.71 1.98-1.39.24-.69.24-1.27.17-1.39z" />
    </svg>
  );
}

export function CartPlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.5 3h2l2.2 11.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L22 7H6" />
      <line x1="14" y1="6" x2="14" y2="10" />
      <line x1="12" y1="8" x2="16" y2="8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <polyline points="3 8 12 13 21 8" />
      <line x1="12" y1="13" x2="12" y2="21" />
    </svg>
  );
}
