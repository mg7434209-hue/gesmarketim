type FulfillmentType = 'stock' | 'order';

type FulfillmentColumn = {
  type: FulfillmentType;
  badgeLabel: string;
  duration: string;
  title: string;
  description: string;
  bullets: string[];
  Icon: () => JSX.Element;
};

const COLUMNS: FulfillmentColumn[] = [
  {
    type: 'stock',
    badgeLabel: 'Stokta',
    duration: '1-2 iş günü',
    title: 'Manavgat deposundan hızlı kargo',
    description:
      'Ödeme alındıktan sonra aynı gün gönderim. Anlaşmalı kargo firmalarıyla Türkiye geneli teslimat.',
    bullets: [
      'Stok onayı anında',
      'Aynı gün kargo (16:00 öncesi)',
      'Kargo takibi e-posta ile paylaşılır',
    ],
    Icon: WarehouseIcon,
  },
  {
    type: 'order',
    badgeLabel: 'Siparişe özel',
    duration: '5-7 iş günü',
    title: 'Tedarikçi deposundan direkt sevkiyat',
    description:
      'Stok onayı sonrası kargo bilgisi paylaşılır. Büyük hacimli ve özel ürünlerde uygulanır.',
    bullets: [
      'Stok onayı 24 saat içinde',
      'Tedarikçiden direkt kargo',
      'Toplu sipariş indirimi mümkün',
    ],
    Icon: TruckIcon,
  },
];

export default function HybridInfo() {
  return (
    <section
      aria-label="Sipariş türlerimiz"
      className="border-b border-border bg-white"
    >
      <div className="container-x py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
            Sipariş türlerimiz
          </h2>
          <p className="mt-3 text-base text-text-secondary md:text-lg">
            Her ürün için net teslim süresi. Sipariş öncesinde teslimat tipi açıkça belirtilir.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:mt-14 md:grid-cols-2 md:gap-8">
          {COLUMNS.map((col) => (
            <FulfillmentCard key={col.type} column={col} />
          ))}
        </div>
      </div>
    </section>
  );
}

type FulfillmentCardProps = { column: FulfillmentColumn };

function FulfillmentCard({ column }: FulfillmentCardProps) {
  const isStock = column.type === 'stock';
  const Icon = column.Icon;

  const gradient = isStock
    ? 'bg-gradient-to-br from-emerald-50 via-white to-white'
    : 'bg-gradient-to-br from-amber-50 via-white to-white';

  const badgeClass = isStock
    ? 'bg-success/15 text-success ring-success/20'
    : 'bg-warning/15 text-warning ring-warning/20';

  const iconClass = isStock
    ? 'bg-success/15 text-success'
    : 'bg-warning/15 text-warning';

  const bulletColor = isStock ? 'text-success' : 'text-warning';

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border-2 border-border p-7 shadow-card transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent hover:shadow-lg sm:p-9 ${gradient}`}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ring-1 ring-inset ${badgeClass}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isStock ? 'bg-success' : 'bg-warning'
            }`}
            aria-hidden="true"
          />
          {column.badgeLabel}
        </span>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon />
        </div>
      </div>

      <p className="mt-6 text-4xl font-extrabold leading-tight text-primary sm:text-5xl">
        {column.duration}
      </p>
      <h3 className="mt-3 text-lg font-bold text-primary sm:text-xl">
        {column.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary sm:text-base">
        {column.description}
      </p>

      <ul className="mt-6 space-y-2 border-t border-border/70 pt-5">
        {column.bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2.5 text-sm text-text-secondary">
            <span className={`mt-0.5 shrink-0 ${bulletColor}`} aria-hidden="true">
              <CheckIcon />
            </span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function WarehouseIcon() {
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
      <path d="M3 9 12 4l9 5v11H3V9Z" />
      <rect x="8" y="13" width="8" height="7" />
      <line x1="8" y1="16.5" x2="16" y2="16.5" />
    </svg>
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

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
