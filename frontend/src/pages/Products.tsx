import { useState } from 'react';
import { Link } from 'react-router-dom';
import { WHATSAPP_URL } from '../config';

type Fulfillment = 'stock' | 'order';
type ProductCategory = 'panel' | 'inverter' | 'battery';

type Product = {
  id: string;
  brand: string;
  name: string;
  price: number;
  fulfillment: Fulfillment;
  category: ProductCategory;
};

const PRODUCTS: Product[] = [
  { id: 'deye-5kw-inverter', brand: 'DEYE', name: 'DEYE 5kW Hibrit İnverter', price: 28500, fulfillment: 'stock', category: 'inverter' },
  { id: 'lexron-460w-panel', brand: 'LEXRON', name: 'LEXRON 460W Monokristal Güneş Paneli', price: 3250, fulfillment: 'stock', category: 'panel' },
  { id: 'eve-100ah-lifepo4', brand: 'EVE', name: 'EVE 100Ah LiFePO4 Lityum Batarya', price: 18750, fulfillment: 'order', category: 'battery' },
  { id: 'huawei-sun2000-6kw', brand: 'HUAWEI', name: 'HUAWEI SUN2000 6kW Trifaze İnverter', price: 34900, fulfillment: 'stock', category: 'inverter' },
  { id: 'deye-410w-mono', brand: 'DEYE', name: 'DEYE 410W Mono Half-Cut Panel', price: 2890, fulfillment: 'stock', category: 'panel' },
  { id: 'lexron-200ah-jel', brand: 'LEXRON', name: 'LEXRON 200Ah Jel Akü 12V', price: 6450, fulfillment: 'order', category: 'battery' },
  { id: 'eve-280ah-hucre', brand: 'EVE', name: 'EVE 280Ah LiFePO4 Hücre (Tekli)', price: 4200, fulfillment: 'order', category: 'battery' },
  { id: 'deye-hibrit-8kw', brand: 'DEYE', name: 'DEYE 8kW Hibrit Trifaze İnverter', price: 42000, fulfillment: 'stock', category: 'inverter' },
];

const CATEGORY_FILTERS = [
  'Güneş Paneli',
  'İnverter',
  'Batarya',
  'Solar Kablo',
  'Montaj Aparatı',
  'Aksesuar',
];

const STOCK_FILTERS = ['Stokta', 'Siparişe özel'];
const BRAND_FILTERS = ['DEYE', 'LEXRON', 'EVE', 'HUAWEI'];

const SORT_OPTIONS = [
  'Önerilen',
  'Fiyat: Artan',
  'Fiyat: Azalan',
  'İsim: A-Z',
];

const PRICE_FORMATTER = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

export default function Products() {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  return (
    <div className="bg-surface">
      <div className="container-x py-12">
        <nav aria-label="Breadcrumb" className="text-xs text-text-secondary sm:text-sm">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link to="/" className="font-medium text-primary hover:text-accent-dark">
                Anasayfa
              </Link>
            </li>
            <li aria-hidden="true" className="text-text-secondary/60">
              ›
            </li>
            <li aria-current="page" className="text-text-secondary">
              Tüm Ürünler
            </li>
          </ol>
        </nav>

        <header className="mt-6 max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
            Tüm Ürünler
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary sm:text-base">
            GES MARKETİM stok ve siparişe özel ürün listesi.
          </p>
        </header>

        <div className="mt-8 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((v) => !v)}
            className="inline-flex w-full items-center justify-between rounded-lg border border-border bg-white px-4 py-3 text-sm font-bold text-primary shadow-sm"
            aria-expanded={mobileFiltersOpen}
          >
            <span className="inline-flex items-center gap-2">
              <FilterIcon />
              Filtreler
            </span>
            <span aria-hidden="true" className="text-text-secondary">
              {mobileFiltersOpen ? '−' : '+'}
            </span>
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-8 lg:mt-10 lg:flex-row lg:gap-10">
          <aside
            aria-label="Filtreler"
            className={`${
              mobileFiltersOpen ? 'block' : 'hidden'
            } lg:block lg:w-64 lg:shrink-0`}
          >
            <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
              <h2 className="text-lg font-bold text-primary">Filtreler</h2>

              <FilterGroup title="Kategori" items={CATEGORY_FILTERS} />
              <FilterGroup title="Stok Durumu" items={STOCK_FILTERS} />
              <FilterGroup title="Marka" items={BRAND_FILTERS} />

              <fieldset className="mt-6" disabled>
                <legend className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Fiyat Aralığı
                </legend>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min ₺"
                    aria-label="Minimum fiyat"
                    className="w-full cursor-not-allowed rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-text-secondary placeholder:text-text-secondary/60"
                  />
                  <span className="text-text-secondary">—</span>
                  <input
                    type="number"
                    placeholder="Max ₺"
                    aria-label="Maksimum fiyat"
                    className="w-full cursor-not-allowed rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-text-secondary placeholder:text-text-secondary/60"
                  />
                </div>
              </fieldset>

              <div className="mt-6 rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-xs leading-relaxed text-primary">
                <p className="font-bold">Filtreler yakında aktif olacak.</p>
                <p className="mt-1 text-text-secondary">
                  Şu an{' '}
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-primary underline decoration-accent decoration-2 underline-offset-2 hover:text-accent-dark"
                  >
                    WhatsApp ile detay sorabilirsin →
                  </a>
                </p>
              </div>
            </div>
          </aside>

          <section aria-label="Ürünler" className="flex-1">
            <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-border bg-white p-4 shadow-card sm:flex-row sm:items-center">
              <p className="text-sm text-text-secondary">
                <span className="font-bold text-primary">{PRODUCTS.length}</span> ürün
                listeleniyor
              </p>
              <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                <span className="font-semibold text-primary">Sırala:</span>
                <select
                  disabled
                  aria-label="Sıralama"
                  className="cursor-not-allowed rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-secondary"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              </label>
            </div>

            <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {PRODUCTS.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>

            <p className="mt-10 text-center text-sm text-text-secondary">
              Daha fazla ürün yakında eklenecek.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

type FilterGroupProps = { title: string; items: string[] };

function FilterGroup({ title, items }: FilterGroupProps) {
  return (
    <fieldset className="mt-6" disabled>
      <legend className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
        {title}
        <SoonBadge />
      </legend>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item}>
            <label className="flex cursor-not-allowed items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                disabled
                className="h-4 w-4 cursor-not-allowed rounded border-border text-accent"
              />
              {item}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

function SoonBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning ring-1 ring-inset ring-warning/20">
      Yakında
    </span>
  );
}

type ProductCardProps = { product: Product };

function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border-2 border-border bg-white shadow-card transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent hover:shadow-lg">
      <Link
        to={`/urun/${product.id}`}
        className="block focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        aria-label={product.name}
      >
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-primary-light/10 via-surface to-accent/10">
          <div className="absolute inset-0 flex items-center justify-center text-primary/80 transition-transform duration-500 ease-out group-hover:scale-110">
            <ProductGlyph category={product.category} />
          </div>
          <div className="absolute left-2.5 top-2.5">
            <FulfillmentBadge fulfillment={product.fulfillment} />
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
          {product.brand}
        </p>
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-primary">
          <Link
            to={`/urun/${product.id}`}
            className="hover:text-accent-dark focus:outline-none focus:underline"
          >
            {product.name}
          </Link>
        </h3>

        <div className="mt-auto pt-2">
          <p className="text-xl font-extrabold text-primary">
            ₺{PRICE_FORMATTER.format(product.price)}
            <span className="ml-1 text-[10px] font-medium text-text-secondary">
              KDV dahil
            </span>
          </p>

          <Link
            to={`/urun/${product.id}`}
            className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-primary shadow-sm transition-colors hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            İncele
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

type FulfillmentBadgeProps = { fulfillment: Fulfillment };

function FulfillmentBadge({ fulfillment }: FulfillmentBadgeProps) {
  const isStock = fulfillment === 'stock';
  const label = isStock ? 'Stokta' : 'Siparişe özel';
  const cls = isStock ? 'bg-success text-white' : 'bg-warning text-primary';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ${cls}`}
    >
      <span className="h-1 w-1 rounded-full bg-white/80" aria-hidden="true" />
      {label}
    </span>
  );
}

type ProductGlyphProps = { category: ProductCategory };

function ProductGlyph({ category }: ProductGlyphProps) {
  const common = {
    viewBox: '0 0 64 64',
    width: '54%',
    height: '54%',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false as const,
  };

  if (category === 'panel') {
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

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}
