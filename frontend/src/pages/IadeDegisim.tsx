import { Link } from 'react-router-dom';
import LegalPage, { LegalSection, LegalList } from '../components/LegalPage';

export default function IadeDegisim() {
  return (
    <LegalPage title="İade ve Değişim">
      <LegalSection title="Cayma Hakkı (14 Gün)">
        <p>
          6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler
          Yönetmeliği uyarınca, teslim tarihinden itibaren <strong>14 gün</strong> içinde
          gerekçe göstermeksizin cayma hakkınızı kullanabilirsiniz. Cayma bildirimini
          WhatsApp veya e-posta ile iletmeniz yeterlidir; sipariş numaranızı eklemeyi
          unutmayın.
        </p>
      </LegalSection>

      <LegalSection title="İade Koşulları">
        <LegalList
          items={[
            'Ürün kullanılmamış, kurulum yapılmamış ve yeniden satılabilir durumda olmalıdır.',
            'Orijinal kutu, ambalaj, aksesuar ve varsa fatura ile birlikte gönderilmelidir.',
            'Kurulumu yapılmış panel, inverter ve batarya gruplarında üretici garanti koşulları geçerlidir; kurulum sonrası arızalar garanti kapsamında değerlendirilir.',
            'Siparişe özel tedarik edilen (dropship) ürünlerde iade süreci tedarikçi onayıyla yürütülür; süreç birkaç gün uzayabilir.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Hasarlı / Yanlış Ürün">
        <p>
          Kargoda hasar görmüş veya yanlış gönderilmiş ürünlerde tüm kargo ve değişim
          masrafları bize aittir. Teslimatta paketi kontrol edip hasar varsa kargo
          görevlisine tutanak tutturmanız süreci hızlandırır; aynı gün içinde bize
          bildirin.
        </p>
      </LegalSection>

      <LegalSection title="Ücret İadesi">
        <LegalList
          items={[
            'İade edilen ürün depomuza ulaşıp kontrol edildikten sonra en geç 14 gün içinde ücret iadesi yapılır.',
            'Kart ile ödemelerde iade aynı karta, havale/EFT ödemelerinde bildirdiğiniz IBAN’a yapılır.',
            'Cayma hakkı kapsamındaki iadelerde iade kargo bedeli, anlaşmalı kargo ile gönderim yapıldığında tarafımızca karşılanır.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Nasıl Başlatırım?">
        <p>
          Sipariş numaranızla birlikte{' '}
          <Link to="/iletisim" className="font-semibold text-primary underline">
            iletişim sayfamızdaki
          </Link>{' '}
          formu doldurun veya WhatsApp hattımıza yazın. Size iade kodu ve anlaşmalı
          kargo bilgilerini iletelim. Yasal çerçeve için{' '}
          <Link to="/mesafeli-satis" className="font-semibold text-primary underline">
            Mesafeli Satış Sözleşmesi
          </Link>
          'ne bakabilirsiniz.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
