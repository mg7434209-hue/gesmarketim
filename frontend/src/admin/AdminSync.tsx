import { useEffect, useRef, useState } from 'react';
import {
  adminApi,
  type AdminCategory,
  type AdminSupplier,
  type SyncSummary,
} from './adminApi';
import { Spinner, btnPrimary, inputCls, labelCls } from './ui';

const TEMPLATE =
  'sku;ad;maliyet;marj;stok;kategori;marka;durum;gorsel\n' +
  'TEDARIKCI-SKU-1;Örnek Ürün 550W;3200;18;25;gunes-paneli;lexron;active;\n' +
  'TEDARIKCI-SKU-2;Örnek İnverter 5kW;18500;20;0;inverter;deye;active;';

export default function AdminSync({ onAuthError }: { onAuthError: () => void }) {
  const [suppliers, setSuppliers] = useState<AdminSupplier[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState('');
  const [csv, setCsv] = useState('');
  const [createMissing, setCreateMissing] = useState(false);
  const [defaultCategoryId, setDefaultCategoryId] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handle(err: unknown) {
    if (err instanceof Error && err.name === 'AdminAuthError') {
      onAuthError();
      return;
    }
    setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
  }

  useEffect(() => {
    Promise.all([adminApi.suppliers.list(), adminApi.categories.list()])
      .then(([s, c]) => {
        setSuppliers(s);
        setCategories(c);
        if (s.length > 0) setSupplierId(s[0].id);
      })
      .catch(handle)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) e.target.value = '';
    if (!file) return;
    setCsv(await file.text());
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gesmarketim-tedarikci-sablon.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function run() {
    if (!supplierId || csv.trim() === '') {
      setError('Tedarikçi seç ve CSV içeriği gir.');
      return;
    }
    setError(null);
    setRunning(true);
    setSummary(null);
    try {
      const result = await adminApi.suppliers.syncCsv(supplierId, {
        csv,
        createMissing,
        defaultCategoryId: defaultCategoryId || null,
        dryRun,
      });
      setSummary(result);
    } catch (err) {
      handle(err);
    } finally {
      setRunning(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-primary">Tedarikçi Senkronizasyonu</h2>
        <p className="text-sm text-text-secondary">
          Tedarikçi fiyat/stok listesini CSV ile içe aktar. Ürünler SKU ile eşleştirilir;
          maliyet/stok güncellenir, satış fiyatı marj kuralına göre yeniden hesaplanır.
        </p>
      </div>

      {suppliers.length === 0 ? (
        <p className="mt-6 rounded-xl border-2 border-dashed border-border bg-white p-8 text-center text-sm text-text-secondary">
          Önce “Katalog Yapısı → Tedarikçiler” bölümünden bir tedarikçi ekle.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Tedarikçi</label>
            <select className={inputCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Yeni ürünler için varsayılan kategori</label>
            <select className={inputCls} value={defaultCategoryId} onChange={(e) => setDefaultCategoryId(e.target.value)}>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <label className={labelCls + ' mb-0'}>CSV İçeriği</label>
              <div className="flex gap-2">
                <button type="button" className="text-xs font-semibold text-accent-dark hover:underline" onClick={downloadTemplate}>
                  Şablon indir
                </button>
                <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
                <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => fileRef.current?.click()}>
                  Dosyadan yükle
                </button>
              </div>
            </div>
            <textarea
              rows={8}
              className={inputCls + ' font-mono text-xs'}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              placeholder={'sku;ad;maliyet;stok;kategori\nSKU-1;Panel 550W;3200;25;gunes-paneli'}
            />
            <p className="mt-1 text-xs text-text-secondary">
              Sütunlar: <code>sku</code> (zorunlu), <code>ad</code>, <code>maliyet</code>,{' '}
              <code>marj</code>, <code>stok</code>, <code>kategori</code>, <code>marka</code>,{' '}
              <code>durum</code>, <code>gorsel</code>. Ayraç <code>;</code> veya <code>,</code>.
            </p>
          </div>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2 text-sm text-primary">
              <input type="checkbox" checked={createMissing} onChange={(e) => setCreateMissing(e.target.checked)} className="h-4 w-4 rounded border-border text-accent focus:ring-accent" />
              Eşleşmeyen satırlardan yeni ürün oluştur (taslak)
            </label>
            <label className="flex items-center gap-2 text-sm text-primary">
              <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} className="h-4 w-4 rounded border-border text-accent focus:ring-accent" />
              Önizleme (kaydetme)
            </label>
            <button type="button" className={btnPrimary + ' ml-auto'} onClick={run} disabled={running}>
              {running ? 'Çalışıyor…' : dryRun ? 'Önizlemeyi Çalıştır' : 'Senkronize Et'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</p>
      )}

      {summary && <SummaryView summary={summary} />}
    </div>
  );
}

function SummaryView({ summary }: { summary: SyncSummary }) {
  return (
    <div className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Sonuç</h3>
        {summary.dryRun && (
          <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-bold text-warning ring-1 ring-inset ring-warning/30">
            Önizleme — kaydedilmedi
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Satır" value={summary.total} />
        <Stat label="Oluşturuldu" value={summary.created} tone="success" />
        <Stat label="Güncellendi" value={summary.updated} tone="success" />
        <Stat label="Değişmedi" value={summary.unchanged} />
        <Stat label="Atlandı" value={summary.skipped} tone={summary.skipped > 0 ? 'warn' : undefined} />
      </div>

      {summary.errors.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-danger">Hatalar ({summary.errors.length})</h4>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">
            {summary.errors.map((e, i) => (
              <li key={i} className="rounded bg-danger/5 px-2 py-1 text-text-secondary">
                Satır {e.row}{e.sku ? ` (${e.sku})` : ''}: {e.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'warn' }) {
  const color =
    tone === 'success' ? 'text-success' : tone === 'warn' ? 'text-warning' : 'text-primary';
  return (
    <div className="rounded-xl border border-border bg-surface/50 p-3 text-center">
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{label}</p>
    </div>
  );
}
