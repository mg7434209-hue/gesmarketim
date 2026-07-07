import { Link } from 'react-router-dom';
import { useSeo } from '../lib/seo';
import { WHATSAPP_URL } from '../config';
import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING } from '../lib/shipping';
import { formatPrice } from '../components/product-ui';

type Faq = { q: string; a: string; render?: React.ReactNode };

export default function Sss() {
  const faqs: Faq[] = [
    {
      q: 'Ürünler orijinal mi, garantili mi?',
      a: 'Evet. Tüm ürünler distribütör/tedarikçi kanalından sıfır ve faturalı gelir; üretici garantisi geçerlidir.',
    },
    {
      q: 'Teslimat ne kadar sürer?',
      a: 'Stoklu ürünler 1-2 iş günü, siparişe özel tedarik edilen ürünler 5-7 iş günü içinde teslim edilir. Ürün sayfasındaki rozet hangi tip olduğunu gösterir.',
    },
    {
      q: 'Kargo ücreti ne kadar?',
      a: `${formatPrice(FREE_SHIPPING_THRESHOLD)} ve üzeri siparişlerde kargo ücretsizdir; altındaki siparişlere ${formatPrice(FLAT_SHIPPING)} sabit kargo bedeli eklenir.`,
    },
    {
      q: 'Hangi ödeme yöntemlerini kullanabilirim?',
      a: 'Havale/EFT ve (etkinse) iyzico güvencesiyle kredi/banka kartı ile ödeme yapabilirsiniz. Havale bilgileri sipariş onay sayfasında gösterilir.',
    },
    {
      q: 'Fiyatlara KDV dahil mi?',
      a: 'Evet, sitede gösterilen tüm fiyatlar KDV dahil net fiyattır.',
    },
    {
      q: 'İade edebilir miyim?',
      a: 'Teslimattan itibaren 14 gün içinde cayma hakkınızı kullanabilirsiniz. Ürün kullanılmamış ve orijinal ambalajında olmalıdır. Ayrıntılar İade ve Değişim sayfasındadır.',
    },
    {
      q: 'Kurulum hizmeti veriyor musunuz?',
      a: 'GES MARKETİM ürün satış kanalıdır. Anahtar teslim kurulum ve keşif için sizi çözüm ortağımız GespaEnerji’ye yönlendirebiliriz.',
    },
    {
      q: 'Sistemimi nasıl boyutlandırırım? Hangi paneli/inverteri seçmeliyim?',
      a: 'WhatsApp üzerinden tüketim bilgilerinizi (fatura veya kWh) iletin; size uygun panel, inverter ve batarya kombinasyonunu ücretsiz önerelim.',
    },
    {
      q: 'Kurumsal / toplu alım yapabilir miyim?',
      a: 'Evet. Bayiler, EPC firmaları ve kurumsal projeler için özel fiyat çalışıyoruz. İletişim sayfasından veya WhatsApp’tan ulaşmanız yeterli.',
    },
  ];

  useSeo({
    title: 'Sıkça Sorulan Sorular',
    description:
      'GES MARKETİM hakkında sık sorulan sorular: teslimat süreleri, kargo ücreti, ödeme yöntemleri, iade koşulları, garanti ve kurulum desteği.',
    path: '/sss',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
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
            <li aria-hidden="true" className="text-text-secondary/60">›</li>
            <li aria-current="page" className="text-text-secondary">SSS</li>
          </ol>
        </nav>

        <header className="mt-6">
          <h1 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
            Sıkça Sorulan Sorular
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">
            Aradığınız cevabı bulamazsanız{' '}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline decoration-accent decoration-2 underline-offset-2"
            >
              WhatsApp
            </a>{' '}
            üzerinden bize yazın.
          </p>
        </header>

        <div className="mt-8 max-w-3xl space-y-3">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-xl border border-border bg-surface p-5 open:bg-white open:shadow-card"
            >
              <summary className="cursor-pointer list-none text-sm font-bold text-primary sm:text-base [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-3">
                  {f.q}
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-accent-dark transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">{f.a}</p>
            </details>
          ))}
        </div>

        <p className="mt-8 max-w-3xl text-sm text-text-secondary">
          Ayrıca bkz.{' '}
          <Link to="/kargo" className="font-semibold text-primary underline">
            Kargo ve Teslimat
          </Link>{' '}
          ·{' '}
          <Link to="/iade-degisim" className="font-semibold text-primary underline">
            İade ve Değişim
          </Link>{' '}
          ·{' '}
          <Link to="/mesafeli-satis" className="font-semibold text-primary underline">
            Mesafeli Satış Sözleşmesi
          </Link>
        </p>
      </div>
    </div>
  );
}
