import LegalPage, { LegalSection, LegalList } from '../components/LegalPage';

export default function OnBilgilendirme() {
  return (
    <LegalPage title="Ön Bilgilendirme Formu" showDraftBadge>
      <p>
        İşbu Ön Bilgilendirme Formu, Mesafeli Sözleşmeler Yönetmeliği'nin 5. maddesi uyarınca
        ALICI'ya satış işleminin gerçekleşmesinden önce sunulan zorunlu bilgileri içerir.
      </p>

      <LegalSection title="1. Satıcı Bilgileri">
        <LegalList
          items={[
            'Unvan: Gespa Enerji / GES MARKETİM',
            'Adres: Manavgat / Antalya / Türkiye',
            'E-posta: bilgi@gesmarketim.com',
            'WhatsApp: +90 543 743 42 09',
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Sözleşme Konusu Ürün / Hizmet">
        <p>
          Sözleşmeye konu ürünün cinsi, niteliği, miktarı, marka/modeli, rengi (uygunsa) ve
          adedi sipariş özetinde ve fatura bilgilerinde yer alır. Görseller temsilî
          olabilir.
        </p>
      </LegalSection>

      <LegalSection title="3. Fiyat ve Ödeme">
        <LegalList
          items={[
            'Tüm fiyatlar Türk Lirası cinsinden ve KDV dahildir.',
            'Kargo ücretleri belirtilmediği sürece ALICI\'ya aittir; kampanya kapsamında ücretsiz olabilir.',
            'Ödeme kredi kartı, banka kartı veya havale/EFT ile yapılır.',
            'Kart bilgileri SATICI tarafından saklanmaz; ödeme süreçleri lisanslı ödeme kuruluşları üzerinden yürütülür.',
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Teslimat">
        <LegalList
          items={[
            'Stoklu ürünler 1-2 iş günü içinde, siparişe özel ürünler 5-7 iş günü içinde kargoya verilir.',
            'Teslimat süresi sözleşmenin kurulduğu tarihten itibaren 30 günü geçemez.',
            'Teslimat, ALICI\'nın sipariş formunda belirttiği adrese anlaşmalı kargo firmasıyla yapılır.',
            'Kargo gecikmelerinde ALICI bilgilendirilir; yasal süreyi aşan gecikmelerde ALICI siparişi iptal etme hakkına sahiptir.',
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Cayma Hakkı">
        <p>
          ALICI, ürünü teslim aldığı tarihten itibaren <strong>14 (on dört) gün</strong>{' '}
          içinde herhangi bir gerekçe göstermeden ve cezai şart ödemeden sözleşmeden cayma
          hakkına sahiptir. Cayma bildirimi bilgi@gesmarketim.com adresine yazılı olarak
          iletilir. Ürün, orijinal ambalajında ve hasarsız olarak iade edilir.
        </p>
      </LegalSection>

      <LegalSection title="6. Cayma Hakkının Kullanılamayacağı Ürünler">
        <LegalList
          items={[
            'ALICI\'nın isteği doğrultusunda hazırlanan, kişiye özel üretilen ürünler',
            'Ambalaj, koruyucu mühür ya da bantları açılmış olup hijyen / sağlık nedeniyle iadesi uygun olmayan ürünler',
            'Niteliği gereği hızla bozulan veya son kullanma tarihi geçebilecek ürünler',
          ]}
        />
      </LegalSection>

      <LegalSection title="7. İade ve Bedel İadesi">
        <p>
          SATICI, geçerli cayma bildirimini takiben en geç 14 gün içinde, kargo bedeli
          hariç toplam tutarı ALICI'nın ödeme yaptığı yöntemle iade eder.
        </p>
      </LegalSection>

      <LegalSection title="8. Garanti ve Ayıplı Mal">
        <p>
          Ürünler, üretici/ithalatçı garantisi kapsamındadır. Ayıplı mal hükümleri 6502
          sayılı Kanun ve ilgili yönetmeliklere göre işletilir.
        </p>
      </LegalSection>

      <LegalSection title="9. Şikayet ve Uyuşmazlık">
        <p>
          Tüketici şikayetleri için Ticaret Bakanlığı'nca her yıl belirlenen parasal sınıra
          kadar Tüketici Hakem Heyetleri, üzerindeki uyuşmazlıklarda ise Tüketici
          Mahkemeleri yetkilidir.
        </p>
      </LegalSection>

      <LegalSection title="10. Onay">
        <p>
          ALICI; siparişi onaylamadan önce işbu Ön Bilgilendirme Formu'nu ve Mesafeli Satış
          Sözleşmesi'ni elektronik ortamda okuyup kabul ettiğini, sözleşmenin esaslı
          unsurları hakkında bilgi sahibi olduğunu beyan eder.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
