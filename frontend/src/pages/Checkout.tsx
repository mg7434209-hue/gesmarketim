import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../cart/CartContext';
import { formatPrice } from '../components/product-ui';
import { shippingFor } from '../lib/shipping';
import { createOrder, CheckoutError } from '../lib/api';

type FormState = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  city: string;
  district: string;
  addressLine: string;
  note: string;
};

const EMPTY: FormState = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  city: '',
  district: '',
  addressLine: '',
  note: '',
};

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const shipping = shippingFor(subtotal);
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <div className="bg-surface">
        <div className="container-x py-16 text-center">
          <h1 className="text-2xl font-bold text-primary">Sepetin boş</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Ödeme adımına geçmek için önce sepetine ürün ekle.
          </p>
          <Link
            to="/urunler"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-base font-bold text-primary shadow-sm hover:bg-accent-dark"
          >
            Ürünlere git →
          </Link>
        </div>
      </div>
    );
  }

  const update =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const result = await createOrder({
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail || undefined,
        city: form.city,
        district: form.district,
        addressLine: form.addressLine,
        note: form.note || undefined,
        items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
      });
      clear();
      navigate(`/siparis/${result.orderNumber}`, { state: { order: result } });
    } catch (err) {
      if (err instanceof CheckoutError) {
        if (err.fields) setErrors(err.fields);
        setFormError(err.message);
      } else {
        setFormError('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-surface">
      <div className="container-x py-12">
        <nav aria-label="Breadcrumb" className="text-xs text-text-secondary sm:text-sm">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link to="/" className="font-medium text-primary hover:text-accent-dark">
                Anasayfa
              </Link>
            </li>
            <li aria-hidden="true" className="text-text-secondary/60">›</li>
            <li>
              <Link to="/sepet" className="font-medium text-primary hover:text-accent-dark">
                Sepetim
              </Link>
            </li>
            <li aria-hidden="true" className="text-text-secondary/60">›</li>
            <li aria-current="page" className="text-text-secondary">Ödeme</li>
          </ol>
        </nav>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-primary md:text-4xl">
          Siparişi Tamamla
        </h1>

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* Form */}
          <div className="flex-1 space-y-6">
            <fieldset className="rounded-2xl border border-border bg-white p-6 shadow-card">
              <legend className="px-2 text-sm font-bold uppercase tracking-wider text-text-secondary">
                İletişim Bilgileri
              </legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Ad Soyad" required error={errors.customerName} className="sm:col-span-2">
                  <input {...inputProps} value={form.customerName} onChange={update('customerName')} autoComplete="name" />
                </Field>
                <Field label="Telefon" required error={errors.customerPhone}>
                  <input {...inputProps} value={form.customerPhone} onChange={update('customerPhone')} inputMode="tel" autoComplete="tel" placeholder="05XX XXX XX XX" />
                </Field>
                <Field label="E-posta (opsiyonel)" error={errors.customerEmail}>
                  <input {...inputProps} type="email" value={form.customerEmail} onChange={update('customerEmail')} autoComplete="email" />
                </Field>
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-border bg-white p-6 shadow-card">
              <legend className="px-2 text-sm font-bold uppercase tracking-wider text-text-secondary">
                Teslimat Adresi
              </legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="İl" required error={errors.city}>
                  <input {...inputProps} value={form.city} onChange={update('city')} autoComplete="address-level1" />
                </Field>
                <Field label="İlçe" required error={errors.district}>
                  <input {...inputProps} value={form.district} onChange={update('district')} autoComplete="address-level2" />
                </Field>
                <Field label="Açık Adres" required error={errors.addressLine} className="sm:col-span-2">
                  <textarea
                    rows={3}
                    value={form.addressLine}
                    onChange={update('addressLine')}
                    autoComplete="street-address"
                    className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-primary placeholder:text-text-secondary/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </Field>
                <Field label="Sipariş notu (opsiyonel)" className="sm:col-span-2">
                  <textarea
                    rows={2}
                    value={form.note}
                    onChange={update('note')}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-primary placeholder:text-text-secondary/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </Field>
              </div>
            </fieldset>

            <div className="rounded-xl border border-border bg-white p-4 text-xs leading-relaxed text-text-secondary shadow-card">
              <strong className="text-primary">Ödeme:</strong> Siparişin alındıktan sonra
              ekibimiz seni telefonla arayıp ödeme (havale/EFT veya kapıda) ve teslimat
              detaylarını netleştirir. Bu adımda kart bilgisi alınmaz.
            </div>
          </div>

          {/* Summary */}
          <aside className="lg:w-80 lg:shrink-0">
            <div className="rounded-2xl border border-border bg-white p-6 shadow-card">
              <h2 className="text-lg font-bold text-primary">Sipariş Özeti</h2>

              <ul className="mt-4 space-y-3 border-b border-border pb-4">
                {items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3 text-sm">
                    <span className="text-text-secondary">
                      <span className="font-semibold text-primary">{item.quantity}×</span>{' '}
                      {item.name}
                    </span>
                    <span className="shrink-0 font-bold text-primary">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Ara toplam</dt>
                  <dd className="font-bold text-primary">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Kargo</dt>
                  <dd className="font-bold text-primary">
                    {shipping === 0 ? 'Ücretsiz' : formatPrice(shipping)}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex justify-between border-t border-border pt-4">
                <span className="text-base font-bold text-primary">Toplam</span>
                <span className="text-xl font-extrabold text-primary">{formatPrice(total)}</span>
              </div>

              {formError && (
                <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-base font-bold text-primary shadow-sm transition-colors hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Gönderiliyor…' : 'Siparişi Onayla'}
              </button>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}

const inputProps = {
  type: 'text',
  className:
    'w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-primary placeholder:text-text-secondary/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30',
} as const;

function Field({
  label,
  required,
  error,
  className = '',
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-primary">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs font-semibold text-danger">{error}</span>}
    </label>
  );
}
