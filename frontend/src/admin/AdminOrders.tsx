import { useEffect, useState } from 'react';
import {
  adminApi,
  type AdminOrderDetail,
  type AdminOrderListItem,
  type OrderStatus,
  type PaymentStatus,
} from './adminApi';
import {
  Badge,
  Modal,
  ORDER_STATUS_META,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_META,
  Spinner,
  btnGhost,
  formatDate,
  formatTRY,
  inputCls,
} from './ui';

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_FLOW: PaymentStatus[] = ['unpaid', 'awaiting', 'paid', 'failed', 'refunded'];

export default function AdminOrders({ onAuthError }: { onAuthError: () => void }) {
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  function handleError(err: unknown) {
    if (err instanceof Error && err.name === 'AdminAuthError') {
      onAuthError();
      return;
    }
    setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setOrders(await adminApi.orders.list(statusFilter || undefined));
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  function applyStatus(id: string, status: OrderStatus) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  function applyPayment(id: string, paymentStatus: PaymentStatus) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, paymentStatus } : o)));
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary">Siparişler</h2>
          <p className="text-sm text-text-secondary">{orders.length} sipariş</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={inputCls + ' sm:max-w-[12rem]'}
        >
          <option value="">Tüm durumlar</option>
          {STATUS_FLOW.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_META[s].label}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</p>
      )}

      {loading ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <p className="mt-8 rounded-xl border-2 border-dashed border-border bg-white p-10 text-center text-sm text-text-secondary">
          Henüz sipariş yok.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-white shadow-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-secondary">
                <th className="px-4 py-3 font-bold">Sipariş</th>
                <th className="px-4 py-3 font-bold">Müşteri</th>
                <th className="px-4 py-3 font-bold">Konum</th>
                <th className="px-4 py-3 font-bold">Tarih</th>
                <th className="px-4 py-3 font-bold">Tutar</th>
                <th className="px-4 py-3 font-bold">Ödeme</th>
                <th className="px-4 py-3 font-bold">Durum</th>
                <th className="px-4 py-3 font-bold text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => {
                const meta = ORDER_STATUS_META[o.status];
                const pay = PAYMENT_STATUS_META[o.paymentStatus];
                return (
                  <tr key={o.id} className="hover:bg-surface/60">
                    <td className="px-4 py-3 font-bold text-primary">{o.orderNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-primary">{o.customerName}</p>
                      <p className="text-xs text-text-secondary">{o.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{o.district} / {o.city}</td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-3 font-bold text-primary">{formatTRY(o.total)}</td>
                    <td className="px-4 py-3">
                      <Badge label={pay.label} cls={pay.cls} />
                      <p className="mt-1 text-[11px] text-text-secondary">
                        {PAYMENT_METHOD_LABEL[o.paymentMethod]}
                      </p>
                    </td>
                    <td className="px-4 py-3"><Badge label={meta.label} cls={meta.cls} /></td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" className={btnGhost + ' !px-3 !py-1.5'} onClick={() => setOpenId(o.id)}>
                        Detay
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {openId && (
        <OrderDetailModal
          id={openId}
          onClose={() => setOpenId(null)}
          onStatusChange={applyStatus}
          onPaymentChange={applyPayment}
          onAuthError={onAuthError}
        />
      )}
    </div>
  );
}

function OrderDetailModal({
  id,
  onClose,
  onStatusChange,
  onPaymentChange,
  onAuthError,
}: {
  id: string;
  onClose: () => void;
  onStatusChange: (id: string, status: OrderStatus) => void;
  onPaymentChange: (id: string, paymentStatus: PaymentStatus) => void;
  onAuthError: () => void;
}) {
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  function handleError(err: unknown) {
    if (err instanceof Error && err.name === 'AdminAuthError') {
      onAuthError();
      return;
    }
    setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
  }

  useEffect(() => {
    adminApi.orders.get(id).then(setOrder).catch(handleError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function changeStatus(status: OrderStatus) {
    if (!order) return;
    setUpdating(true);
    try {
      await adminApi.orders.setStatus(order.id, status);
      setOrder({ ...order, status });
      onStatusChange(order.id, status);
    } catch (err) {
      handleError(err);
    } finally {
      setUpdating(false);
    }
  }

  async function changePayment(paymentStatus: PaymentStatus) {
    if (!order) return;
    setUpdating(true);
    try {
      await adminApi.orders.setPaymentStatus(order.id, paymentStatus);
      setOrder({ ...order, paymentStatus });
      onPaymentChange(order.id, paymentStatus);
    } catch (err) {
      handleError(err);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Modal title={order ? `Sipariş ${order.orderNumber}` : 'Sipariş'} onClose={onClose} wide>
      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</p>
      )}
      {!order ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoBlock title="Müşteri">
              <p className="font-semibold text-primary">{order.customerName}</p>
              <p className="text-text-secondary">{order.customerPhone}</p>
              {order.customerEmail && <p className="text-text-secondary">{order.customerEmail}</p>}
            </InfoBlock>
            <InfoBlock title="Teslimat">
              <p className="text-text-secondary">{order.district} / {order.city}</p>
              <p className="text-text-secondary">{order.addressLine}</p>
              {order.note && <p className="mt-1 text-text-secondary"><strong>Not:</strong> {order.note}</p>}
            </InfoBlock>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-secondary">Ürünler</h3>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {order.items.map((it) => (
                <li key={it.slug + it.name} className="flex justify-between gap-3 px-4 py-3 text-sm">
                  <span className="text-primary">
                    <span className="font-semibold">{it.quantity}×</span> {it.name}
                    <span className="ml-2 text-xs text-text-secondary">({formatTRY(it.unitPrice)})</span>
                  </span>
                  <span className="font-bold text-primary">{formatTRY(it.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-text-secondary">Ara toplam</dt><dd className="font-semibold text-primary">{formatTRY(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-text-secondary">Kargo</dt><dd className="font-semibold text-primary">{order.shippingCost === 0 ? 'Ücretsiz' : formatTRY(order.shippingCost)}</dd></div>
              <div className="flex justify-between border-t border-border pt-1.5"><dt className="font-bold text-primary">Toplam</dt><dd className="text-base font-extrabold text-primary">{formatTRY(order.total)}</dd></div>
            </dl>
          </div>

          <div className="border-t border-border pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Ödeme</h3>
              <span className="text-xs text-text-secondary">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_FLOW.map((s) => {
                const meta = PAYMENT_STATUS_META[s];
                const active = order.paymentStatus === s;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={updating || active}
                    onClick={() => changePayment(s)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-bold ring-1 ring-inset transition-colors disabled:cursor-default ${
                      active ? meta.cls : 'bg-white text-text-secondary ring-border hover:bg-surface'
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-secondary">Sipariş Durumu</h3>
            <div className="flex flex-wrap gap-2">
              {STATUS_FLOW.map((s) => {
                const meta = ORDER_STATUS_META[s];
                const active = order.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={updating || active}
                    onClick={() => changeStatus(s)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-bold ring-1 ring-inset transition-colors disabled:cursor-default ${
                      active ? meta.cls : 'bg-white text-text-secondary ring-border hover:bg-surface'
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface/50 p-4 text-sm">
      <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary">{title}</h3>
      {children}
    </div>
  );
}
