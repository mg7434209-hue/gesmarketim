import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  adminApi,
  type AdminBrand,
  type AdminCategory,
  type AdminProduct,
  type AdminSupplier,
  type ProductInput,
  AdminApiError,
} from './adminApi';
import {
  Badge,
  Modal,
  PRODUCT_STATUS_META,
  Spinner,
  btnDanger,
  btnGhost,
  btnPrimary,
  formatTRY,
  inputCls,
  labelCls,
} from './ui';
import ImageManager, { type ManagedImage } from './ImageManager';

export default function AdminProducts({ onAuthError }: { onAuthError: () => void }) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [suppliers, setSuppliers] = useState<AdminSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<AdminProduct | 'new' | null>(null);
  const [uploadEnabled, setUploadEnabled] = useState(false);

  const catName = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  function handleError(err: unknown) {
    if (err instanceof Error && err.name === 'AdminAuthError') {
      onAuthError();
      return;
    }
    setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
  }

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.products.list({
        q: q.trim() || undefined,
        status: statusFilter || undefined,
      });
      setProducts(data);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  // taxonomy once
  useEffect(() => {
    Promise.all([
      adminApi.categories.list(),
      adminApi.brands.list(),
      adminApi.suppliers.list(),
    ])
      .then(([c, b, s]) => {
        setCategories(c);
        setBrands(b);
        setSuppliers(s);
      })
      .catch(handleError);
    adminApi.uploads
      .config()
      .then((cfg) => setUploadEnabled(cfg.enabled))
      .catch(() => setUploadEnabled(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // products on filter change (debounced for search)
  useEffect(() => {
    const handle = window.setTimeout(loadProducts, 250);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statusFilter]);

  async function handleDelete(p: AdminProduct) {
    if (!window.confirm(`"${p.name}" ürününü silmek istediğine emin misin?`)) return;
    try {
      await adminApi.products.remove(p.id);
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err) {
      handleError(err);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary">Ürünler</h2>
          <p className="text-sm text-text-secondary">{products.length} ürün</p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setEditing('new')}>
          + Yeni Ürün
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ürün ara…"
          className={inputCls + ' sm:max-w-xs'}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={inputCls + ' sm:max-w-[12rem]'}
        >
          <option value="">Tüm durumlar</option>
          <option value="active">Yayında</option>
          <option value="draft">Taslak</option>
          <option value="archived">Arşiv</option>
        </select>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      {loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <p className="mt-8 rounded-xl border-2 border-dashed border-border bg-white p-10 text-center text-sm text-text-secondary">
          Ürün bulunamadı.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-white shadow-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-secondary">
                <th className="px-4 py-3 font-bold">Ürün</th>
                <th className="px-4 py-3 font-bold">Kategori</th>
                <th className="px-4 py-3 font-bold">Maliyet</th>
                <th className="px-4 py-3 font-bold">Satış</th>
                <th className="px-4 py-3 font-bold">Stok</th>
                <th className="px-4 py-3 font-bold">Durum</th>
                <th className="px-4 py-3 font-bold text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => {
                const meta = PRODUCT_STATUS_META[p.status];
                return (
                  <tr key={p.id} className="hover:bg-surface/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-primary">{p.name}</p>
                      <p className="text-xs text-text-secondary">/{p.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {p.categoryId ? catName.get(p.categoryId) ?? '—' : '—'}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{formatTRY(p.costPrice)}</td>
                    <td className="px-4 py-3 font-bold text-primary">{formatTRY(p.finalPrice)}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {p.fulfillmentType === 'dropship' ? 'Siparişe özel' : p.stockQty}
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={meta.label} cls={meta.cls} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" className={btnGhost + ' !px-3 !py-1.5'} onClick={() => setEditing(p)}>
                          Düzenle
                        </button>
                        <button type="button" className={btnDanger + ' !px-3 !py-1.5'} onClick={() => handleDelete(p)}>
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductForm
          product={editing === 'new' ? null : editing}
          categories={categories}
          brands={brands}
          suppliers={suppliers}
          uploadEnabled={uploadEnabled}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setProducts((prev) => {
              const idx = prev.findIndex((x) => x.id === saved.id);
              if (idx === -1) return [saved, ...prev];
              const next = [...prev];
              next[idx] = saved;
              return next;
            });
            setEditing(null);
          }}
          onAuthError={onAuthError}
        />
      )}
    </div>
  );
}

function ProductForm({
  product,
  categories,
  brands,
  suppliers,
  uploadEnabled,
  onClose,
  onSaved,
  onAuthError,
}: {
  product: AdminProduct | null;
  categories: AdminCategory[];
  brands: AdminBrand[];
  suppliers: AdminSupplier[];
  uploadEnabled: boolean;
  onClose: () => void;
  onSaved: (p: AdminProduct) => void;
  onAuthError: () => void;
}) {
  const [form, setForm] = useState({
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    description: product?.description ?? '',
    categoryId: product?.categoryId ?? '',
    brandId: product?.brandId ?? '',
    supplierId: product?.supplierId ?? '',
    supplierSku: product?.supplierSku ?? '',
    costPrice: product ? String(product.costPrice) : '',
    markupPercent: product?.markupPercent != null ? String(product.markupPercent) : '',
    fulfillmentType: product?.fulfillmentType ?? 'stock',
    stockQty: product ? String(product.stockQty) : '0',
    status: product?.status ?? 'draft',
  });
  const [images, setImages] = useState<ManagedImage[]>(product?.images ?? []);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError(null);

    const payload: ProductInput = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || null,
      categoryId: form.categoryId || null,
      brandId: form.brandId || null,
      supplierId: form.supplierId || null,
      supplierSku: form.supplierSku.trim() || null,
      costPrice: form.costPrice === '' ? 0 : Number(form.costPrice),
      markupPercent: form.markupPercent === '' ? null : Number(form.markupPercent),
      fulfillmentType: form.fulfillmentType as 'stock' | 'dropship',
      stockQty: form.stockQty === '' ? 0 : Number(form.stockQty),
      status: form.status as 'draft' | 'active' | 'archived',
      images,
    };

    try {
      const saved = product
        ? await adminApi.products.update(product.id, payload)
        : await adminApi.products.create(payload);
      onSaved(saved);
    } catch (err) {
      if (err instanceof Error && err.name === 'AdminAuthError') {
        onAuthError();
        return;
      }
      if (err instanceof AdminApiError) {
        if (err.fields) setErrors(err.fields);
        setFormError(err.message);
      } else {
        setFormError('Kaydedilemedi.');
      }
      setSaving(false);
    }
  }

  return (
    <Modal title={product ? 'Ürünü Düzenle' : 'Yeni Ürün'} onClose={onClose} wide>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Ürün Adı *</label>
          <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} />
          {errors.name && <p className="mt-1 text-xs font-semibold text-danger">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Slug (boşsa otomatik)</label>
            <input className={inputCls} value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="otomatik-uretilir" />
          </div>
          <div>
            <label className={labelCls}>Durum</label>
            <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="draft">Taslak</option>
              <option value="active">Yayında</option>
              <option value="archived">Arşiv</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Açıklama</label>
          <textarea
            rows={3}
            className={inputCls}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Kategori</label>
            <select className={inputCls} value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Marka</label>
            <select className={inputCls} value={form.brandId} onChange={(e) => set('brandId', e.target.value)}>
              <option value="">—</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Tedarikçi (gizli)</label>
            <select className={inputCls} value={form.supplierId} onChange={(e) => set('supplierId', e.target.value)}>
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Maliyet Fiyatı (₺) — gizli</label>
            <input type="number" step="0.01" min="0" className={inputCls} value={form.costPrice} onChange={(e) => set('costPrice', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Kar Marjı (%) — boşsa kategori/tedarikçi</label>
            <input type="number" step="0.01" className={inputCls} value={form.markupPercent} onChange={(e) => set('markupPercent', e.target.value)} placeholder="örn. 20" />
          </div>
        </div>

        <p className="rounded-lg bg-surface px-3 py-2 text-xs text-text-secondary">
          Satış fiyatı (müşteriye gösterilen) maliyet ve marjdan otomatik hesaplanır.
          Tedarikçi adı ve maliyet asla müşteriye gösterilmez.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Tedarik Tipi</label>
            <select className={inputCls} value={form.fulfillmentType} onChange={(e) => set('fulfillmentType', e.target.value)}>
              <option value="stock">Stok (1-2 gün)</option>
              <option value="dropship">Siparişe özel (5-7 gün)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Stok Adedi</label>
            <input
              type="number"
              min="0"
              className={inputCls}
              value={form.stockQty}
              onChange={(e) => set('stockQty', e.target.value)}
              disabled={form.fulfillmentType === 'dropship'}
            />
          </div>
          <div>
            <label className={labelCls}>Tedarikçi SKU</label>
            <input className={inputCls} value={form.supplierSku} onChange={(e) => set('supplierSku', e.target.value)} />
          </div>
        </div>

        <ImageManager value={images} onChange={setImages} uploadEnabled={uploadEnabled} />

        {formError && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{formError}</p>
        )}

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button type="button" className={btnGhost} onClick={onClose}>İptal</button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? 'Kaydediliyor…' : product ? 'Güncelle' : 'Oluştur'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
