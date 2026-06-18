import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getBrands,
  getCategories,
  getProducts,
  type ProductSort,
  type PublicBrand,
  type PublicCategory,
  type PublicProduct,
} from '../lib/api';
import {
  LoadError,
  ProductCard,
  ProductGridSkeleton,
  ProductsEmpty,
} from '../components/product-ui';
import { useSeo } from '../lib/seo';

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'name', label: 'Önerilen' },
  { value: 'price_asc', label: 'Fiyat: Artan' },
  { value: 'price_desc', label: 'Fiyat: Azalan' },
  { value: 'newest', label: 'En Yeni' },
];

type Status = 'loading' | 'ready' | 'error';

type Filters = {
  category: string;
  brand: string;
  inStock: boolean;
  q: string;
  minPrice: string;
  maxPrice: string;
  sort: ProductSort;
};

const EMPTY_FILTERS: Filters = {
  category: '',
  brand: '',
  inStock: false,
  q: '',
  minPrice: '',
  maxPrice: '',
  sort: 'name',
};

export default function Products() {
  useSeo({
    title: 'Tüm Ürünler — Güneş Paneli, İnverter, Batarya',
    description:
      'Güneş paneli, inverter, batarya, solar kablo ve aksesuarlar — KDV dahil net fiyatlarla. Markaya, fiyata ve stok durumuna göre filtrele.',
    path: '/urunler',
  });
  const [searchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [status, setStatus] = useState<Status>('loading');
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [brands, setBrands] = useState<PublicBrand[]>([]);
  // Seed the search filter from ?q= so header search / SearchAction land here.
  const [filters, setFilters] = useState<Filters>(() => ({
    ...EMPTY_FILTERS,
    q: searchParams.get('q') ?? '',
  }));
  const [reloadKey, setReloadKey] = useState(0);

  // Load taxonomy once.
  useEffect(() => {
    let active = true;
    Promise.all([getCategories(), getBrands()])
      .then(([cats, brs]) => {
        if (!active) return;
        setCategories(cats);
        setBrands(brs);
      })
      .catch(() => {
        /* taxonomy failure is non-fatal; product list still works */
      });
    return () => {
      active = false;
    };
  }, []);

  // Debounced load of products whenever filters change.
  const queryKey = useMemo(
    () =>
      JSON.stringify({
        category: filters.category,
        brand: filters.brand,
        inStock: filters.inStock,
        q: filters.q.trim(),
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        sort: filters.sort,
        reloadKey,
      }),
    [filters, reloadKey],
  );

  useEffect(() => {
    let active = true;
    setStatus('loading');
    const handle = window.setTimeout(() => {
      const minPrice = filters.minPrice === '' ? undefined : Number(filters.minPrice);
      const maxPrice = filters.maxPrice === '' ? undefined : Number(filters.maxPrice);
      getProducts({
        category: filters.category || undefined,
        brand: filters.brand || undefined,
        inStock: filters.inStock || undefined,
        q: filters.q.trim() || undefined,
        minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
        maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
        sort: filters.sort,
      })
        .then((data) => {
          if (!active) return;
          setProducts(data);
          setStatus('ready');
        })
        .catch(() => {
          if (active) setStatus('error');
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const hasActiveFilters =
    filters.category !== '' ||
    filters.brand !== '' ||
    filters.inStock ||
    filters.q !== '' ||
    filters.minPrice !== '' ||
    filters.maxPrice !== '';

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
            <li aria-hidden="true" className="text-text-secondary/60">›</li>
            <li aria-current="page" className="text-text-secondary">Tüm Ürünler</li>
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

        {/* Search bar */}
        <div className="mt-6">
          <label className="relative block max-w-xl">
            <span className="sr-only">Ürün ara</span>
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={filters.q}
              onChange={(e) => set('q', e.target.value)}
              placeholder="Ürün ara… (panel, inverter, batarya)"
              className="w-full rounded-xl border border-border bg-white py-3 pl-11 pr-4 text-sm text-primary shadow-sm placeholder:text-text-secondary/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>
        </div>

        <div className="mt-6 lg:hidden">
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

        <div className="mt-6 flex flex-col gap-8 lg:mt-8 lg:flex-row lg:gap-10">
          <aside
            aria-label="Filtreler"
            className={`${mobileFiltersOpen ? 'block' : 'hidden'} lg:block lg:w-64 lg:shrink-0`}
          >
            <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-primary">Filtreler</h2>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => setFilters(EMPTY_FILTERS)}
                    className="text-xs font-semibold text-accent-dark hover:underline"
                  >
                    Temizle
                  </button>
                )}
              </div>

              {/* Category */}
              <FilterSection title="Kategori">
                <RadioRow
                  name="category"
                  checked={filters.category === ''}
                  onChange={() => set('category', '')}
                  label="Tümü"
                />
                {categories.map((c) => (
                  <RadioRow
                    key={c.id}
                    name="category"
                    checked={filters.category === c.slug}
                    onChange={() => set('category', c.slug)}
                    label={c.name}
                  />
                ))}
              </FilterSection>

              {/* Brand */}
              {brands.length > 0 && (
                <FilterSection title="Marka">
                  <RadioRow
                    name="brand"
                    checked={filters.brand === ''}
                    onChange={() => set('brand', '')}
                    label="Tümü"
                  />
                  {brands.map((b) => (
                    <RadioRow
                      key={b.id}
                      name="brand"
                      checked={filters.brand === b.slug}
                      onChange={() => set('brand', b.slug)}
                      label={b.name}
                    />
                  ))}
                </FilterSection>
              )}

              {/* Stock */}
              <FilterSection title="Stok Durumu">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-primary">
                  <input
                    type="checkbox"
                    checked={filters.inStock}
                    onChange={(e) => set('inStock', e.target.checked)}
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                  />
                  Sadece mevcut ürünler
                </label>
              </FilterSection>

              {/* Price */}
              <fieldset className="mt-6">
                <legend className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Fiyat Aralığı (₺)
                </legend>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={filters.minPrice}
                    onChange={(e) => set('minPrice', e.target.value)}
                    placeholder="Min"
                    aria-label="Minimum fiyat"
                    className="w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-primary placeholder:text-text-secondary/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <span className="text-text-secondary">—</span>
                  <input
                    type="number"
                    min="0"
                    value={filters.maxPrice}
                    onChange={(e) => set('maxPrice', e.target.value)}
                    placeholder="Max"
                    aria-label="Maksimum fiyat"
                    className="w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-primary placeholder:text-text-secondary/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </fieldset>
            </div>
          </aside>

          <section aria-label="Ürünler" className="flex-1">
            <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-border bg-white p-4 shadow-card sm:flex-row sm:items-center">
              <p className="text-sm text-text-secondary">
                <span className="font-bold text-primary">
                  {status === 'ready' ? products.length : '—'}
                </span>{' '}
                ürün listeleniyor
              </p>
              <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                <span className="font-semibold text-primary">Sırala:</span>
                <select
                  value={filters.sort}
                  onChange={(e) => set('sort', e.target.value as ProductSort)}
                  aria-label="Sıralama"
                  className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6">
              {status === 'loading' && <ProductGridSkeleton count={6} />}
              {status === 'error' && <LoadError onRetry={() => setReloadKey((k) => k + 1)} />}
              {status === 'ready' && products.length === 0 && (
                <ProductsEmpty
                  title={
                    hasActiveFilters
                      ? 'Bu filtrelerle ürün bulunamadı'
                      : "Ürünler çok yakında — WhatsApp'tan sorabilirsiniz"
                  }
                />
              )}
              {status === 'ready' && products.length > 0 && (
                <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((product) => (
                    <li key={product.id}>
                      <ProductCard product={product} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="mt-6">
      <legend className="text-xs font-bold uppercase tracking-wider text-text-secondary">
        {title}
      </legend>
      <div className="mt-3 space-y-2">{children}</div>
    </fieldset>
  );
}

function RadioRow({
  name,
  checked,
  onChange,
  label,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-primary">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 border-border text-accent focus:ring-accent"
      />
      {label}
    </label>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}
