import { useEffect, useState, type FormEvent } from 'react';
import {
  adminApi,
  type AdminBrand,
  type AdminCategory,
  type AdminSupplier,
} from './adminApi';
import { Spinner, btnDanger, btnPrimary, inputCls, labelCls } from './ui';

export default function AdminTaxonomy({ onAuthError }: { onAuthError: () => void }) {
  const [tab, setTab] = useState<'categories' | 'brands' | 'suppliers'>('categories');

  const tabs = [
    { id: 'categories', label: 'Kategoriler' },
    { id: 'brands', label: 'Markalar' },
    { id: 'suppliers', label: 'Tedarikçiler' },
  ] as const;

  return (
    <div>
      <h2 className="text-xl font-bold text-primary">Katalog Yapısı</h2>
      <div className="mt-4 flex gap-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-bold transition-colors ${
              tab === t.id
                ? 'border-accent text-primary'
                : 'border-transparent text-text-secondary hover:text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'categories' && <Categories onAuthError={onAuthError} />}
        {tab === 'brands' && <Brands onAuthError={onAuthError} />}
        {tab === 'suppliers' && <Suppliers onAuthError={onAuthError} />}
      </div>
    </div>
  );
}

function useAuthError(onAuthError: () => void) {
  return (err: unknown, setError: (s: string) => void) => {
    if (err instanceof Error && err.name === 'AdminAuthError') {
      onAuthError();
      return;
    }
    setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
  };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
function Categories({ onAuthError }: { onAuthError: () => void }) {
  const [rows, setRows] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', defaultMarkupPercent: '0', sortOrder: '0' });
  const handle = useAuthError(onAuthError);

  async function load() {
    setLoading(true);
    try {
      setRows(await adminApi.categories.list());
    } catch (err) {
      handle(err, setError);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await adminApi.categories.create({
        name: form.name.trim(),
        defaultMarkupPercent: Number(form.defaultMarkupPercent) || 0,
        sortOrder: Number(form.sortOrder) || 0,
      });
      setForm({ name: '', defaultMarkupPercent: '0', sortOrder: '0' });
      load();
    } catch (err) {
      handle(err, setError);
    }
  }

  async function update(c: AdminCategory, patch: Partial<AdminCategory>) {
    try {
      const saved = await adminApi.categories.update(c.id, patch);
      setRows((prev) => prev.map((x) => (x.id === c.id ? saved : x)));
    } catch (err) {
      handle(err, setError);
    }
  }

  async function remove(c: AdminCategory) {
    if (!window.confirm(`"${c.name}" kategorisini sil?`)) return;
    try {
      await adminApi.categories.remove(c.id);
      setRows((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      handle(err, setError);
    }
  }

  if (loading) return <Spinner />;
  return (
    <div>
      {error && <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-card">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-secondary">
              <th className="px-4 py-3 font-bold">Ad</th>
              <th className="px-4 py-3 font-bold">Slug</th>
              <th className="px-4 py-3 font-bold">Marj %</th>
              <th className="px-4 py-3 font-bold">Sıra</th>
              <th className="px-4 py-3 font-bold text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-surface/60">
                <td className="px-4 py-2.5 font-semibold text-primary">{c.name}</td>
                <td className="px-4 py-2.5 text-text-secondary">/{c.slug}</td>
                <td className="px-4 py-2.5">
                  <input
                    type="number"
                    defaultValue={c.defaultMarkupPercent}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== c.defaultMarkupPercent) update(c, { defaultMarkupPercent: v });
                    }}
                    className={inputCls + ' !w-20 !py-1'}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <input
                    type="number"
                    defaultValue={c.sortOrder}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== c.sortOrder) update(c, { sortOrder: v });
                    }}
                    className={inputCls + ' !w-16 !py-1'}
                  />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button type="button" className={btnDanger + ' !px-3 !py-1'} onClick={() => remove(c)}>Sil</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={add} className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface/50 p-4">
        <div className="flex-1 min-w-[160px]">
          <label className={labelCls}>Yeni kategori adı</label>
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className={labelCls}>Marj %</label>
          <input type="number" className={inputCls + ' !w-24'} value={form.defaultMarkupPercent} onChange={(e) => setForm({ ...form, defaultMarkupPercent: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Sıra</label>
          <input type="number" className={inputCls + ' !w-20'} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
        </div>
        <button type="submit" className={btnPrimary}>+ Ekle</button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Brands
// ---------------------------------------------------------------------------
function Brands({ onAuthError }: { onAuthError: () => void }) {
  const [rows, setRows] = useState<AdminBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const handle = useAuthError(onAuthError);

  async function load() {
    setLoading(true);
    try {
      setRows(await adminApi.brands.list());
    } catch (err) {
      handle(err, setError);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await adminApi.brands.create({ name: name.trim() });
      setName('');
      load();
    } catch (err) {
      handle(err, setError);
    }
  }
  async function remove(b: AdminBrand) {
    if (!window.confirm(`"${b.name}" markasını sil?`)) return;
    try {
      await adminApi.brands.remove(b.id);
      setRows((prev) => prev.filter((x) => x.id !== b.id));
    } catch (err) {
      handle(err, setError);
    }
  }

  if (loading) return <Spinner />;
  return (
    <div>
      {error && <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
        <ul className="divide-y divide-border">
          {rows.map((b) => (
            <li key={b.id} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface/60">
              <span><span className="font-semibold text-primary">{b.name}</span> <span className="text-text-secondary">/{b.slug}</span></span>
              <button type="button" className={btnDanger + ' !px-3 !py-1'} onClick={() => remove(b)}>Sil</button>
            </li>
          ))}
        </ul>
      </div>
      <form onSubmit={add} className="mt-5 flex items-end gap-3 rounded-xl border border-border bg-surface/50 p-4">
        <div className="flex-1">
          <label className={labelCls}>Yeni marka adı</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <button type="submit" className={btnPrimary}>+ Ekle</button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suppliers (admin-only)
// ---------------------------------------------------------------------------
function Suppliers({ onAuthError }: { onAuthError: () => void }) {
  const [rows, setRows] = useState<AdminSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', defaultMarkupPercent: '' });
  const handle = useAuthError(onAuthError);

  async function load() {
    setLoading(true);
    try {
      setRows(await adminApi.suppliers.list());
    } catch (err) {
      handle(err, setError);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await adminApi.suppliers.create({
        name: form.name.trim(),
        defaultMarkupPercent: form.defaultMarkupPercent === '' ? null : Number(form.defaultMarkupPercent),
      });
      setForm({ name: '', defaultMarkupPercent: '' });
      load();
    } catch (err) {
      handle(err, setError);
    }
  }
  async function remove(s: AdminSupplier) {
    if (!window.confirm(`"${s.name}" tedarikçisini sil?`)) return;
    try {
      await adminApi.suppliers.remove(s.id);
      setRows((prev) => prev.filter((x) => x.id !== s.id));
    } catch (err) {
      handle(err, setError);
    }
  }

  if (loading) return <Spinner />;
  return (
    <div>
      <p className="mb-3 rounded-lg bg-warning/10 px-3 py-2 text-xs leading-relaxed text-primary">
        <strong>Gizli:</strong> Tedarikçi bilgileri yalnızca admin panelinde görünür, müşteriye asla gösterilmez.
      </p>
      {error && <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-card">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-secondary">
              <th className="px-4 py-3 font-bold">Ad</th>
              <th className="px-4 py-3 font-bold">Varsayılan Marj %</th>
              <th className="px-4 py-3 font-bold">Senkron</th>
              <th className="px-4 py-3 font-bold text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((s) => (
              <tr key={s.id} className="hover:bg-surface/60">
                <td className="px-4 py-2.5 font-semibold text-primary">{s.name}</td>
                <td className="px-4 py-2.5 text-text-secondary">{s.defaultMarkupPercent ?? '—'}</td>
                <td className="px-4 py-2.5 text-text-secondary">{s.syncMethod}</td>
                <td className="px-4 py-2.5 text-right">
                  <button type="button" className={btnDanger + ' !px-3 !py-1'} onClick={() => remove(s)}>Sil</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form onSubmit={add} className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface/50 p-4">
        <div className="flex-1 min-w-[160px]">
          <label className={labelCls}>Yeni tedarikçi adı</label>
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className={labelCls}>Varsayılan marj %</label>
          <input type="number" className={inputCls + ' !w-28'} value={form.defaultMarkupPercent} onChange={(e) => setForm({ ...form, defaultMarkupPercent: e.target.value })} placeholder="opsiyonel" />
        </div>
        <button type="submit" className={btnPrimary}>+ Ekle</button>
      </form>
    </div>
  );
}
