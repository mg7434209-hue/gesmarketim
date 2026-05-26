import { Link } from 'react-router-dom';
import { WHATSAPP_URL } from '../config';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-80 w-80 rounded-full bg-primary-light/40 blur-3xl" />
      </div>

      <div className="container-x relative py-14 sm:py-20 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent ring-1 ring-inset ring-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              Solar e-ticaret
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Solar ürünleri{' '}
              <span className="text-accent">tedarikçi fiyatına</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
              Güneş paneli, inverter, batarya ve aksesuarlarda KDV dahil net fiyat.
              Stoklu hızlı kargo veya siparişe özel tedarik — ikisi de aynı çatı altında.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
              <Link to="/kategoriler" className="btn-primary text-base">
                Ürünleri Keşfet
                <ArrowIcon />
              </Link>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-white hover:text-accent"
              >
                <WhatsAppIcon />
                WhatsApp ile sor
                <span aria-hidden="true">→</span>
              </a>
            </div>

            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-white/10 pt-6">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-white/60">
                  Ürün çeşidi
                </dt>
                <dd className="mt-1 text-2xl font-extrabold text-white">500+</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-white/60">
                  KDV
                </dt>
                <dd className="mt-1 text-2xl font-extrabold text-white">Dahil</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-white/60">
                  Kargo
                </dt>
                <dd className="mt-1 text-2xl font-extrabold text-white">1-2 gün</dd>
              </div>
            </dl>
          </div>

          <div className="hidden lg:col-span-5 lg:block">
            <HeroIllustration />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroIllustration() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      <svg
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        className="h-full w-full"
      >
        <circle cx="280" cy="120" r="64" fill="#F5B800" />
        <g stroke="#F5B800" strokeWidth="6" strokeLinecap="round">
          <line x1="280" y1="28" x2="280" y2="48" />
          <line x1="345.05" y1="54.95" x2="330.91" y2="69.09" />
          <line x1="372" y1="120" x2="352" y2="120" />
          <line x1="345.05" y1="185.05" x2="330.91" y2="170.91" />
          <line x1="280" y1="212" x2="280" y2="192" />
          <line x1="214.95" y1="185.05" x2="229.09" y2="170.91" />
          <line x1="188" y1="120" x2="208" y2="120" />
          <line x1="214.95" y1="54.95" x2="229.09" y2="69.09" />
        </g>

        <g transform="translate(40 200)">
          <rect width="320" height="160" rx="8" fill="#1E3A6F" stroke="#F5B800" strokeWidth="3" />
          <g stroke="#F5B800" strokeOpacity="0.5" strokeWidth="2">
            <line x1="80" y1="0" x2="80" y2="160" />
            <line x1="160" y1="0" x2="160" y2="160" />
            <line x1="240" y1="0" x2="240" y2="160" />
            <line x1="0" y1="40" x2="320" y2="40" />
            <line x1="0" y1="80" x2="320" y2="80" />
            <line x1="0" y1="120" x2="320" y2="120" />
          </g>
        </g>
        <rect x="195" y="360" width="10" height="32" rx="2" fill="#0A1A33" />
      </svg>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.74.45 3.39 1.31 4.86L2 22l5.34-1.4c1.42.78 3.02 1.19 4.7 1.19 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2Zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23a8.16 8.16 0 0 1-4.1-1.11l-.3-.18-3.05.8.81-2.98-.2-.31a8.264 8.264 0 0 1-1.26-4.4c.01-4.54 3.7-8.24 8.24-8.24Zm-3.51 5.21c-.18 0-.45.06-.69.31-.23.25-.93.91-.93 2.21 0 1.3.95 2.55 1.08 2.72.13.18 1.83 2.93 4.5 4 .63.27 1.13.43 1.51.55.64.2 1.22.17 1.67.1.51-.07 1.6-.65 1.81-1.27.21-.62.21-1.16.15-1.27-.06-.11-.21-.18-.45-.3-.24-.12-1.4-.69-1.61-.77-.21-.08-.37-.12-.52.12-.15.24-.6.77-.74.92-.13.15-.27.17-.51.05-.24-.12-1-.36-1.91-1.18-.71-.63-1.18-1.4-1.32-1.64-.13-.24-.01-.37.11-.5.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.31-.02-.43-.06-.12-.51-1.32-.74-1.79-.2-.41-.4-.41-.54-.42-.14 0-.3-.01-.46-.01Z" />
    </svg>
  );
}
