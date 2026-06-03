import LegalPage, { LegalSection, LegalList } from '../components/LegalPage';

export default function Kvkk() {
  return (
    <LegalPage title="KVKK Aydınlatma Metni" showDraftBadge>
      <p>
        İşbu Aydınlatma Metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK")
        kapsamında, Veri Sorumlusu sıfatıyla GES MARKETİM (Gespa Enerji bünyesinde) tarafından
        toplanan kişisel verilerinizin işlenme esaslarını açıklamak amacıyla hazırlanmıştır.
      </p>

      <LegalSection title="1. Veri Sorumlusu">
        <p>
          Veri Sorumlusu: <strong>Gespa Enerji / GES MARKETİM</strong> (Manavgat / Antalya).
          İletişim: bilgi@gesmarketim.com
        </p>
      </LegalSection>

      <LegalSection title="2. İşlenen Kişisel Veriler">
        <LegalList
          items={[
            'Kimlik bilgileri (ad, soyad)',
            'İletişim bilgileri (telefon, e-posta, adres)',
            'Sipariş, fatura ve teslimat bilgileri',
            'Ödeme bilgileri (banka / kart bilgisi yalnızca ödeme kuruluşu nezdinde işlenir, tarafımızca saklanmaz)',
            'Web sitesi kullanım verileri (çerezler, IP, oturum bilgileri)',
            'Müşteri destek görüşmelerine ait yazışma kayıtları (WhatsApp, e-posta, form)',
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Kişisel Verilerin İşlenme Amaçları">
        <LegalList
          items={[
            'Sipariş alımı, fatura kesimi ve teslimatın gerçekleştirilmesi',
            'Müşteri destek hizmetlerinin sağlanması',
            'Mesafeli satış sözleşmesinden doğan yükümlülüklerin yerine getirilmesi',
            'İade ve değişim taleplerinin yönetilmesi',
            'Yasal saklama ve raporlama yükümlülüklerinin yerine getirilmesi',
            'Hizmet kalitesinin ve site deneyiminin iyileştirilmesi',
            'İletişim izni verildiyse pazarlama ve tanıtım faaliyetleri',
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Kişisel Verilerin Aktarımı">
        <p>
          Kişisel verileriniz; siparişin teslimi için kargo firmalarına, ödeme süreçleri
          için bankalar ve ödeme kuruluşlarına, e-fatura/e-arşiv süreçleri için entegratör
          firmalara, hukuki uyum kapsamında yetkili kamu kurum ve kuruluşlarına, KVKK m.8 ve
          m.9 hükümleri çerçevesinde aktarılabilir.
        </p>
      </LegalSection>

      <LegalSection title="5. Kişisel Veri Toplama Yöntemleri ve Hukuki Sebep">
        <p>
          Veriler; web sitesi formları, sipariş süreçleri, WhatsApp/e-posta yazışmaları ve
          çerezler aracılığıyla elektronik ortamda toplanır. Hukuki sebep olarak; sözleşmenin
          ifası, hukuki yükümlülüğün yerine getirilmesi, meşru menfaat ve gerekli hallerde
          açık rıza esas alınır.
        </p>
      </LegalSection>

      <LegalSection title="6. Saklama Süresi">
        <p>
          Kişisel veriler, ilgili mevzuatta öngörülen veya işlendikleri amaç için gerekli
          olan süre kadar saklanır. Sürenin sonunda veriler silinir, yok edilir veya
          anonim hale getirilir.
        </p>
      </LegalSection>

      <LegalSection title="7. Veri Güvenliği">
        <p>
          GES MARKETİM, kişisel verilerin hukuka aykırı işlenmesini ve erişilmesini önlemek
          için uygun güvenlik düzeyini sağlamaya yönelik teknik ve idari tedbirleri alır.
        </p>
      </LegalSection>

      <LegalSection title="8. İlgili Kişinin Hakları (KVKK m.11)">
        <p>İlgili kişi olarak aşağıdaki haklara sahipsiniz:</p>
        <LegalList
          items={[
            'Kişisel verilerinizin işlenip işlenmediğini öğrenme',
            'Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme',
            'İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme',
            'Yurt içinde / yurt dışında aktarıldığı üçüncü kişileri bilme',
            'Eksik veya yanlış işlenmişse düzeltilmesini isteme',
            'KVKK m.7 kapsamında silinmesini veya yok edilmesini isteme',
            'Yapılan işlemlerin aktarıldığı üçüncü kişilere bildirilmesini isteme',
            'Otomatik sistemler ile analiz sonucu aleyhinize bir sonuç doğmasına itiraz etme',
            'Kanuna aykırı işleme nedeniyle zarara uğramışsanız zararın giderilmesini talep etme',
          ]}
        />
      </LegalSection>

      <LegalSection title="9. Başvuru">
        <p>
          Yukarıdaki haklarınıza ilişkin talepleri{' '}
          <a
            href="mailto:bilgi@gesmarketim.com"
            className="font-semibold text-primary underline decoration-accent decoration-2 underline-offset-2 hover:text-accent-dark"
          >
            bilgi@gesmarketim.com
          </a>{' '}
          adresine iletebilirsiniz. Başvurularınız Veri Sorumlusuna Başvuru Usul ve Esasları
          Hakkında Tebliğ'e uygun olarak en geç 30 gün içinde yanıtlanır.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
