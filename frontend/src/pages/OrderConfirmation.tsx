import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  getOrder,
  NotFoundError,
  type OrderDetail,
  type OrderResult,
} from '../lib/api';
import { formatPrice } from '../components/product-ui';

type Status = 'loading' | 'ready' | 'notfound' | 'error';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Alındı — onay bekliyor',
  confirmed: 'Onaylandı',
  shipped: 'Kargoya verildi',
  delivered: 'Teslim edildi',
  cancelled: 'İptal edildi',
};

export default function OrderConfirmation() {
  const { number = '' } = useParams<{ number: string }>();
  const location = useLocation();
  const passed = (location.state as { order?: OrderResult } | null)?.order;

  const [status, setStatus] = useState<Status>(passed ? 'ready' : 'loading');
  const [order, setOrder] = useState<OrderDetail | OrderResult | null>(passed ?? null);

  const load = useCallback(() => {
    let active = true;
    setStatus('loading');
    getOrder(number)
      .then((data) => {
        if (!active) return;
        setOrder(data);
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        setStatus(err instanceof NotFoundError ? 'notfound' : 'error');
      });
    return () => {
      active = false;
    };
  }, [number]);

  useEffect(() => {
    if (passed) return; // already have it from checkout navigation
    return load();
  }, [passed, load]);

  return (
    <div className="bg-surface">
      <div className="container-x py-12">
        {status === 'loading' && <p className="text-center text-text-secondary">Yükleniyor…</p>}
        {status === 'notfound' && <NotFound />}
        {status === 'error' && (
          <div className="mx-auto max-w-lg text-center">
            <p className="text-text-secondary">Sipariş yüklenemedi.</p>
            <button onClick={load} className="mt-4 rounded-lg border-2 border-primary px-5 py-2.5 text-sm font-bold text-primary hover:bg-primary hover:text-white">
              Tekrar dene
            </button>
          </div>
        )}
        {status === 'ready' && order && <Confirmation order={order} orderNumber={number} />}
      </div>
    </div>
  );
}

function Confirmation({
  order,
  orderNumber,
}: {
  order: OrderDetail | OrderResult;
  orderNumber: string;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-card sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-primary sm:text-3xl">
          Siparişin alındı! 🎉
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Teşekkürler. Ekibimiz en kısa sürede seni arayıp ödeme ve teslimat detaylarını
          netleştirecek.
        </p>

        <div className="mt-6 inline-flex flex-col items-center rounded-xl border border-border bg-surface px-6 py-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Sipariş Numarası
          </span>
          <span className="mt-1 text-xl font-extrabold tracking-wide text-primary">
            {order.orderNumber || orderNumber}
          </span>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-primary">
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-white p-6 shadow-card">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
          Sipariş Detayı
        </h2>
        <ul className="mt-4 divide-y divide-border">
          {order.items.map((item) => (
            <li key={item.slug + item.name} className="flex justify-between gap-3 py-3 text-sm">
              <span className="text-primary">
                <span className="font-semibold">{item.quantity}×</span> {item.name}
              </span>
              <span className="shrink-0 font-bold text-primary">{formatPrice(item.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-secondary">Ara toplam</dt>
            <dd className="font-bold text-primary">{formatPrice(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">Kargo</dt>
            <dd className="font-bold text-primary">
              {order.shippingCost === 0 ? 'Ücretsiz' : formatPrice(order.shippingCost)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <dt className="text-base font-bold text-primary">Toplam</dt>
            <dd className="text-lg font-extrabold text-primary">{formatPrice(order.total)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 text-center">
        <Link
          to="/urunler"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-base font-bold text-primary shadow-sm hover:bg-accent-dark"
        >
          Alışverişe devam et →
        </Link>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border-2 border-dashed border-border bg-white p-10 text-center shadow-card">
      <p className="text-5xl font-extrabold text-accent">404</p>
      <h1 className="mt-4 text-xl font-bold text-primary">Sipariş bulunamadı</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-text-secondary">
        Bu numarada bir sipariş bulamadık. Numarayı kontrol edip tekrar dene.
      </p>
      <Link to="/" className="mt-6 inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-primary hover:bg-accent-dark">
        Anasayfaya dön
      </Link>
    </div>
  );
}

function CheckCircle() {
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
