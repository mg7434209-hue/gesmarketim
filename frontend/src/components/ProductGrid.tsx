import { Link } from 'react-router-dom';

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

const PRICE_FORMATTER = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 0,
});

export default function ProductGrid() {
  return (
    <section
      aria-label="Öne çıkan ürünler"
      className="border-b border-border bg-surface"
    >
      <div className="container-x py-16 sm:py-20">
        <div className="mb-8 flex items-end justify-between gap-4 md:mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
              Öne çıkan ürünler
            </h2>
            <p className="mt-2 text-sm text-text-secondary sm:text-base">
              En çok tercih edilen panel, inverter ve batarya modelleri.
            </p>
          </div>
          <Link
            to="/urunler"
            className="hidden shrink-0 text-sm font-semibold text-primary hover:text-accent-dark sm:inline-flex sm:items-center sm:gap-1"
          >
            Tümünü gör <span aria-hidden="true">→</span>
          </Link>
        </div>

        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {PRODUCTS.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>

        <div className="mt-8 text-center sm:hidden">
          <Link
            to="/urunler"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
          >
            Tüm ürünleri gör <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

type ProductCardProps = { product: Product };

function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border-2 border-border bg-white shadow-card transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent hover:shadow-lg">
      <Link
        to={`/urun/${product.id}`}
        className="block focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        aria-label={product.name}
      >
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-primary-light/10 via-surface to-accent/10">
          <div className="absolute inset-0 flex items-center justify-center text-primary/80 transition-transform duration-500 ease-out group-hover:scale-110">
            <ProductGlyph category={product.category} />
          </div>
          <div className="absolute left-3 top-3">
            <FulfillmentBadge fulfillment={product.fulfillment} />
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            {product.brand}
          </p>
          <h3 className="mt-1 line-clamp-2 min-h-[2.75rem] text-sm font-bold leading-snug text-primary sm:text-base">
            <Link
              to={`/urun/${product.id}`}
              className="hover:text-accent-dark focus:outline-none focus:underline"
            >
              {product.name}
            </Link>
          </h3>
        </div>

        <div className="mt-auto">
          <p className="text-2xl font-extrabold text-primary">
            ₺{PRICE_FORMATTER.format(product.price)}
            <span className="ml-1 text-xs font-medium text-text-secondary">KDV dahil</span>
          </p>

          <button
            type="button"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            aria-label={`${product.name} sepete ekle`}
          >
            <CartPlusIcon />
            Sepete Ekle
          </button>
        </div>
      </div>
    </article>
  );
}

type FulfillmentBadgeProps = { fulfillment: Fulfillment };

function FulfillmentBadge({ fulfillment }: FulfillmentBadgeProps) {
  const isStock = fulfillment === 'stock';
  const label = isStock ? 'Stokta' : 'Siparişe özel';
  const cls = isStock
    ? 'bg-success text-white'
    : 'bg-warning text-primary';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/80" aria-hidden="true" />
      {label}
    </span>
  );
}

type ProductGlyphProps = { category: ProductCategory };

function ProductGlyph({ category }: ProductGlyphProps) {
  const common = {
    viewBox: '0 0 64 64',
    width: '56%',
    height: '56%',
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
        <path d="M32 16 L24 32 H30 L28 44 L40 28 H32 L36 16 Z" fill="currentColor" stroke="none" />
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

function CartPlusIcon() {
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
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}
