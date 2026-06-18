import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Logo from './Logo';
import SearchBox from './SearchBox';
import { WHATSAPP_URL } from '../config';
import { useCart } from '../cart/CartContext';
import { useCustomer } from '../auth/CustomerContext';

type NavItem = { to: string; label: string };

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Anasayfa' },
  { to: '/urunler', label: 'Ürünler' },
  { to: '/kategoriler', label: 'Kategoriler' },
  { to: '/hakkimizda', label: 'Hakkımızda' },
  { to: '/iletisim', label: 'İletişim' },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { count } = useCart();
  const { customer } = useCustomer();

  return (
    <header className="sticky top-0 z-50 bg-white shadow-header">
      <div className="border-b border-border bg-surface">
        <div className="container-x flex h-9 items-center justify-between gap-4 text-xs text-text-secondary">
          <span className="hidden sm:inline">
            Solar ürünleri tedarikçi fiyatına, KDV dahil
          </span>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 font-medium text-primary hover:text-primary-light"
            aria-label="WhatsApp ile müşteri hizmetlerine ulaşın"
          >
            <WhatsAppIcon />
            <span>Müşteri hizmetleri: WhatsApp</span>
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      <div className="border-b border-border bg-white">
        <div className="container-x flex h-16 items-center justify-between gap-4 md:h-20">
          <Link
            to="/"
            className="flex items-center rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            aria-label="GES MARKETİM anasayfa"
            onClick={() => setMobileOpen(false)}
          >
            <Logo size="md" />
          </Link>

          <nav className="hidden md:block" aria-label="Ana navigasyon">
            <ul className="flex items-center gap-6 lg:gap-8">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `text-sm font-semibold transition-colors ${
                        isActive
                          ? 'text-primary'
                          : 'text-text-secondary hover:text-primary'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden min-w-0 flex-1 px-2 md:block md:max-w-xs lg:max-w-sm">
            <SearchBox />
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              to="/hesabim"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-primary hover:bg-surface focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              aria-label={customer ? 'Hesabım' : 'Giriş yap'}
              onClick={() => setMobileOpen(false)}
            >
              <UserIcon />
              <span className="hidden text-sm font-semibold lg:inline">
                {customer ? customer.name.split(' ')[0] : 'Giriş'}
              </span>
            </Link>
            <Link
              to="/sepet"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-primary hover:bg-surface focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              aria-label={`Sepetim (${count} ürün)`}
              onClick={() => setMobileOpen(false)}
            >
              <CartIcon />
              {count > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-primary"
                  aria-hidden="true"
                >
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Link>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-primary hover:bg-surface focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 md:hidden"
              aria-label={mobileOpen ? 'Menüyü kapat' : 'Menüyü aç'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <nav
          id="mobile-nav"
          className="border-b border-border bg-white md:hidden"
          aria-label="Mobil navigasyon"
        >
          <div className="container-x py-3">
            <SearchBox onNavigate={() => setMobileOpen(false)} />
          </div>
          <ul className="container-x flex flex-col py-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-3 text-base font-semibold ${
                      isActive
                        ? 'bg-surface text-primary'
                        : 'text-text-secondary hover:bg-surface hover:text-primary'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink
                to="/hesabim"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-3 text-base font-semibold ${
                    isActive
                      ? 'bg-surface text-primary'
                      : 'text-text-secondary hover:bg-surface hover:text-primary'
                  }`
                }
              >
                {customer ? 'Hesabım' : 'Giriş / Kayıt'}
              </NavLink>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.74.45 3.39 1.31 4.86L2 22l5.34-1.4c1.42.78 3.02 1.19 4.7 1.19 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2Zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23a8.16 8.16 0 0 1-4.1-1.11l-.3-.18-3.05.8.81-2.98-.2-.31a8.264 8.264 0 0 1-1.26-4.4c.01-4.54 3.7-8.24 8.24-8.24Zm-3.51 5.21c-.18 0-.45.06-.69.31-.23.25-.93.91-.93 2.21 0 1.3.95 2.55 1.08 2.72.13.18 1.83 2.93 4.5 4 .63.27 1.13.43 1.51.55.64.2 1.22.17 1.67.1.51-.07 1.6-.65 1.81-1.27.21-.62.21-1.16.15-1.27-.06-.11-.21-.18-.45-.3-.24-.12-1.4-.69-1.61-.77-.21-.08-.37-.12-.52.12-.15.24-.6.77-.74.92-.13.15-.27.17-.51.05-.24-.12-1-.36-1.91-1.18-.71-.63-1.18-1.4-1.32-1.64-.13-.24-.01-.37.11-.5.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.31-.02-.43-.06-.12-.51-1.32-.74-1.79-.2-.41-.4-.41-.54-.42-.14 0-.3-.01-.46-.01Z" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
