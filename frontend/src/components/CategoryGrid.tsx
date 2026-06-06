import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCategories, type PublicCategory } from '../lib/api';

type Status = 'loading' | 'ready' | 'error';

export default function CategoryGrid() {
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
    <section aria-label="Kategoriler" className="border-b border-border bg-white">
      <div className="container-x py-12 md:py-16">
        <div className="mb-8 flex items-end justify-between gap-4 md:mb-10">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl">
              Kategoriler
            </h2>
            <p className="mt-2 text-sm text-text-secondary sm:text-base">
              Solar sisteminin her parçası için doğru ürünü bul.
            </p>
          </div>
          <Link
            to="/kategoriler"
            className="hidden shrink-0 text-sm font-semibold text-primary hover:text-accent-dark sm:inline-flex sm:items-center sm:gap-1"
          >
            Tümünü gör <span aria-hidden="true">→</span>
          </Link>
        </div>

        {status === 'loading' && <CategoryGridSkeleton />}

        {status === 'error' && (
          <p className="rounded-2xl border-2 border-dashed border-danger/40 bg-white p-8 text-center text-sm font-semibold text-text-secondary">
            Kategoriler şu an yüklenemedi. Lütfen birazdan tekrar deneyin.
          </p>
        )}

        {status === 'ready' && (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  to={`/kategori/${category.slug}`}
                  className="group flex h-full items-center gap-4 rounded-2xl border-2 border-border bg-white p-5 shadow-card transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 sm:p-6"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent text-primary shadow-sm transition-transform duration-300 ease-out group-hover:scale-110 sm:h-16 sm:w-16">
                    <CategoryIcon slug={category.slug} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold text-primary sm:text-lg">
                      {category.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-text-secondary sm:text-sm">
                      Ürünleri keşfet
                    </p>
                  </div>
                  <span
                    className="hidden text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:inline-block"
                    aria-hidden="true"
                  >
                    <ArrowRightIcon />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function CategoryGridSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i}>
          <div className="flex h-full items-center gap-4 rounded-2xl border-2 border-border bg-white p-5 shadow-card sm:p-6">
            <div className="h-14 w-14 shrink-0 animate-pulse rounded-xl bg-border/60 sm:h-16 sm:w-16" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-border/60" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-border/50" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Icons mapped by category slug (falls back to a generic icon)
// ---------------------------------------------------------------------------

type IconProps = { slug: string };

function CategoryIcon({ slug }: IconProps) {
  switch (slug) {
    case 'gunes-paneli':
      return <SolarPanelIcon />;
    case 'inverter':
      return <InverterIcon />;
    case 'batarya':
      return <BatteryIcon />;
    case 'solar-kablo':
      return <CableIcon />;
    case 'montaj-aparati':
      return <WrenchIcon />;
    default:
      return <AccessoryIcon />;
  }
}

function SolarPanelIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="4" width="18" height="14" rx="1.5" />
      <line x1="9" y1="4" x2="9" y2="18" />
      <line x1="15" y1="4" x2="15" y2="18" />
      <line x1="3" y1="11" x2="21" y2="11" />
      <line x1="10" y1="21" x2="14" y2="21" />
      <line x1="12" y1="18" x2="12" y2="21" />
    </svg>
  );
}

function InverterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M13 7 9 13h3l-1 4 4-6h-3l1-4Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="7" width="18" height="10" rx="2" />
      <line x1="22" y1="11" x2="22" y2="13" />
      <line x1="6" y1="10" x2="6" y2="14" />
      <line x1="10" y1="10" x2="10" y2="14" />
      <line x1="14" y1="10" x2="14" y2="14" />
    </svg>
  );
}

function CableIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 4v4a4 4 0 0 0 4 4h8a4 4 0 0 1 4 4v4" />
      <rect x="2" y="2" width="4" height="4" rx="0.5" />
      <rect x="18" y="18" width="4" height="4" rx="0.5" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-2.5 2.5-2.5Z" />
    </svg>
  );
}

function AccessoryIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
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

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
