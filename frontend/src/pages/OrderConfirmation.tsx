import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const paymentResult = searchParams.get('payment'); // success|failed (card return)
  const passed = (location.state as { order?: OrderResult } | null)?.order;

  const [status, setStatus] = useState<Status>(passed ? 'ready' : 'loading');
  const [order, setOrder] = useState<OrderDetail | OrderResult | null>(passed ?? null);

  const load = useCallback(() => {
    let active = true;
    if (!passed) setStatus('loading');
    getOrder(number)
      .then((data) => {
        if (!active) return;
        setOrder(data);
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        // If we already have the passed order, keep showing it on fetch error.
        if (passed) {
          setStatus('ready');
          return;
        }
        setStatus(err instanceof NotFoundError ? 'notfound' : 'error');
      });
    return () => {
      active = false;
    };
  }, [number, passed]);

  // Always fetch to enrich (bank details, latest payment status).
  useEffect(() => load(), [load]);

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
        {status === 'ready' && order && (
          <Confirmation order={order} orderNumber={number} paymentResult={paymentResult} />
        )}
      </div>
    </div>
  );
}

function Confirmation({
  order,
  orderNumber,
  paymentResult,
}: {
  order: OrderDetail | OrderResult;
  orderNumber: string;
  paymentResult: string | null;
}) {
  const bankTransfer = 'bankTransfer' in order ? order.bankTransfer : null;
  const cardFailed =
    paymentResult === 'failed' || order.paymentStatus === 'failed';
  const cardPaid = order.paymentStatus === 'paid';

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-card sm:p-10">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            cardFailed ? 'bg-danger/15 text-danger' : 'bg-success/15 text-success'
          }`}
        >
          <CheckCircle />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-primary sm:text-3xl">
          {cardFailed ? 'Ödeme tamamlanamadı' : 'Siparişin alındı! 🎉'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {cardFailed
            ? 'Kart ödemesi başarısız oldu. Havale/EFT ile ödeyebilir ya da tekrar deneyebilirsin. Sipariş numaranı not al.'
            : 'Teşekkürler. Ekibimiz en kısa sürede seni arayıp teslimat detaylarını netleştirecek.'}
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

      {/* Payment instructions */}
      {order.paymentMethod === 'bank_transfer' && !cardPaid && (
        <div className="mt-6 rounded-2xl border-2 border-accent/40 bg-accent/5 p-6 shadow-card">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
            Havale / EFT ile Ödeme
          </h2>
          {bankTransfer?.iban ? (
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Banka" value={bankTransfer.bankName} />
              <Row label="Alıcı" value={bankTransfer.accountHolder} />
              <Row label="IBAN" value={bankTransfer.iban} mono />
              <Row label="Tutar" value={formatPrice(order.total)} />
              <Row label="Açıklama" value={order.orderNumber || orderNumber} mono />
            </dl>
          ) : (
            <p className="mt-2 text-sm text-text-secondary">
              Ödeme bilgileri için ekibimiz seninle iletişime geçecek.
            </p>
          )}
          <p className="mt-3 text-xs leading-relaxed text-text-secondary">
            Açıklama kısmına <strong>sipariş numaranı</strong> yazmayı unutma. Ödemen
            onaylandığında siparişin hazırlanmaya başlar.
          </p>
        </div>
      )}

      {order.paymentMethod === 'cash_on_delivery' && (
        <div className="mt-6 rounded-2xl border border-border bg-white p-6 shadow-card">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
            Kapıda Ödeme
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Teslimat sırasında <strong>{formatPrice(order.total)}</strong> tutarını nakit
            veya kart ile ödeyebilirsin.
          </p>
        </div>
      )}

      {order.paymentMethod === 'card' && (
        <div className="mt-6 rounded-2xl border border-border bg-white p-6 shadow-card">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
            Kart ile Ödeme
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {cardPaid
              ? '✓ Ödemen başarıyla alındı.'
              : cardFailed
                ? 'Ödeme tamamlanamadı. Tekrar denemek için sepetine dönebilirsin.'
                : 'Ödeme durumu güncelleniyor…'}
          </p>
        </div>
      )}

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

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-text-secondary">{label}</dt>
      <dd className={`font-bold text-primary ${mono ? 'font-mono tracking-tight' : ''}`}>
        {value}
      </dd>
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
