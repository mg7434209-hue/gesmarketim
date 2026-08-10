# GES MARKETİM — Ana Sayfa v2 Spec (Animasyon + AI Proje Tasarımcısı + USD Bazlı Fiyatlama)

> Bu dosyayı `docs/anasayfa-v2-spec.md` olarak repoya commit et. Claude Code sadece bu dosyadan çalışacak.
> DİKKAT: Frontend ve backend işlerini AYRI Claude Code oturumlarında yap (Bun bellek sınırı).

---

## BÖLÜM A — FRONTEND (frontend/ dizini)

### A1. Hero Animasyonu

Mevcut statik güneş + panel emojisi/çizimi yerine hafif, JS kütüphanesi GEREKTİRMEYEN saf CSS/SVG animasyonu:

1. **Güneş**: SVG daire + ışınlar. Işınlar `@keyframes` ile 20 sn'de bir tam tur döner (transform: rotate). Güneşin kendisi 4 sn periyotla hafif "nefes alma" (scale 1 → 1.05 → 1, ease-in-out).
2. **Enerji akışı**: Güneşten panele giden 3 kesikli çizgi (SVG `stroke-dasharray` + `stroke-dashoffset` animasyonu) — enerji akıyormuş hissi. Renk: brand amber `#FDC722`.
3. **Panel parlaması**: Panel hücreleri üzerinde 6 sn'de bir soldan sağa geçen ince parlama şeridi (linear-gradient overlay, `translateX` animasyonu).
4. **Sayaç animasyonu**: "247+ ürün çeşidi / 11 kategori / 18 hazır paket / 14 gün iade" sayıları sayfa yüklendiğinde 0'dan hedefe sayarak gelsin (IntersectionObserver + requestAnimationFrame, ~1.2 sn). Kütüphane kullanma, ~30 satırlık hook yaz: `useCountUp(target, durationMs)`.
5. `prefers-reduced-motion: reduce` medya sorgusunda TÜM animasyonlar kapansın (erişilebilirlik).

### A2. Gerçek Güneş Paneli Görseli

- Hero'daki çizim panel yerine **gerçek panel ürün fotoğrafı** kullanılacak. Kaynak: Lexron ürün görselleri (yazılı izin var). Önerilen: 655W TOPCON panelin şeffaf/beyaz arka planlı görseli.
- Dosya: `frontend/public/images/hero-panel.webp` (WebP, maks 150 KB, genişlik 800px). PNG kaynak varsa `sharp` ya da squoosh ile WebP'ye çevir.
- `<img loading="eager" fetchpriority="high" alt="Lexron 655W TOPCON güneş paneli">` — hero görseli LCP elemanı, lazy load ETME.
- Görsel A1'deki animasyon katmanlarının (enerji çizgileri, parlama) ALTINA yerleşir; animasyonlar `position:absolute` overlay.

### A3. "AI ile Kendi Projenizi Hazırlayın" Bölümü

Hero'nun hemen altına, Kategoriler'in üstüne yeni section:

- **Başlık**: "Yapay Zekâ ile Projenizi Tasarlayın"
- **Alt metin**: "Karavan mı, bağ evi mi, tarımsal sulama mı? İhtiyacınızı anlatın, size uygun sistemi saniyeler içinde önerelim."
- **3 hızlı seçim kartı** (tıklanınca hesaplayıcıya önayarla gider):
  - 🚐 Karavan / Tekne → `/hesaplayici?profil=karavan`
  - 🏡 Bağ Evi / Müstakil → `/hesaplayici?profil=ev`
  - 🌾 Tarımsal Sulama → `/hesaplayici?profil=sulama`
- **CTA butonu**: "Projemi Hesapla" → `/hesaplayici` (mevcut `docs/hesaplayici-spec.md` sayfası)
- **İkincil CTA**: "WhatsApp'tan Uzmana Sor" → mevcut WhatsApp butonuyla aynı link
- Tasarım: brand renkleri (blue `#36C5EC`, green `#6ABF89`, amber `#FDC722`), kartlarda hover'da hafif yükselme (translateY(-4px) + shadow), yine `prefers-reduced-motion` saygılı.
- Hesaplayıcı sayfası `profil` query paramını okuyup ilgili senaryonun varsayılan değerlerini yüklesin (karavan: 12/24V küçük sistem; ev: 5–10kW hibrit; sulama: pompa inverteri odaklı).

### A4. Fiyat Gösterimi (Frontend tarafı)

- Ürün kartı ve detayda **TL fiyat büyük**, hemen altında küçük gri metin: `≈ $XXX.XX + "Fiyatlar günlük kura göre güncellenir"`.
- API'den gelen alanlar: `priceTRY` (gösterim ana fiyatı), `priceUSD` (bilgi amaçlı). `costPrice`, marj, kur ASLA frontend'e gelmez (mevcut allowlist mapper korunur).

---

## BÖLÜM B — BACKEND (backend/ dizini — AYRI OTURUM)

### B1. Fiyatlama Kuralı Güncellemesi

- Tüm ürünlerde maliyet **USD** saklanır (mevcut mimariyle uyumlu).
- **Marj: sabit %22** → `saleUSD = round(costUSD * 1.22, 2)`.
- `saleTRY = round(saleUSD * kur * 1.02, 2)` — kur üzerine mevcut %2 tampon korunur.
- Kur: günlük cron mevcut; `finalPrice` snapshot'ları marj değişikliği sonrası tek seferlik yeniden hesaplanacak (`recomputePrices` script'i çalıştır).
- NOT: %22 sabit marj, tiered markup tablosunun ÜZERİNE yazılmaz; `tenants.defaultMarkup = 0.22` olarak set edilir, tier kayıtları boşaltılır (ileride kademeye dönüş mümkün kalsın).
- Rakip tavan ve maliyet+min-marj tabanı kuralları aynen geçerli kalır.

### B2. Katalog Yükleme

- `gesmarketim_fiyatlar_marj22.csv` dosyası CSV sync engine formatına uygun: `category, name, brand, stock_status, cost_usd, sale_usd, sale_tl_at_47_20`.
- Sync engine sadece `cost_usd`'yi alır; satış fiyatını KENDİSİ hesaplar (CSV'deki sale kolonları doğrulama içindir).
- "4mm2 SOLAR KABLO" fiyatsız — import'ta atla, log'a yaz.

---

## Kabul Kriterleri

- [ ] Lighthouse Performance ≥ 90 (animasyonlar GPU-friendly: sadece transform/opacity animasyonu, layout tetikleyen property yok)
- [ ] `prefers-reduced-motion` testi geçiyor
- [ ] Hero paneli gerçek fotoğraf, LCP < 2.5s
- [ ] AI bölümü 3 kart + 2 CTA ile render oluyor, linkler çalışıyor
- [ ] Ürün kartında TL büyük + USD küçük gösterim
- [ ] API response'unda costPrice/markup sızıntısı yok (mevcut allowlist test geçiyor)
- [ ] Tüm ürünlerde DB'de `saleUSD = costUSD × 1.22` (spot check: 12W panel → 12.84 → 15.66)
