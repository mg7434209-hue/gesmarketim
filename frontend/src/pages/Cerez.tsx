import LegalPage, { LegalSection, LegalList } from '../components/LegalPage';

export default function Cerez() {
  return (
    <LegalPage title="Çerez Politikası" showDraftBadge>
      <p>
        Bu Çerez Politikası, GES MARKETİM'in www.gesmarketim.com web sitesinde kullandığı
        çerez ("cookie") teknolojilerini ve bunlar üzerindeki tercihlerinizi nasıl
        yönetebileceğinizi açıklar.
      </p>

      <LegalSection title="1. Çerez Nedir?">
        <p>
          Çerezler; ziyaret ettiğiniz web sitesi tarafından tarayıcınıza gönderilen ve
          cihazınızda saklanan küçük metin dosyalarıdır. Çerezler, sitenin doğru
          çalışmasına, kullanıcı tercihlerinin hatırlanmasına ve ziyaret istatistiklerinin
          ölçülmesine yardımcı olur.
        </p>
      </LegalSection>

      <LegalSection title="2. Kullandığımız Çerez Türleri">
        <LegalList
          items={[
            <span key="zorunlu">
              <strong>Zorunlu çerezler:</strong> Sitenin temel işlevleri için gereklidir
              (oturum yönetimi, sepet bilgisi, güvenlik). Engellenemez.
            </span>,
            <span key="islevsellik">
              <strong>İşlevsellik çerezleri:</strong> Dil ve tema gibi tercihlerinizi
              hatırlar.
            </span>,
            <span key="performans">
              <strong>Performans / analiz çerezleri:</strong> Site kullanımı hakkında
              anonim istatistikler toplar (sayfa görüntüleme, oturum süresi vb.).
            </span>,
            <span key="pazarlama">
              <strong>Pazarlama çerezleri:</strong> Açık rızanız varsa kullanılır; ilgi
              alanlarınıza uygun içerik ve reklam sunulmasına yardımcı olur.
            </span>,
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Hangi Verileri Topluyoruz?">
        <p>
          Çerezler aracılığıyla; IP adresi, tarayıcı türü ve sürümü, ziyaret edilen
          sayfalar, oturum süresi, yönlendiren site ve cihaz bilgileri toplanabilir.
        </p>
      </LegalSection>

      <LegalSection title="4. Çerez Tercihlerinizi Nasıl Yönetebilirsiniz?">
        <p>
          Çoğu tarayıcı çerezleri otomatik olarak kabul eder, ancak çerez ayarlarınızı
          tarayıcınızın "Ayarlar" veya "Gizlilik" bölümünden değiştirebilirsiniz. Zorunlu
          çerezleri devre dışı bırakmanız halinde sitenin bazı bölümleri düzgün
          çalışmayabilir.
        </p>
        <LegalList
          items={[
            'Chrome: Ayarlar → Gizlilik ve güvenlik → Çerezler',
            'Firefox: Ayarlar → Gizlilik ve Güvenlik',
            'Safari: Tercihler → Gizlilik',
            'Edge: Ayarlar → Çerezler ve site izinleri',
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Üçüncü Taraf Çerezleri">
        <p>
          Sitemiz, analiz ve hizmet kalitesi amacıyla üçüncü taraf hizmet sağlayıcıların
          (örn. Google Analytics) çerezlerini kullanabilir. Bu çerezler ilgili sağlayıcının
          gizlilik politikalarına tabidir.
        </p>
      </LegalSection>

      <LegalSection title="6. Çerezlerin Saklama Süresi">
        <p>
          Oturum çerezleri tarayıcı kapandığında silinir. Kalıcı çerezler, türüne göre
          belirli bir süre boyunca cihazınızda saklanır ve süre sonunda otomatik olarak
          silinir.
        </p>
      </LegalSection>

      <LegalSection title="7. Politikadaki Değişiklikler">
        <p>
          GES MARKETİM, işbu Çerez Politikası'nı gerektiğinde güncelleyebilir. Güncellemeler
          bu sayfa üzerinden yayımlandığı anda yürürlüğe girer.
        </p>
      </LegalSection>

      <LegalSection title="8. İletişim">
        <p>
          Çerez kullanımı hakkındaki sorularınız için{' '}
          <a
            href="mailto:bilgi@gesmarketim.com"
            className="font-semibold text-primary underline decoration-accent decoration-2 underline-offset-2 hover:text-accent-dark"
          >
            bilgi@gesmarketim.com
          </a>{' '}
          adresine yazabilirsiniz.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
