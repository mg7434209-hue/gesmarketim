type Badge = {
  title: string;
  description: string;
  Icon: () => JSX.Element;
};

const BADGES: Badge[] = [
  {
    title: 'Stokta Hızlı Kargo',
    description: 'Stoklu ürünler 1-2 iş günü içinde kargoya verilir.',
    Icon: TruckIcon,
  },
  {
    title: 'Orijinal Ürün',
    description: 'Yalnızca yetkili tedarikçilerden temin edilen orijinal ürünler.',
    Icon: ShieldCheckIcon,
  },
  {
    title: 'KDV Dahil Fiyat',
    description: 'Etiketteki fiyat son fiyattır, sürpriz ek ücret yoktur.',
    Icon: ReceiptIcon,
  },
  {
    title: 'Güvenli Ödeme',
    description: '3D Secure ile korumalı kart ödemesi ve havale seçeneği.',
    Icon: LockIcon,
  },
];

export default function TrustBadges() {
  return (
    <section
      aria-label="Müşteri güvenceleri"
      className="border-b border-border bg-surface"
    >
      <div className="container-x py-10 md:py-12">
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {BADGES.map(({ title, description, Icon }) => (
            <li key={title} className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-primary">
                <Icon />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-primary sm:text-base">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary sm:text-sm">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function TruckIcon() {
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
      <rect x="1" y="6" width="13" height="11" rx="1" />
      <path d="M14 9h4l3 3v5h-7z" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
    </svg>
  );
}

function ShieldCheckIcon() {
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
      <path d="M12 2 4 5v7c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5l-8-3Z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function ReceiptIcon() {
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
      <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3Z" />
      <line x1="9" y1="9" x2="15" y2="9" />
      <line x1="9" y1="13" x2="15" y2="13" />
    </svg>
  );
}

function LockIcon() {
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
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      <circle cx="12" cy="16" r="1.2" fill="currentColor" />
    </svg>
  );
}
