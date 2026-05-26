import { Link } from 'react-router-dom';

const UPCOMING_FEATURES = [
  {
    title: 'Ürün Yönetimi',
    description: 'Toplu ürün ekleme, fiyat güncelleme, görsel yükleme.',
  },
  {
    title: 'Sipariş Takibi',
    description: 'Stok / siparişe özel ayrımı, kargo durumu, müşteri iletişimi.',
  },
  {
    title: 'Marj Kuralları',
    description: 'Tedarikçi bazlı, kategori bazlı yüzdesel ve manuel fiyat kuralları.',
  },
  {
    title: 'Tedarikçi Yönetimi',
    description: 'Mexxsun, Enerji Pazarı gibi tedarikçilerin ürün listesi yönetimi.',
  },
];

export default function Admin() {
  return (
    <div className="bg-surface">
      <div className="container-x py-10 sm:py-14">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-accent-dark"
        >
          <span aria-hidden="true">←</span> Siteye dön
        </Link>

        <header className="mt-8 rounded-2xl border border-border bg-white p-8 shadow-card sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-warning/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-warning ring-1 ring-inset ring-warning/20">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
            Yapım aşamasında
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-primary md:text-4xl">
            Admin Paneli
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-text-secondary md:text-lg">
            Admin paneli henüz hazır değil. Yakında: ürün yönetimi, sipariş takibi, marj
            kuralları ve tedarikçi yönetimi burada olacak.
          </p>
        </header>

        <section className="mt-10" aria-label="Yakında eklenecek özellikler">
          <h2 className="text-lg font-bold text-primary sm:text-xl">Yol haritası</h2>
          <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {UPCOMING_FEATURES.map((feature) => (
              <li
                key={feature.title}
                className="rounded-xl border border-border bg-white p-5 shadow-card"
              >
                <h3 className="text-base font-bold text-primary">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                  {feature.description}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
