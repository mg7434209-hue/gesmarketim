import { Link } from 'react-router-dom';
import LegalPage, { LegalSection, LegalList } from '../components/LegalPage';
import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING } from '../lib/shipping';
import { formatPrice } from '../components/product-ui';

export default function Kargo() {
  return (
    <LegalPage title="Kargo ve Teslimat">
      <LegalSection title="Teslimat Süreleri">
        <LegalList
          items={[
            <>
              <strong>Stoklu ürünler:</strong> Manavgat depomuzdan aynı veya ertesi iş
              günü kargoya verilir; teslimat genellikle 1-2 iş günü sürer.
            </>,
            <>
              <strong>Siparişe özel tedarik (dropship) ürünler:</strong> Tedarikçiden
              temin edilerek gönderilir; teslimat genellikle 5-7 iş günü sürer. Ürün
              sayfasındaki rozet hangi tip olduğunu gösterir.
            </>,
            <>
              Havale/EFT siparişlerinde süre, ödemenin hesabımıza geçmesiyle başlar.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Kargo Ücreti">
        <LegalList
          items={[
            <>
              {formatPrice(FREE_SHIPPING_THRESHOLD)} ve üzeri siparişlerde kargo{' '}
              <strong>ücretsizdir</strong>.
            </>,
            <>
              Bu tutarın altındaki siparişlerde sabit {formatPrice(FLAT_SHIPPING)} kargo
              bedeli uygulanır; tutar ödeme adımında açıkça gösterilir.
            </>,
            <>
              Panel, konstrüksiyon gibi hacimli/paletli ürünlerde ambar teslimatı
              gerekebilir; bu durumda sipariş sonrası sizinle iletişime geçilir.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Teslimatta Kontrol">
        <p>
          Paketinizi kargo görevlisi yanındayken kontrol etmenizi öneririz. Hasarlı
          görünen paketler için tutanak tutturup aynı gün bize bildirin; hasarlı ürün
          ücretsiz olarak değiştirilir. Ayrıntılar için{' '}
          <Link to="/iade-degisim" className="font-semibold text-primary underline">
            İade ve Değişim
          </Link>{' '}
          sayfasına bakabilirsiniz.
        </p>
      </LegalSection>

      <LegalSection title="Sipariş Takibi">
        <p>
          Siparişiniz kargoya verildiğinde e-posta ile bilgilendirilirsiniz. Sipariş
          numaranızla durumunuzu sipariş onay sayfasından, hesabınız varsa{' '}
          <Link to="/hesabim" className="font-semibold text-primary underline">
            Hesabım
          </Link>{' '}
          bölümünden takip edebilirsiniz. Sorularınız için WhatsApp hattımız en hızlı
          kanaldır.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
