import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { adminAuth, AdminApiError } from '../admin/adminApi';
import AdminDashboard from '../admin/AdminDashboard';
import AdminProducts from '../admin/AdminProducts';
import AdminOrders from '../admin/AdminOrders';
import AdminTaxonomy from '../admin/AdminTaxonomy';
import AdminSync from '../admin/AdminSync';
import { btnGhost, btnPrimary, inputCls, labelCls, Spinner } from '../admin/ui';

type Section = 'dashboard' | 'products' | 'orders' | 'taxonomy' | 'sync';
type AuthState = 'checking' | 'in' | 'out';

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Genel Bakış', icon: '▣' },
  { id: 'products', label: 'Ürünler', icon: '▢' },
  { id: 'orders', label: 'Siparişler', icon: '◷' },
  { id: 'taxonomy', label: 'Katalog Yapısı', icon: '⛁' },
  { id: 'sync', label: 'Senkron', icon: '⟳' },
];

export default function Admin() {
  const [auth, setAuth] = useState<AuthState>('checking');
  const [section, setSection] = useState<Section>('dashboard');

  useEffect(() => {
    adminAuth
      .me()
      .then(() => setAuth('in'))
      .catch(() => setAuth('out'));
  }, []);

  async function logout() {
    try {
      await adminAuth.logout();
    } catch {
      /* ignore */
    }
    setAuth('out');
  }

  if (auth === 'checking') {
    return (
      <div className="bg-surface">
        <div className="container-x py-20">
          <Spinner label="Oturum kontrol ediliyor…" />
        </div>
      </div>
    );
  }

  if (auth === 'out') {
    return <AdminLogin onSuccess={() => setAuth('in')} />;
  }

  return (
    <div className="bg-surface">
      <div className="container-x py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Sidebar */}
          <aside className="lg:w-60 lg:shrink-0">
            <div className="rounded-2xl border border-border bg-white p-4 shadow-card">
              <p className="px-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
                Admin Paneli
              </p>
              <nav className="mt-3 space-y-1">
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSection(s.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${
                      section === s.id
                        ? 'bg-primary text-white'
                        : 'text-text-secondary hover:bg-surface hover:text-primary'
                    }`}
                  >
                    <span aria-hidden="true" className="text-base">{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </nav>
              <div className="mt-4 space-y-2 border-t border-border pt-4">
                <Link to="/" className={btnGhost + ' w-full'}>↗ Mağazaya git</Link>
                <button type="button" onClick={logout} className={btnGhost + ' w-full !text-danger'}>
                  Çıkış yap
                </button>
              </div>
            </div>
          </aside>

          {/* Content */}
          <main className="min-w-0 flex-1">
            <div className="rounded-2xl border border-border bg-white p-6 shadow-card sm:p-8">
              {section === 'dashboard' && <AdminDashboard onAuthError={() => setAuth('out')} />}
              {section === 'products' && <AdminProducts onAuthError={() => setAuth('out')} />}
              {section === 'orders' && <AdminOrders onAuthError={() => setAuth('out')} />}
              {section === 'taxonomy' && <AdminTaxonomy onAuthError={() => setAuth('out')} />}
              {section === 'sync' && <AdminSync onAuthError={() => setAuth('out')} />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await adminAuth.login(username, password);
      onSuccess();
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 401) {
        setError('Kullanıcı adı veya şifre hatalı.');
      } else {
        setError('Giriş yapılamadı. Lütfen tekrar deneyin.');
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-surface">
      <div className="container-x flex min-h-[70vh] items-center justify-center py-12">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-border bg-white p-8 shadow-card">
            <h1 className="text-2xl font-bold text-primary">Admin Girişi</h1>
            <p className="mt-1.5 text-sm text-text-secondary">
              GES MARKETİM yönetim paneline erişmek için giriş yap.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className={labelCls}>Kullanıcı Adı</label>
                <input
                  className={inputCls}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
              </div>
              <div>
                <label className={labelCls}>Şifre</label>
                <input
                  type="password"
                  className={inputCls}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
                  {error}
                </p>
              )}

              <button type="submit" className={btnPrimary + ' w-full !py-2.5'} disabled={submitting}>
                {submitting ? 'Giriş yapılıyor…' : 'Giriş Yap'}
              </button>
            </form>
          </div>
          <p className="mt-4 text-center">
            <Link to="/" className="text-sm font-semibold text-primary hover:text-accent-dark">
              ← Mağazaya dön
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
