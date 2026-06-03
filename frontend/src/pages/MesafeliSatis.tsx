import LegalPage, { LegalSection, LegalList } from '../components/LegalPage';

export default function MesafeliSatis() {
  return (
    <LegalPage title="Mesafeli Satış Sözleşmesi" showDraftBadge>
      <p>
        İşbu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli
        Sözleşmeler Yönetmeliği hükümlerine uygun olarak düzenlenmiştir.
      </p>

      <LegalSection title="1. Taraflar">
        <p>
          <strong>SATICI:</strong> Gespa Enerji / GES MARKETİM, Manavgat / Antalya.
          E-posta: bilgi@gesmarketim.com
        </p>
        <p>
          <strong>ALICI:</strong> Siparişi onaylayan ve teslimat / fatura bilgilerini sipariş
          formunda belirten gerçek veya tüzel kişi.
        </p>
      </LegalSection>

      <LegalSection title="2. Konu">
        <p>
          İşbu sözleşmenin konusu, ALICI'nın www.gesmarketim.com web sitesinden elektronik
          ortamda sipariş verdiği, sözleşme içinde nitelikleri ve satış fiyatı belirtilen
          ürünün satışı ve teslimi ile ilgili tarafların hak ve yükümlülüklerinin
          belirlenmesidir.
        </p>
      </LegalSection>

      <LegalSection title="3. Sözleşme Konusu Ürün">
        <p>
          Ürünün cinsi, türü, miktarı, marka/modeli, satış bedeli, ödeme şekli, sipariş
          tarihinde ALICI'nın görüntülediği ve onayladığı sipariş formu ile fatura
          bilgilerinde belirtildiği gibidir.
        </p>
      </LegalSection>

      <LegalSection title="4. Genel Hükümler">
        <LegalList
          items={[
            'ALICI, sipariş formunda yer alan ürünün temel niteliklerini, satış fiyatını ve ödeme şeklini, teslimata ilişkin ön bilgileri okuyup bilgi sahibi olduğunu ve elektronik ortamda onay verdiğini kabul eder.',
            'Sözleşme konusu ürün, ALICI tarafından bildirilen adrese kargo firması aracılığıyla teslim edilir.',
            'Sözleşme konusu ürünün teslimatı için işbu sözleşmenin elektronik onaylanmış olması ve bedelinin ALICI tarafından ödenmiş olması şarttır.',
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Ödeme">
        <p>
          Ödemeler kredi kartı, banka kartı veya havale/EFT yöntemleriyle alınır. Tüm
          fiyatlar Türk Lirası cinsinden ve KDV dahildir. Ödemenin bankaya yansımaması veya
          iptal edilmesi halinde sipariş işleme alınmaz.
        </p>
      </LegalSection>

      <LegalSection title="6. Teslimat">
        <LegalList
          items={[
            'Stoklu ürünler: Ödemenin onaylanmasını takip eden 1-2 iş günü içinde kargoya verilir.',
            'Siparişe özel ürünler: Tedarikçi sürecine bağlı olarak 5-7 iş günü içinde kargoya verilir.',
            'Teslimat süresi, sözleşmenin kurulduğu tarihten itibaren 30 günü geçemez.',
            'Kargo firmasının teslim sırasında karşılaşacağı her türlü sorundan dolayı, sipariş edilen ürünün ALICI\'ya teslim edilememesinden SATICI sorumlu tutulamaz.',
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Cayma Hakkı">
        <p>
          ALICI, sözleşme konusu ürünü teslim aldığı tarihten itibaren <strong>14 (on dört)
          gün</strong> içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin
          sözleşmeden cayma hakkına sahiptir. Cayma bildirimi yazılı olarak veya kalıcı veri
          saklayıcısı ile bilgi@gesmarketim.com adresine iletilir.
        </p>
      </LegalSection>

      <LegalSection title="8. Cayma Hakkının Kullanılamayacağı Haller">
        <LegalList
          items={[
            'ALICI\'nın özel istek ve talepleri uyarınca üretilen veya kişiselleştirilen ürünler',
            'Niteliği itibarıyla iade edilemeyen, hızla bozulan veya son kullanma tarihi geçmesi muhtemel ürünler',
            'Tesliminden sonra ambalaj, bant, mühür, paket gibi koruyucu unsurları açılmış olan ve iadesi sağlık ve hijyen açısından uygun olmayan ürünler',
          ]}
        />
      </LegalSection>

      <LegalSection title="9. İade Prosedürü">
        <p>
          Cayma hakkının kullanılması durumunda ürün, orijinal ambalajında, hasarsız ve
          eksiksiz olarak SATICI'nın bildireceği iade adresine gönderilir. SATICI, cayma
          bildiriminin kendisine ulaştığı tarihten itibaren 14 gün içinde toplam bedeli iade
          eder.
        </p>
      </LegalSection>

      <LegalSection title="10. Temerrüt Hükümleri">
        <p>
          Tarafların işbu sözleşmeden kaynaklanan yükümlülüklerini yerine getirmemesi
          halinde 6098 sayılı Türk Borçlar Kanunu'nun ilgili hükümleri uygulanır.
        </p>
      </LegalSection>

      <LegalSection title="11. Uyuşmazlıkların Çözümü">
        <p>
          İşbu sözleşmenin uygulanmasından doğan uyuşmazlıklarda, Ticaret Bakanlığı'nca her
          yıl ilan edilen değere kadar Tüketici Hakem Heyetleri, bu değerin üzerindeki
          uyuşmazlıklarda ise Tüketici Mahkemeleri yetkilidir.
        </p>
      </LegalSection>

      <LegalSection title="12. Yürürlük">
        <p>
          ALICI'nın siparişi elektronik ortamda onaylaması ile işbu sözleşme kurulmuş
          sayılır. Sözleşmenin bir nüshası ALICI'nın e-posta adresine gönderilir.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
