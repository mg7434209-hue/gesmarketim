import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCategories, type PublicCategory } from '../lib/api';

// Marketing copy per category (not part of the product API).
const DESCRIPTIONS: Record<string, string> = {
  'gunes-paneli':
    'Mono/Polikristal, half-cut, full-black paneller. 410W-460W güç aralığında.',
  inverter: 'Hibrit, on-grid, off-grid inverterler. 3kW-15kW kapasiteler.',
  batarya: 'LiFePO4, Jel akü, Hücre batarya seçenekleri. 100Ah-280Ah.',
  'solar-kablo':
    'TÜV onaylı kırmızı/siyah solar DC kabloları. 4mm² ve 6mm² seçenekleri.',
  'montaj-aparati':
    'Çatı, zemin, tribün montaj kitleri. Galvaniz çelik ve alüminyum.',
  aksesuar: 'MC4 konnektör, sigorta, by-pass diyot, monitoring üniteleri.',
};

const DEFAULT_DESCRIPTION =
  'Bu kategorideki ürünleri keşfet — KDV dahil net fiyatlarla.';

type Status = 'loading' | 'ready' | 'error';

export default function Categories() {
  const [status, setStatus] = useState<Status>('loading');
  const [categories, setCategories] = useState<PublicCategory[]>([]);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    getCategories()
      .then((data) => {
        if (!active) return;
        setCategories([...data].sort((a, b) => a.sortOrder - b.sortOrder));
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, []);

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
              Kategoriler
            </li>
          </ol>
        </nav>

        <header className="mt-6 max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
            Tüm Kategoriler
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary sm:text-base">
            Solar sistemin her parçası için ihtiyacın olan kategoriyi seç.
          </p>
        </header>

        {status === 'loading' && <CategoriesSkeleton />}

        {status === 'error' && (
          <p className="mt-10 rounded-2xl border-2 border-dashed border-danger/40 bg-white p-8 text-center text-sm font-semibold text-text-secondary">
            Kategoriler şu an yüklenemedi. Lütfen birazdan tekrar deneyin.
          </p>
        )}

        {status === 'ready' && (
          <ul className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            {categories.map((category) => (
              <li key={category.id}>
                <CategoryCard category={category} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CategoriesSkeleton() {
  return (
    <ul className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i}>
          <div className="flex h-full flex-col gap-5 rounded-2xl border-2 border-border bg-white p-6 shadow-card sm:p-7">
            <div className="flex items-start gap-5">
              <div className="h-16 w-16 shrink-0 animate-pulse rounded-xl bg-border/60" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-1/2 animate-pulse rounded bg-border/60" />
              </div>
            </div>
            <div className="h-4 w-full animate-pulse rounded bg-border/50" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-border/50" />
          </div>
        </li>
      ))}
    </ul>
  );
}

type CategoryCardProps = { category: PublicCategory };

function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      to={`/kategori/${category.slug}`}
      className="group flex h-full flex-col gap-5 rounded-2xl border-2 border-border bg-white p-6 shadow-card transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent hover:shadow-lg sm:p-7"
      aria-label={`${category.name} kategorisini gör`}
    >
      <div className="flex items-start gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-accent text-primary shadow-sm transition-transform duration-300 group-hover:scale-105">
          <CategoryIcon slug={category.slug} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-primary group-hover:text-accent-dark">
            {category.name}
          </h2>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-text-secondary sm:text-base">
        {DESCRIPTIONS[category.slug] ?? DEFAULT_DESCRIPTION}
      </p>

      <div className="mt-auto inline-flex items-center gap-1.5 text-sm font-bold text-primary group-hover:text-accent-dark">
        Kategoriyi gör
        <span
          aria-hidden="true"
          className="transition-transform duration-300 group-hover:translate-x-1"
        >
          →
        </span>
      </div>
    </Link>
  );
}

type CategoryIconProps = { slug: string };

function CategoryIcon({ slug }: CategoryIconProps) {
  const props = {
    viewBox: '0 0 32 32',
    width: '32',
    height: '32',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false as const,
  };

  switch (slug) {
    case 'gunes-paneli':
      return (
        <svg {...props}>
          <rect x="4" y="6" width="24" height="18" rx="1" />
          <line x1="12" y1="6" x2="12" y2="24" />
          <line x1="20" y1="6" x2="20" y2="24" />
          <line x1="4" y1="12" x2="28" y2="12" />
          <line x1="4" y1="18" x2="28" y2="18" />
          <line x1="14" y1="28" x2="18" y2="28" />
          <line x1="16" y1="24" x2="16" y2="28" />
        </svg>
      );
    case 'inverter':
      return (
        <svg {...props}>
          <rect x="6" y="4" width="20" height="24" rx="2" />
          <path
            d="M16 8 L12 16 H15 L14 22 L20 14 H16 L18 8 Z"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      );
    case 'batarya':
      return (
        <svg {...props}>
          <rect x="4" y="10" width="22" height="14" rx="2" />
          <line x1="28" y1="14" x2="28" y2="20" />
          <line x1="9" y1="14" x2="9" y2="20" />
          <line x1="14" y1="14" x2="14" y2="20" />
          <line x1="19" y1="14" x2="19" y2="20" />
        </svg>
      );
    case 'solar-kablo':
      return (
        <svg {...props}>
          <path d="M4 8 C 10 8, 10 24, 16 24 S 22 8, 28 8" />
          <circle cx="4" cy="8" r="2" fill="currentColor" stroke="none" />
          <circle cx="28" cy="8" r="2" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'montaj-aparati':
      return (
        <svg {...props}>
          <path d="M6 26 L16 6 L26 26" />
          <line x1="10" y1="26" x2="22" y2="26" />
          <line x1="12" y1="20" x2="20" y2="20" />
          <line x1="14" y1="14" x2="18" y2="14" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="16" cy="16" r="3" />
          <path d="M16 4 v4 M16 24 v4 M4 16 h4 M24 16 h4 M7.5 7.5 l2.8 2.8 M21.7 21.7 l2.8 2.8 M7.5 24.5 l2.8 -2.8 M21.7 10.3 l2.8 -2.8" />
        </svg>
      );
  }
}
