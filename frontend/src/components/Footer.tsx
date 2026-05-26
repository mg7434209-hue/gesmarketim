import { Link } from 'react-router-dom';
import Logo from './Logo';
import { WHATSAPP_URL, WHATSAPP_DISPLAY } from '../config';

type FooterLink = { label: string; to?: string; href?: string; external?: boolean };

const QUICK_LINKS: FooterLink[] = [
  { label: 'Anasayfa', to: '/' },
  { label: 'Kategoriler', to: '/kategoriler' },
  { label: 'Hakkımızda', to: '/hakkimizda' },
  { label: 'İletişim', to: '/iletisim' },
];

const SUPPORT_LINKS: FooterLink[] = [
  { label: 'İade ve Değişim', to: '/iade-degisim' },
  { label: 'Kargo ve Teslimat', to: '/kargo' },
  { label: 'Sıkça Sorulan Sorular', to: '/sss' },
];

const LEGAL_LINKS: FooterLink[] = [
  { label: 'KVKK Aydınlatma Metni', to: '/kvkk' },
  { label: 'Mesafeli Satış Sözleşmesi', to: '/mesafeli-satis' },
  { label: 'Çerez Politikası', to: '/cerez-politikasi' },
  { label: 'Ön Bilgilendirme Formu', to: '/on-bilgilendirme' },
];

export default function Footer() {
  return (
    <footer className="bg-primary text-white">
      <div className="container-x py-14 sm:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-12 lg:grid-cols-4">
          <section aria-label="GES MARKETİM hakkında">
            <FooterLogo />
            <p className="mt-5 text-sm leading-relaxed text-white/70">
              GES MARKETİM, solar ürünleri uygun fiyatla sunan online mağazadır. Güneş paneli,
              inverter, batarya ve kurulum aksesuarlarında tedarikçi fiyatına alışveriş.
            </p>
            <p className="mt-4 text-xs text-white/50">Manavgat · Antalya · Türkiye</p>
          </section>

          <FooterColumn title="Hızlı Linkler" links={QUICK_LINKS} />

          <section aria-label="Müşteri hizmetleri">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Müşteri Hizmetleri
            </h3>
            <ul className="mt-5 space-y-3 text-sm text-white/70">
              <li>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-medium text-white transition-colors hover:text-accent"
                >
                  <WhatsAppIcon />
                  WhatsApp: {WHATSAPP_DISPLAY}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <ClockIcon />
                <span>Pzt-Cmt 09:00-18:00</span>
              </li>
              {SUPPORT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to!}
                    className="transition-colors hover:text-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <FooterColumn title="Yasal" links={LEGAL_LINKS} />
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} GES MARKETİM. Tüm hakları saklıdır.
          </p>
          <p className="text-white/50">
            Kurulum hizmeti için bağımsız referansımız:{' '}
            <a
              href="https://gespaenerji.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white/80 transition-colors hover:text-accent"
            >
              GespaEnerji
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

type FooterColumnProps = { title: string; links: FooterLink[] };

function FooterColumn({ title, links }: FooterColumnProps) {
  return (
    <section aria-label={title}>
      <h3 className="text-sm font-bold uppercase tracking-wider text-white">{title}</h3>
      <ul className="mt-5 space-y-3 text-sm text-white/70">
        {links.map((link) => (
          <li key={link.label}>
            {link.to ? (
              <Link to={link.to} className="transition-colors hover:text-accent">
                {link.label}
              </Link>
            ) : (
              <a
                href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                className="transition-colors hover:text-accent"
              >
                {link.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function FooterLogo() {
  return (
    <div className="rounded-lg bg-white/95 p-3 shadow-sm">
      <Logo size="sm" showTagline />
    </div>
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

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="mt-0.5 shrink-0"
    >
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  );
}
