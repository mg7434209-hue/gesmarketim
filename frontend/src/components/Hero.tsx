import { Link } from 'react-router-dom';
import { WHATSAPP_URL } from '../config';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary text-white">
      {/* Flowing gradient backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(1100px 520px at 82% -8%, rgba(245,184,0,0.22), transparent 60%), radial-gradient(900px 600px at 8% 110%, rgba(30,58,111,0.55), transparent 60%), linear-gradient(160deg, #0A1A33 0%, #0F2547 45%, #15315c 100%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-32 -right-24 h-96 w-96 animate-float rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-80 w-80 animate-float-slow rounded-full bg-primary-light/40 blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 h-72 w-72 animate-drift rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="container-x relative py-14 sm:py-20 lg:py-28">
        <div className="relative z-10 grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent ring-1 ring-inset ring-white/15 backdrop-blur">
              <span className="h-1.5 w-1.5 animate-sun rounded-full bg-accent" aria-hidden="true" />
              Solar e-ticaret
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Güneşten gelen güç,{' '}
              <span className="bg-gradient-to-r from-accent to-amber-300 bg-clip-text text-transparent">
                tedarikçi fiyatına
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
              Güneş paneli, inverter, batarya ve aksesuarlarda KDV dahil net fiyat.
              Stoklu hızlı kargo veya siparişe özel tedarik — ikisi de aynı çatı altında.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
              <Link to="/kategoriler" className="btn-primary text-base shadow-lg shadow-accent/20">
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
                <dt className="text-xs font-medium uppercase tracking-wider text-white/60">KDV</dt>
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

          <div className="lg:col-span-6">
            <SolarScene />
          </div>
        </div>
      </div>

      {/* Fluid wave transition into the next (surface) section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0" aria-hidden="true">
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="block h-[60px] w-full sm:h-[90px]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,64 C240,128 480,16 720,40 C960,64 1200,120 1440,72 L1440,120 L0,120 Z"
            fill="#F8F9FB"
          />
        </svg>
      </div>
    </section>
  );
}

/* A layered, photographic-feeling solar scene built entirely in SVG so it
   renders crisply at any size with no external image dependency. */
function SolarScene() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      {/* Floating feature chips */}
      <div className="absolute -left-3 top-6 z-10 animate-float-slow rounded-xl bg-white/95 px-3 py-2 shadow-card backdrop-blur sm:-left-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent-dark">
          %100 Yeşil
        </p>
        <p className="text-xs font-semibold text-primary">Temiz enerji</p>
      </div>
      <div className="absolute -right-2 bottom-10 z-10 animate-float rounded-xl bg-white/95 px-3 py-2 shadow-card backdrop-blur sm:-right-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-success">Anahtar teslim</p>
        <p className="text-xs font-semibold text-primary">Kurulum desteği</p>
      </div>

      <div className="overflow-hidden rounded-[28px] ring-1 ring-white/15 shadow-2xl">
        <svg
          viewBox="0 0 480 440"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          focusable="false"
          className="h-full w-full"
        >
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FCE9A8" />
              <stop offset="38%" stopColor="#F4B976" />
              <stop offset="100%" stopColor="#6E7FB0" />
            </linearGradient>
            <radialGradient id="sunCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFF7DC" />
              <stop offset="60%" stopColor="#FFD23F" />
              <stop offset="100%" stopColor="#F5B800" />
            </radialGradient>
            <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFD23F" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#FFD23F" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="hillBack" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3E7D4F" />
              <stop offset="100%" stopColor="#2F6340" />
            </linearGradient>
            <linearGradient id="hillFront" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4F9A5F" />
              <stop offset="100%" stopColor="#3C7A4B" />
            </linearGradient>
            <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#26508f" />
              <stop offset="55%" stopColor="#173863" />
              <stop offset="100%" stopColor="#0F2547" />
            </linearGradient>
            <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
              <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Sky */}
          <rect width="480" height="440" fill="url(#sky)" />

          {/* Sun + animated glow & rays */}
          <circle
            cx="350"
            cy="120"
            r="120"
            fill="url(#sunGlow)"
            className="animate-sun"
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
          <g
            className="animate-spin-slow"
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          >
            <g stroke="#FFE38A" strokeWidth="5" strokeLinecap="round" opacity="0.85">
              <line x1="350" y1="22" x2="350" y2="48" />
              <line x1="350" y1="192" x2="350" y2="218" />
              <line x1="252" y1="120" x2="278" y2="120" />
              <line x1="422" y1="120" x2="448" y2="120" />
              <line x1="281" y1="51" x2="299" y2="69" />
              <line x1="401" y1="171" x2="419" y2="189" />
              <line x1="419" y1="51" x2="401" y2="69" />
              <line x1="299" y1="171" x2="281" y2="189" />
            </g>
          </g>
          <circle cx="350" cy="120" r="50" fill="url(#sunCore)" />

          {/* Soft clouds */}
          <g fill="#ffffff" opacity="0.55">
            <ellipse cx="120" cy="86" rx="46" ry="16" />
            <ellipse cx="150" cy="74" rx="30" ry="13" />
            <ellipse cx="86" cy="150" rx="34" ry="11" opacity="0.7" />
          </g>

          {/* Hills */}
          <path d="M0,300 C120,250 220,290 320,268 C400,250 450,272 480,262 L480,440 L0,440 Z" fill="url(#hillBack)" />
          <path d="M0,348 C140,308 260,360 360,340 C420,328 460,346 480,338 L480,440 L0,440 Z" fill="url(#hillFront)" />

          {/* Solar panel array (perspective) with grid + sheen */}
          <g>
            {/* support legs */}
            <rect x="96" y="356" width="9" height="46" rx="2" fill="#22364f" />
            <rect x="356" y="356" width="9" height="46" rx="2" fill="#22364f" />
            {/* tilted panel surface */}
            <path d="M70,360 L300,300 L420,332 L190,392 Z" fill="url(#panel)" stroke="#0A1A33" strokeWidth="3" />
            {/* cell grid */}
            <g stroke="#5b86c4" strokeOpacity="0.5" strokeWidth="1.5">
              <path d="M127,345 L247,377" />
              <path d="M184,330 L304,362" />
              <path d="M241,315 L361,347" />
              <path d="M145,378 L375,318" />
              <path d="M118,371 L348,311" />
            </g>
            {/* sheen highlight */}
            <path d="M70,360 L300,300 L335,309 L105,369 Z" fill="url(#sheen)" />
          </g>
        </svg>
      </div>
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
