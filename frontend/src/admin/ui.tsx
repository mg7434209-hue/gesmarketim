import { useEffect, type ReactNode } from 'react';
import type { OrderStatus } from './adminApi';

const TRY = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
});

export function formatTRY(n: number): string {
  return TRY.format(n);
}

export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; cls: string }> = {
  pending: { label: 'Bekliyor', cls: 'bg-warning/15 text-warning ring-warning/30' },
  confirmed: { label: 'Onaylandı', cls: 'bg-primary/10 text-primary ring-primary/20' },
  shipped: { label: 'Kargoda', cls: 'bg-accent/20 text-accent-dark ring-accent/40' },
  delivered: { label: 'Teslim edildi', cls: 'bg-success/15 text-success ring-success/30' },
  cancelled: { label: 'İptal', cls: 'bg-danger/10 text-danger ring-danger/30' },
};

export const PRODUCT_STATUS_META: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Taslak', cls: 'bg-text-secondary/10 text-text-secondary ring-text-secondary/20' },
  active: { label: 'Yayında', cls: 'bg-success/15 text-success ring-success/30' },
  archived: { label: 'Arşiv', cls: 'bg-danger/10 text-danger ring-danger/30' },
};

export function Badge({ label, cls }: { label: string; cls: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${cls}`}
    >
      {label}
    </span>
  );
}

export function Spinner({ label = 'Yükleniyor…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-text-secondary">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
      {label}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-primary/40 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`my-4 w-full rounded-2xl border border-border bg-white shadow-xl ${
          wide ? 'max-w-3xl' : 'max-w-lg'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Kapat"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// Shared form-control class strings.
export const inputCls =
  'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-primary placeholder:text-text-secondary/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30';

export const labelCls = 'mb-1 block text-xs font-bold uppercase tracking-wider text-text-secondary';

export const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

export const btnGhost =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-accent';

export const btnDanger =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-danger/40 bg-white px-3 py-2 text-sm font-bold text-danger transition-colors hover:bg-danger hover:text-white focus:outline-none focus:ring-2 focus:ring-danger';
