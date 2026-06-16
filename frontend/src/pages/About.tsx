import { Link } from 'react-router-dom';
import { useSeo } from '../lib/seo';

const REASONS = [
  {
    title: 'KDV Dahil Net Fiyat',
    description:
      'Etikette gördüğünüz fiyat ödediğiniz fiyattır. Gizli kargo veya komisyon yoktur.',
  },
  {
    title: 'Orijinal Ürün',
    description:
      'DEYE, LEXRON, EVE, HUAWEI gibi resmi marka ürünleri, doğrudan yetkili tedarikçilerden.',
  },
  {
    title: 'Hızlı Kargo',
    description:
      'Manavgat (Antalya) depomuzdan stoklu ürünler 1-2 iş günü içinde yola çıkar.',
  },
  {
    title: 'Kurumsal Güvence',
    description:
      'GES MARKETİM, Manavgat merkezli Gespa Enerji bünyesinde faaliyet gösteren online satış kanalıdır.',
  },
];

export default function About() {
  useSeo({
    title: 'Hakkımızda',
    description:
      'GES MARKETİM, Manavgat (Antalya) merkezli Gespa Enerji bünyesinde faaliyet gösteren, KDV dahil net fiyatlı online solar satış kanalıdır.',
    path: '/hakkimizda',
  });
  return (
    <div className="bg-white">
      <div className="container-x py-12">
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
              Hakkımızda
            </li>
          </ol>
        </nav>

        <header className="mt-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary ring-1 ring-inset ring-accent/30">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            Hakkımızda
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-primary md:text-4xl">
            GES MARKETİM Hakkında
          </h1>
        </header>

        <section className="mt-10 max-w-3xl space-y-4 text-sm leading-relaxed text-text-secondary sm:text-base">
          <h2 className="text-xl font-bold text-primary sm:text-2xl">Biz kimiz?</h2>
          <p>
            GES MARKETİM; Manavgat (Antalya) merkezli Gespa Enerji bünyesinde faaliyet
            gösteren, solar ürünlerin online satışına odaklanmış bir e-ticaret kanalıdır.
            Güneş paneli, inverter, batarya ve kurulum aksesuarlarını <strong>KDV dahil
            tedarikçi fiyatına</strong> son kullanıcıya ulaştırmak için kurulduk.
          </p>
          <p>
            Sahada uzun yıllardır güneş enerjisi sistemleri uygulayan ekibimizin tecrübesini
            online mağaza disiplinine taşıdık: stoklu ürünlerde hızlı teslimat, siparişe özel
            ürünlerde şeffaf sürede, doğru markayla ve doğru fiyatla.
          </p>
        </section>

        <div className="mt-12 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-border bg-surface p-6 sm:p-7">
            <h2 className="text-lg font-bold text-primary sm:text-xl">Misyon</h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary sm:text-base">
              Türkiye'nin her noktasındaki son kullanıcının, kurumsal projelerde geçerli
              tedarikçi fiyatına kolayca erişmesini sağlamak; solar yatırımının önündeki
              fiyat ve güven engellerini kaldırmak.
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-surface p-6 sm:p-7">
            <h2 className="text-lg font-bold text-primary sm:text-xl">Vizyon</h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary sm:text-base">
              Solar ürünlerde Türkiye'nin en şeffaf ve en hızlı online mağazası olmak; her
              kullanıcının panelden bataryaya tüm ihtiyacını tek noktadan, güvenle
              karşılayabildiği bir platform kurmak.
            </p>
          </article>
        </div>

        <section className="mt-14 max-w-4xl">
          <h2 className="text-xl font-bold text-primary sm:text-2xl">
            Neden GES MARKETİM?
          </h2>
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {REASONS.map((reason) => (
              <li
                key={reason.title}
                className="rounded-xl border border-border bg-white p-5 shadow-card"
              >
                <h3 className="text-base font-bold text-primary">{reason.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {reason.description}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-label="Kurulum hizmeti referansı"
          className="mt-14 max-w-3xl rounded-2xl border border-border bg-surface p-6 sm:p-7"
        >
          <p className="text-sm leading-relaxed text-text-secondary sm:text-base">
            Kurulum hizmeti almak isterseniz, Manavgat merkezli{' '}
            <a
              href="https://gespaenerji.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-primary underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-dark"
            >
              GespaEnerji
            </a>{' '}
            ekibini bağımsız referans olarak önerebiliriz. GES MARKETİM yalnızca ürün
            satışı yapar; kurulum hizmetinden sorumlu değildir.
          </p>
        </section>
      </div>
    </div>
  );
}
