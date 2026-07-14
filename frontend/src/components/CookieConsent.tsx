import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// KVKK uyumlu çerez onay banner'ı.
// Mobil: min 44px dokunma hedefi, iOS safe-area-inset-bottom, alt sabit konum.
// Onay localStorage'da 6 ay saklanır; süre dolunca yeniden sorulur.

export type ConsentState = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
};

const CONSENT_KEY = 'gesmarketim.cookie_consent_v1';
const CONSENT_TTL_MS = 1000 * 60 * 60 * 24 * 180; // 6 ay

export function getStoredConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as ConsentState;
    if (Date.now() - data.timestamp > CONSENT_TTL_MS) {
      localStorage.removeItem(CONSENT_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function saveConsent(state: Pick<ConsentState, 'analytics' | 'marketing'>): ConsentState {
  const full: ConsentState = {
    necessary: true,
    analytics: state.analytics,
    marketing: state.marketing,
    timestamp: Date.now(),
  };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(full));
  } catch {
    /* localStorage kapalıysa banner her oturumda görünür — kabul edilebilir */
  }
  return full;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3">
      <span className="text-sm font-semibold text-text-primary">{label}</span>
      <span className="relative inline-flex flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-border transition-colors peer-checked:bg-primary after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
      </span>
    </label>
  );
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      setShowBanner(true);
    } else {
      setAnalytics(stored.analytics);
      setMarketing(stored.marketing);
    }
  }, []);

  function apply(a: boolean, m: boolean) {
    saveConsent({ analytics: a, marketing: m });
    setAnalytics(a);
    setMarketing(m);
    setShowBanner(false);
    setShowSettings(false);
  }

  if (!showBanner && !showSettings) return null;

  return (
    <>
      {showBanner && !showSettings && (
        <div
          role="dialog"
          aria-label="Çerez tercihleri"
          className="fixed inset-x-0 bottom-0 z-[2000] px-4"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-white p-5 shadow-card">
            <h3 className="mb-1 text-base font-bold text-text-primary">🍪 Çerezler Hakkında</h3>
            <p className="text-sm leading-relaxed text-text-secondary">
              Deneyiminizi geliştirmek için çerezler kullanıyoruz. KVKK kapsamında onayınızı talep
              ediyoruz; zorunlu çerezler için onay gerekmez. Detaylar:{' '}
              <Link to="/cerez-politikasi" className="font-semibold text-primary underline underline-offset-2">
                Çerez Politikası
              </Link>{' '}
              ·{' '}
              <Link to="/kvkk" className="font-semibold text-primary underline underline-offset-2">
                KVKK Aydınlatma Metni
              </Link>
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => apply(false, false)}
                className="min-h-[44px] rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-surface"
              >
                Reddet
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="min-h-[44px] rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-surface"
              >
                Tercihler
              </button>
              <button
                onClick={() => apply(true, true)}
                className="min-h-[44px] rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white transition hover:bg-primary-light"
              >
                Tümünü Kabul Et
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-settings-title"
          className="fixed inset-0 z-[2100] flex items-end justify-center bg-primary-dark/60 sm:items-center sm:p-4"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-card sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 id="cookie-settings-title" className="text-lg font-bold text-text-primary">
                Çerez Tercihleri
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                aria-label="Kapat"
                className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-text-secondary transition hover:bg-surface"
              >
                ×
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-2">
                <span className="text-sm font-semibold text-text-primary">Zorunlu Çerezler</span>
                <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
                  Her zaman aktif
                </span>
              </div>
              <div className="rounded-xl border border-border px-4 py-2">
                <Toggle checked={analytics} onChange={setAnalytics} label="Analitik Çerezler" />
                <p className="pb-2 text-xs leading-relaxed text-text-secondary">
                  Anonim site kullanım istatistikleri için kullanılır.
                </p>
              </div>
              <div className="rounded-xl border border-border px-4 py-2">
                <Toggle checked={marketing} onChange={setMarketing} label="Pazarlama Çerezleri" />
                <p className="pb-2 text-xs leading-relaxed text-text-secondary">
                  Reklam kampanyalarının performans ölçümü için kullanılır.
                </p>
              </div>
            </div>
            <div
              className="flex flex-col gap-2 border-t border-border px-6 py-4 sm:flex-row"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              <button
                onClick={() => apply(false, false)}
                className="min-h-[48px] flex-1 rounded-full border border-border px-4 py-3 text-sm font-semibold text-text-primary transition hover:bg-surface"
              >
                Reddet
              </button>
              <button
                onClick={() => apply(analytics, marketing)}
                className="min-h-[48px] flex-1 rounded-full bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-light"
              >
                Tercihleri Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
