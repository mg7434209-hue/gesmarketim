import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type LegalPageProps = {
  title: string;
  lastUpdated?: string;
  showDraftBadge?: boolean;
  children: ReactNode;
};

const DEFAULT_LAST_UPDATED = '26 Mayıs 2026';

export default function LegalPage({
  title,
  lastUpdated = DEFAULT_LAST_UPDATED,
  showDraftBadge = false,
  children,
}: LegalPageProps) {
  return (
    <div className="bg-white">
      <div className="container-x py-12">
        <Breadcrumb current={title} />

        {showDraftBadge && <DraftBadge />}

        <header className="mt-6">
          <h1 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Son güncelleme: {lastUpdated}
          </p>
        </header>

        <div className="mt-8 max-w-3xl space-y-6 text-sm leading-relaxed text-text-secondary sm:text-base">
          {children}
        </div>
      </div>
    </div>
  );
}

type BreadcrumbProps = { current: string };

function Breadcrumb({ current }: BreadcrumbProps) {
  return (
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
          {current}
        </li>
      </ol>
    </nav>
  );
}

function DraftBadge() {
  return (
    <div
      role="note"
      className="mt-5 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-primary"
    >
      <WarningIcon />
      <p>
        <span className="font-bold">Bu metin taslaktır.</span> Hukuki tavsiye değildir,
        avukat onayı önerilir.
      </p>
    </div>
  );
}

function WarningIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="mt-0.5 shrink-0 text-warning"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

type LegalSectionProps = { title: string; children: ReactNode };

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-primary sm:text-xl">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

type LegalListProps = { items: ReactNode[] };

export function LegalList({ items }: LegalListProps) {
  return (
    <ul className="ml-5 list-disc space-y-2">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
