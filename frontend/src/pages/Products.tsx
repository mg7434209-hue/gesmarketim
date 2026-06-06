import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, type PublicProduct } from '../lib/api';
import { WHATSAPP_URL } from '../config';
import {
  LoadError,
  ProductCard,
  ProductGridSkeleton,
  ProductsEmpty,
} from '../components/product-ui';

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

const SORT_OPTIONS = ['Önerilen', 'Fiyat: Artan', 'Fiyat: Azalan', 'İsim: A-Z'];

type Status = 'loading' | 'ready' | 'error';

export default function Products() {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [status, setStatus] = useState<Status>('loading');
  const [products, setProducts] = useState<PublicProduct[]>([]);

  const load = useCallback(() => {
    let active = true;
    setStatus('loading');
    getProducts()
      .then((data) => {
        if (!active) return;
        setProducts(data);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => load(), [load]);

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
                <span className="font-bold text-primary">
                  {status === 'ready' ? products.length : '—'}
                </span>{' '}
                ürün listeleniyor
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

            <div className="mt-6">
              {status === 'loading' && <ProductGridSkeleton count={6} />}

              {status === 'error' && <LoadError onRetry={load} />}

              {status === 'ready' && products.length === 0 && (
                <ProductsEmpty title="Ürünler çok yakında — WhatsApp'tan sorabilirsiniz" />
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
