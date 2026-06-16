import { useEffect, useState } from 'react';
import { adminApi, type AdminStats, type OrderStatus } from './adminApi';
import { Badge, ORDER_STATUS_META, Spinner, formatDate, formatTRY } from './ui';

export default function AdminDashboard({ onAuthError }: { onAuthError: () => void }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .stats()
      .then(setStats)
      .catch((err) => {
        if (err instanceof Error && err.name === 'AdminAuthError') {
          onAuthError();
          return;
        }
        setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</p>;
  }
  if (!stats) return <Spinner />;

  const pending = stats.orders.byStatus.pending ?? 0;

  return (
    <div>
      <h2 className="text-xl font-bold text-primary">Genel Bakış</h2>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Toplam Ciro" value={formatTRY(stats.orders.revenue)} accent />
        <StatCard label="Sipariş" value={String(stats.orders.total)} hint={`${pending} bekliyor`} />
        <StatCard label="Yayındaki Ürün" value={String(stats.products.active)} hint={`${stats.products.total} toplam`} />
        <StatCard label="Bekleyen Sipariş" value={String(pending)} />
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Son Siparişler</h3>
        {stats.recentOrders.length === 0 ? (
          <p className="mt-3 rounded-xl border-2 border-dashed border-border bg-white p-8 text-center text-sm text-text-secondary">
            Henüz sipariş yok.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-white shadow-card">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-secondary">
                  <th className="px-4 py-3 font-bold">Sipariş</th>
                  <th className="px-4 py-3 font-bold">Müşteri</th>
                  <th className="px-4 py-3 font-bold">Tarih</th>
                  <th className="px-4 py-3 font-bold">Tutar</th>
                  <th className="px-4 py-3 font-bold">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.recentOrders.map((o) => {
                  const meta = ORDER_STATUS_META[o.status as OrderStatus] ?? {
                    label: o.status,
                    cls: 'bg-border text-text-secondary ring-border',
                  };
                  return (
                    <tr key={o.orderNumber} className="hover:bg-surface/60">
                      <td className="px-4 py-3 font-bold text-primary">{o.orderNumber}</td>
                      <td className="px-4 py-3 text-text-secondary">{o.customerName}</td>
                      <td className="px-4 py-3 text-text-secondary">{formatDate(o.createdAt)}</td>
                      <td className="px-4 py-3 font-bold text-primary">{formatTRY(o.total)}</td>
                      <td className="px-4 py-3"><Badge label={meta.label} cls={meta.cls} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-card ${
        accent ? 'border-accent/40 bg-accent/10' : 'border-border bg-white'
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-primary">{value}</p>
      {hint && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
    </div>
  );
}
