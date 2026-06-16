import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useCustomer } from '../auth/CustomerContext';
import { AccountError, getMyOrders, type CustomerOrder } from '../lib/api';
import { formatPrice } from '../components/product-ui';
import { useSeo } from '../lib/seo';

const INPUT =
  'w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-primary placeholder:text-text-secondary/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Alındı — onay bekliyor',
  confirmed: 'Onaylandı',
  shipped: 'Kargoya verildi',
  delivered: 'Teslim edildi',
  cancelled: 'İptal edildi',
};

export default function Account() {
  useSeo({ title: 'Hesabım', path: '/hesabim', noindex: true });
  const { customer, loading } = useCustomer();

  return (
    <div className="bg-surface">
      <div className="container-x py-12">
        <Breadcrumb />
        {loading ? (
          <div className="mt-8 h-40 animate-pulse rounded-2xl border border-border bg-white" />
        ) : customer ? (
          <Dashboard />
        ) : (
          <AuthPanel />
        )}
      </div>
    </div>
  );
}

function Breadcrumb() {
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
          Hesabım
        </li>
      </ol>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Logged-out: login / register tabs
// ---------------------------------------------------------------------------

function AuthPanel() {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  return (
    <div className="mx-auto mt-8 max-w-md">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-white p-1 shadow-card">
        <TabButton active={mode === 'login'} onClick={() => setMode('login')}>
          Giriş Yap
        </TabButton>
        <TabButton active={mode === 'register'} onClick={() => setMode('register')}>
          Kayıt Ol
        </TabButton>
      </div>
      <div className="mt-4 rounded-2xl border border-border bg-white p-6 shadow-card">
        {mode === 'login' ? <LoginForm /> : <RegisterForm />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
        active ? 'bg-accent text-primary' : 'text-text-secondary hover:bg-surface'
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-primary">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs font-semibold text-danger">{error}</span>}
    </label>
  );
}

function LoginForm() {
  const { login } = useCustomer();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof AccountError ? err.message : 'Giriş yapılamadı.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="E-posta">
        <input
          type="email"
          autoComplete="email"
          className={INPUT}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>
      <Field label="Parola">
        <input
          type="password"
          autoComplete="current-password"
          className={INPUT}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>
      {error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
        {busy ? 'Giriş yapılıyor…' : 'Giriş Yap'}
      </button>
    </form>
  );
}

function RegisterForm() {
  const { register } = useCustomer();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setFields({});
    setBusy(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      });
    } catch (err) {
      if (err instanceof AccountError) {
        setError(err.message);
        if (err.fields) setFields(err.fields);
      } else {
        setError('Kayıt oluşturulamadı.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Ad Soyad" error={fields.name}>
        <input className={INPUT} value={form.name} onChange={(e) => set('name', e.target.value)} required />
      </Field>
      <Field label="E-posta" error={fields.email}>
        <input
          type="email"
          autoComplete="email"
          className={INPUT}
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          required
        />
      </Field>
      <Field label="Telefon (opsiyonel)" error={fields.phone}>
        <input
          type="tel"
          autoComplete="tel"
          className={INPUT}
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
        />
      </Field>
      <Field label="Parola (en az 8 karakter)" error={fields.password}>
        <input
          type="password"
          autoComplete="new-password"
          className={INPUT}
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
          required
        />
      </Field>
      {error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
        {busy ? 'Hesap oluşturuluyor…' : 'Kayıt Ol'}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Logged-in: profile + order history
// ---------------------------------------------------------------------------

function Dashboard() {
  const { customer, logout } = useCustomer();

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <ProfileCard />
        <button
          type="button"
          onClick={() => void logout()}
          className="btn-secondary mt-4 w-full"
        >
          Çıkış Yap
        </button>
      </div>
      <div className="lg:col-span-2">
        <h1 className="text-xl font-extrabold text-primary">
          Merhaba, {customer?.name.split(' ')[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-text-secondary">Sipariş geçmişiniz aşağıdadır.</p>
        <OrderHistory />
      </div>
    </div>
  );
}

function ProfileCard() {
  const { customer, saveProfile } = useCustomer();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: customer?.name ?? '',
    phone: customer?.phone ?? '',
    defaultCity: customer?.defaultCity ?? '',
    defaultDistrict: customer?.defaultDistrict ?? '',
    defaultAddress: customer?.defaultAddress ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      await saveProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
        defaultCity: form.defaultCity.trim(),
        defaultDistrict: form.defaultDistrict.trim(),
        defaultAddress: form.defaultAddress.trim(),
      });
      setMsg('Kaydedildi.');
      setEditing(false);
    } catch (err) {
      setMsg(err instanceof AccountError ? err.message : 'Kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  }

  if (!customer) return null;

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Profil</h2>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-accent-dark hover:underline"
          >
            Düzenle
          </button>
        )}
      </div>

      {!editing ? (
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Ad Soyad" value={customer.name} />
          <Row label="E-posta" value={customer.email} />
          <Row label="Telefon" value={customer.phone || '—'} />
          <Row
            label="Adres"
            value={
              customer.defaultAddress
                ? `${customer.defaultAddress}, ${customer.defaultDistrict ?? ''} ${customer.defaultCity ?? ''}`.trim()
                : '—'
            }
          />
        </dl>
      ) : (
        <form onSubmit={onSave} className="mt-4 space-y-3">
          <input className={INPUT} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ad Soyad" />
          <input className={INPUT} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Telefon" />
          <input className={INPUT} value={form.defaultCity} onChange={(e) => set('defaultCity', e.target.value)} placeholder="İl" />
          <input className={INPUT} value={form.defaultDistrict} onChange={(e) => set('defaultDistrict', e.target.value)} placeholder="İlçe" />
          <textarea
            className={INPUT}
            rows={2}
            value={form.defaultAddress}
            onChange={(e) => set('defaultAddress', e.target.value)}
            placeholder="Açık adres"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn-primary flex-1 disabled:opacity-60">
              {busy ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
              Vazgeç
            </button>
          </div>
        </form>
      )}
      {msg && <p className="mt-3 text-xs font-semibold text-success">{msg}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="text-right font-medium text-primary">{value}</dd>
    </div>
  );
}

function OrderHistory() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [orders, setOrders] = useState<CustomerOrder[]>([]);

  useEffect(() => {
    let active = true;
    getMyOrders()
      .then((o) => active && (setOrders(o), setStatus('ready')))
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, []);

  if (status === 'loading')
    return <div className="mt-5 h-32 animate-pulse rounded-2xl border border-border bg-white" />;
  if (status === 'error')
    return (
      <p className="mt-5 rounded-2xl border border-border bg-white p-6 text-sm text-danger">
        Siparişler yüklenemedi.
      </p>
    );
  if (orders.length === 0)
    return (
      <div className="mt-5 rounded-2xl border border-border bg-white p-8 text-center">
        <p className="text-sm text-text-secondary">Henüz siparişiniz yok.</p>
        <Link to="/urunler" className="btn-primary mt-4">
          Alışverişe başla
        </Link>
      </div>
    );

  return (
    <div className="mt-5 space-y-3">
      {orders.map((o) => (
        <Link
          key={o.orderNumber}
          to={`/siparis/${o.orderNumber}`}
          className="block rounded-2xl border border-border bg-white p-5 shadow-card transition-colors hover:border-accent"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-bold text-primary">{o.orderNumber}</p>
              <p className="text-xs text-text-secondary">
                {new Date(o.createdAt).toLocaleDateString('tr-TR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
                · {o.items.length} ürün
              </p>
            </div>
            <div className="text-right">
              <p className="font-extrabold text-primary">{formatPrice(o.total)}</p>
              <span className="text-xs font-semibold text-accent-dark">
                {STATUS_LABEL[o.status] ?? o.status}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
