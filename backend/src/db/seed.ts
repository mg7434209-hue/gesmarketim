import "dotenv/config";
import { eq, and, sql } from "drizzle-orm";
import { db } from "./index.js";
import { tenants, suppliers, categories, brands, products } from "./schema.js";
import { computeFinalPrice } from "./pricing.js";
import { slugify } from "../lib/util.js";

// ---------------------------------------------------------------------------
// Idempotent seed: tenant + taxonomy + a representative product catalogue.
// Re-runnable; uses onConflictDoNothing and slug lookups.
// ---------------------------------------------------------------------------

type SeedProduct = {
  name: string;
  category: string; // category slug
  brand: string; // brand slug
  supplier: string; // supplier slug
  costPrice: number;
  // SABİT %22 DÖNEMİ: markupPercent/sellPrice alanları artık seed'de
  // KULLANILMAZ (tarihsel değerler belgelenmiş olarak listede duruyor) —
  // tüm ürünler tenant.defaultMarkup (%22) ile fiyatlanır. Kademeye dönüşte
  // bu değerler yeniden devreye alınabilir.
  markupPercent: number;
  fulfillmentType: "stock" | "dropship";
  stockQty: number;
  description: string;
  // Fiyatı henüz bilinmeyen ürünler "draft" eklenir; admin fiyat girip yayınlar.
  status?: "active" | "draft";
  sellPrice?: number;
};

const SUPPLIERS = [
  { name: "Lexron", slug: "lexron", defaultMarkupPercent: "20" },
  { name: "Mexxsun", slug: "mexxsun", defaultMarkupPercent: "22" },
  { name: "Enerji Pazarı", slug: "enerji-pazari", defaultMarkupPercent: "25" },
  { name: "ACS Enerji", slug: "acs-enerji", defaultMarkupPercent: "20" },
];

const CATEGORIES = [
  { name: "Güneş Paneli", slug: "gunes-paneli", defaultMarkupPercent: "18", sortOrder: 1 },
  { name: "İnverter", slug: "inverter", defaultMarkupPercent: "22", sortOrder: 2 },
  { name: "Batarya", slug: "batarya", defaultMarkupPercent: "20", sortOrder: 3 },
  { name: "Solar Kablo", slug: "solar-kablo", defaultMarkupPercent: "30", sortOrder: 4 },
  { name: "Montaj Aparatı", slug: "montaj-aparati", defaultMarkupPercent: "35", sortOrder: 5 },
  { name: "Aksesuar", slug: "aksesuar", defaultMarkupPercent: "40", sortOrder: 6 },
];

const BRANDS = [
  { name: "DEYE", slug: "deye" },
  { name: "LEXRON", slug: "lexron" },
  { name: "EVE", slug: "eve" },
  { name: "HUAWEI", slug: "huawei" },
  { name: "SOROTEC", slug: "sorotec" },
];

// Ürün görselleri repoda frontend/public/img/products/<slug>.jpg altında durur
// ve frontend servisi tarafından statik sunulur (dış siteye hotlink yok).
// Yeni bir ürün görseli eklerken dosyayı oraya koyup slug'ını bu listeye ekle.
const PRODUCT_IMAGE_SLUGS = new Set<string>([
  "lexron-2000w-24v-modifiye-sinus-inverter",
  "lexron-2000w-12v-modifiye-sinus-inverter",
  "lexron-1200w-24v-modifiye-sinus-inverter",
  "lexron-1200w-12v-modifiye-sinus-inverter",
  "lexron-600w-12v-modifiye-sinus-inverter",
  "lexron-300w-12v-modifiye-sinus-inverter",
  "lexron-1-6kw-hv-mppt-akilli-inverter-12v",
  "lexron-1kw-mppt-plus-akilli-inverter-12v",
  "lexron-off-grid-inverter-datalogger",
  "deye-5kw-hibrit-monofaze-inverter-lv",
  "deye-8kw-hibrit-monofaze-inverter-lv",
  "deye-10kw-hibrit-monofaze-inverter-lv",
  "deye-16kw-hibrit-monofaze-inverter-lv",
  "deye-8kw-hibrit-trifaze-inverter-lv",
  "deye-12kw-hibrit-trifaze-inverter-lv",
  "deye-15kw-hibrit-trifaze-inverter-lv",
  "deye-20kw-hibrit-trifaze-inverter-lv",
  "deye-20kw-hibrit-trifaze-inverter-hv",
  "deye-25kw-hibrit-trifaze-inverter-hv",
  "deye-30kw-hibrit-trifaze-inverter-hv",
  "deye-40kw-hibrit-trifaze-inverter-hv",
  "deye-50kw-hibrit-trifaze-inverter-hv",
  "deye-60kw-hibrit-trifaze-inverter-hv",
  "deye-80kw-hibrit-trifaze-inverter-hv",
]);

function imagesFor(slug: string, name: string) {
  return PRODUCT_IMAGE_SLUGS.has(slug)
    ? [{ url: `/img/products/${slug}.jpg`, alt: name, isPrimary: true }]
    : [];
}

const PRODUCTS: SeedProduct[] = [
  {
    name: "Lexron 550W Half-Cut Monokristal Güneş Paneli",
    category: "gunes-paneli", brand: "lexron", supplier: "lexron",
    costPrice: 3200, markupPercent: 18, fulfillmentType: "stock", stockQty: 48,
    description: "144 hücreli half-cut monokristal panel. Yüksek verim, düşük ışıkta güçlü performans. 12 yıl ürün, 25 yıl performans garantisi.",
  },
  {
    name: "DEYE 605W TopCon Güneş Paneli",
    category: "gunes-paneli", brand: "deye", supplier: "mexxsun",
    costPrice: 3850, markupPercent: 17, fulfillmentType: "stock", stockQty: 36,
    description: "Yeni nesil TOPCon hücre teknolojisi ile %22+ verim. Çatı ve arazi kurulumları için ideal.",
  },
  {
    name: "Lexron 450W Güneş Paneli",
    category: "gunes-paneli", brand: "lexron", supplier: "lexron",
    costPrice: 2650, markupPercent: 18, fulfillmentType: "stock", stockQty: 60,
    description: "Kompakt çatılar için 450W monokristal panel. Dengeli fiyat/performans.",
  },
  {
    name: "EVE 280Ah LiFePO4 Lityum Batarya Hücresi",
    category: "batarya", brand: "eve", supplier: "enerji-pazari",
    costPrice: 2900, markupPercent: 22, fulfillmentType: "stock", stockQty: 80,
    description: "3.2V 280Ah A+ sınıf LiFePO4 hücre. 6000+ çevrim ömrü. DIY batarya paketleri için.",
  },
  {
    name: "DEYE RW-M5.3 5.3kWh LiFePO4 Akü",
    category: "batarya", brand: "deye", supplier: "mexxsun",
    costPrice: 38000, markupPercent: 18, fulfillmentType: "dropship", stockQty: 0,
    description: "Duvar tipi 5.3kWh düşük voltaj batarya modülü. DEYE hibrit inverterlerle tam uyumlu.",
  },
  {
    name: "6mm² Solar Kablo - Kırmızı (100m)",
    category: "solar-kablo", brand: "lexron", supplier: "lexron",
    costPrice: 1450, markupPercent: 30, fulfillmentType: "stock", stockQty: 40,
    description: "TÜV sertifikalı 6mm² PV1-F solar DC kablo. UV ve hava koşullarına dayanıklı. 100 metre makara.",
  },
  {
    name: "4mm² Solar Kablo - Siyah (100m)",
    category: "solar-kablo", brand: "lexron", supplier: "lexron",
    costPrice: 1050, markupPercent: 30, fulfillmentType: "stock", stockQty: 55,
    description: "4mm² PV1-F solar kablo, 100 metre. Çift izolasyon, 1500V DC.",
  },
  {
    name: "MC4 Konnektör Çifti (10 Adet)",
    category: "aksesuar", brand: "lexron", supplier: "lexron",
    costPrice: 280, markupPercent: 40, fulfillmentType: "stock", stockQty: 120,
    description: "IP67 su geçirmez MC4 erkek-dişi konnektör seti. 10 çift. TÜV sertifikalı.",
  },
  {
    name: "Trapez Çatı Montaj Kiti (4 Panel)",
    category: "montaj-aparati", brand: "lexron", supplier: "enerji-pazari",
    costPrice: 1850, markupPercent: 35, fulfillmentType: "stock", stockQty: 25,
    description: "Sac/trapez çatılar için alüminyum montaj kiti. 4 panel kapasiteli, paslanmaz cıvatalar dahil.",
  },
  {
    name: "Alüminyum Montaj Rayı 4.2m",
    category: "montaj-aparati", brand: "lexron", supplier: "enerji-pazari",
    costPrice: 520, markupPercent: 35, fulfillmentType: "stock", stockQty: 90,
    description: "Anodize alüminyum güneş paneli montaj rayı, 4.2 metre. Tüm standart kelepçelerle uyumlu.",
  },
  // -------------------------------------------------------------------------
  // Örnek katalog genişletmesi — mağazanın dolu görünmesi için kategori başına
  // temsili ürünler. Fiyatlar TEMSİLİDİR; gerçek tedarikçi fiyatı geldikçe
  // admin panelinden güncellenmelidir.
  // -------------------------------------------------------------------------

  // --- Güneş panelleri ---
  {
    name: "Lexron 410W Half-Cut Monokristal Güneş Paneli",
    category: "gunes-paneli", brand: "lexron", supplier: "lexron",
    costPrice: 2450, markupPercent: 18, fulfillmentType: "stock", stockQty: 44,
    description: "108 hücreli half-cut monokristal panel. Konut çatıları için dengeli güç/boyut oranı. 12 yıl ürün garantisi.",
  },
  {
    name: "Lexron 285W 12V Güneş Paneli",
    category: "gunes-paneli", brand: "lexron", supplier: "lexron",
    costPrice: 1750, markupPercent: 20, fulfillmentType: "stock", stockQty: 30,
    description: "12V akülü sistemler için monokristal panel. Bağ evi, karavan ve tekne kurulumlarında şarj kontrol cihazıyla doğrudan kullanım.",
  },
  {
    name: "Lexron 205W 12V Güneş Paneli",
    category: "gunes-paneli", brand: "lexron", supplier: "lexron",
    costPrice: 1320, markupPercent: 20, fulfillmentType: "stock", stockQty: 25,
    description: "Kompakt 12V panel. Küçük off-grid sistemler, sulama otomasyonu ve karavan için.",
  },
  {
    name: "DEYE 580W N-Type Bifacial Güneş Paneli",
    category: "gunes-paneli", brand: "deye", supplier: "acs-enerji",
    costPrice: 3650, markupPercent: 17, fulfillmentType: "dropship", stockQty: 0,
    description: "Çift yüzeyli (bifacial) N-Type panel; arka yüz kazancıyla arazi ve carport uygulamalarında ekstra üretim.",
  },

  // --- Bataryalar ---
  {
    name: "Lexron 12V 100Ah Jel Akü",
    category: "batarya", brand: "lexron", supplier: "lexron",
    costPrice: 4200, markupPercent: 22, fulfillmentType: "stock", stockQty: 28,
    description: "Derin deşarj jel akü. Bakım gerektirmez; bağ evi ve küçük off-grid sistemlerin ekonomik depolama çözümü.",
  },
  {
    name: "Lexron 12V 200Ah Jel Akü",
    category: "batarya", brand: "lexron", supplier: "lexron",
    costPrice: 7900, markupPercent: 22, fulfillmentType: "stock", stockQty: 16,
    description: "Yüksek kapasiteli derin deşarj jel akü. Seri/paralel bağlantıyla 24V-48V banka kurulabilir.",
  },
  {
    name: "Lexron 12.8V 100Ah LiFePO4 Lityum Akü",
    category: "batarya", brand: "lexron", supplier: "lexron",
    costPrice: 14500, markupPercent: 20, fulfillmentType: "dropship", stockQty: 0,
    description: "Dahili BMS'li LiFePO4 akü. Jel aküye göre 4-6 kat çevrim ömrü, yarı ağırlık. Karavan ve off-grid sistemler için.",
  },

  // --- Solar kablo ---
  {
    name: "10mm² Solar Kablo - Siyah (100m)",
    category: "solar-kablo", brand: "lexron", supplier: "lexron",
    costPrice: 2400, markupPercent: 30, fulfillmentType: "stock", stockQty: 20,
    description: "10mm² PV1-F solar DC kablo, 100 metre makara. Uzun DC hatlarında düşük gerilim düşümü için.",
  },
  {
    name: "MC4 Uzatma Kablosu 6mm² (5m, çift)",
    category: "solar-kablo", brand: "lexron", supplier: "lexron",
    costPrice: 380, markupPercent: 40, fulfillmentType: "stock", stockQty: 50,
    description: "Her iki ucu MC4 konnektörlü hazır uzatma kablosu çifti (+/-). 5 metre, 6mm² kesit.",
  },

  // --- Montaj aparatı ---
  {
    name: "Kiremit Çatı Montaj Kiti (4 Panel)",
    category: "montaj-aparati", brand: "lexron", supplier: "enerji-pazari",
    costPrice: 2150, markupPercent: 35, fulfillmentType: "stock", stockQty: 18,
    description: "Kiremit çatılar için paslanmaz kanca ve alüminyum ray seti. 4 panel kapasiteli, sızdırmazlık contaları dahil.",
  },
  {
    name: "Panel Kelepçe Seti (Orta + Uç, 4 Panel)",
    category: "montaj-aparati", brand: "lexron", supplier: "enerji-pazari",
    costPrice: 420, markupPercent: 40, fulfillmentType: "stock", stockQty: 60,
    description: "30-35mm çerçeveli paneller için alüminyum orta ve uç kelepçe seti. Paslanmaz cıvatalarla.",
  },
  {
    name: "Ayarlanabilir Üçgen Arazi Sehpası (Çift)",
    category: "montaj-aparati", brand: "lexron", supplier: "enerji-pazari",
    costPrice: 1480, markupPercent: 35, fulfillmentType: "dropship", stockQty: 0,
    description: "15°-30° ayarlanabilir eğimli alüminyum arazi/düz çatı sehpası. Panel başına bir çift kullanılır.",
  },

  // --- Aksesuar ---
  {
    name: "Lexron 40A MPPT Şarj Kontrol Cihazı",
    category: "aksesuar", brand: "lexron", supplier: "lexron",
    costPrice: 3250, markupPercent: 25, fulfillmentType: "stock", stockQty: 14,
    description: "12/24V otomatik, 40A MPPT şarj kontrol cihazı. LCD ekran, %98'e varan dönüşüm verimi.",
  },
  {
    name: "MC4 Pense + Kablo Soyucu Takımı",
    category: "aksesuar", brand: "lexron", supplier: "lexron",
    costPrice: 680, markupPercent: 40, fulfillmentType: "stock", stockQty: 35,
    description: "MC4 konnektör sıkma pensesi, kablo soyucu ve anahtar takımı. Solar kurulumun temel el aleti seti.",
  },
  {
    name: "Batarya Bağlantı Kablosu 25mm² (Çift, 50cm)",
    category: "aksesuar", brand: "lexron", supplier: "lexron",
    costPrice: 460, markupPercent: 40, fulfillmentType: "stock", stockQty: 40,
    description: "Kalaylı bakır 25mm² akü bağlantı kablosu çifti. Pabuçlar basılı, ısı büzüşmeli izolasyon.",
  },
  {
    name: "AC Enerji Analizörü (Tek Faz, WiFi)",
    category: "aksesuar", brand: "deye", supplier: "acs-enerji",
    costPrice: 1850, markupPercent: 30, fulfillmentType: "dropship", stockQty: 0,
    description: "Üretim/tüketim izleme için tek faz enerji analizörü. WiFi üzerinden uygulama desteği.",
  },

  // -------------------------------------------------------------------------
  // İnverter kataloğu — Temmuz 2026.
  // costPrice = firmanın tedarikçiden ALIŞ fiyatı (bayi listesi, RTF).
  // sellPrice = tedarikçinin herkese açık KDV dahil perakende liste fiyatı;
  // site "tedarikçi fiyatına" konumlandığı için satış fiyatı olarak bu
  // kullanılır (marj = bayi iskontosu). sellPrice bilinmeyen yeni ürünlerde
  // alış + %20 markup uygulanır — admin panelinden ayarlanabilir.
  // -------------------------------------------------------------------------

  // --- LEXRON modifiye sinüs inverterler (alış fiyatları bayi listesinden) ---
  {
    name: "Lexron 2000W-24V Modifiye Sinüs İnverter",
    category: "inverter", brand: "lexron", supplier: "lexron",
    costPrice: 5005.44, sellPrice: 11044.80, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "2000W sürekli güç, 24V giriş modifiye sinüs inverter. Karavan, tekne ve şantiye kullanımına uygun. USB çıkışı ve aşırı yük koruması.",
  },
  {
    name: "Lexron 2000W-12V Modifiye Sinüs İnverter",
    category: "inverter", brand: "lexron", supplier: "lexron",
    costPrice: 5005.44, sellPrice: 11044.80, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "2000W sürekli güç, 12V giriş modifiye sinüs inverter. Karavan, tekne ve şantiye kullanımına uygun. USB çıkışı ve aşırı yük koruması.",
  },
  {
    name: "Lexron 1200W-24V Modifiye Sinüs İnverter",
    category: "inverter", brand: "lexron", supplier: "lexron",
    costPrice: 2332.08, sellPrice: 5154.24, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "1200W sürekli güç, 24V giriş modifiye sinüs inverter. Kompakt boyut, sessiz fan, kısa devre ve düşük voltaj koruması.",
  },
  {
    name: "Lexron 1200W-12V Modifiye Sinüs İnverter",
    category: "inverter", brand: "lexron", supplier: "lexron",
    costPrice: 2332.08, sellPrice: 5154.24, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "1200W sürekli güç, 12V giriş modifiye sinüs inverter. Kompakt boyut, sessiz fan, kısa devre ve düşük voltaj koruması.",
  },
  {
    name: "Lexron 600W-12V Modifiye Sinüs İnverter",
    category: "inverter", brand: "lexron", supplier: "lexron",
    // Perakende listesi bu modelde görünmüyordu; aile çarpanı (~×2,21) uygulandı.
    costPrice: 1308.24, sellPrice: 2891.21, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "600W sürekli güç, 12V giriş modifiye sinüs inverter. Küçük cihazlar ve mobil kullanım için ekonomik çözüm.",
  },
  {
    name: "Lexron 300W-12V Modifiye Sinüs İnverter",
    category: "inverter", brand: "lexron", supplier: "lexron",
    costPrice: 910.08, sellPrice: 2011.28, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "300W sürekli güç, 12V giriş modifiye sinüs inverter. Araç içi ve kamp kullanımı için giriş seviyesi model.",
  },

  // --- LEXRON MPPT akıllı inverterler — yeni modeller (alış + %20) ---
  {
    name: "Lexron 1.6kW HV MPPT Akıllı İnverter 12V",
    category: "inverter", brand: "lexron", supplier: "lexron",
    costPrice: 8247.60, markupPercent: 20, fulfillmentType: "dropship", stockQty: 0,
    description: "1.6kW off-grid akıllı inverter, yüksek voltaj MPPT girişli, 12V akü. Kompakt sistemler için yeni nesil model.",
  },
  {
    name: "Lexron 1kW MPPT Plus Akıllı İnverter 12V",
    category: "inverter", brand: "lexron", supplier: "lexron",
    costPrice: 7678.80, markupPercent: 20, fulfillmentType: "dropship", stockQty: 0,
    description: "1kW off-grid akıllı inverter (Plus serisi), MPPT şarj kontrollü, 12V akü. Kamp, karavan ve küçük sistemler için.",
  },
  {
    name: "Lexron Off-Grid İnverter Datalogger",
    category: "aksesuar", brand: "lexron", supplier: "lexron",
    costPrice: 2844.00, markupPercent: 20, fulfillmentType: "dropship", stockQty: 0,
    description: "Lexron off-grid inverterler için WiFi datalogger. Üretim ve tüketimi uygulama üzerinden uzaktan izleme.",
  },

  // --- DEYE hibrit inverterler (dahili WiFi + limiter; alış + %20) ---
  {
    name: "DEYE 5kW Hibrit Monofaze İnverter LV",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 54604.80, markupPercent: 20, fulfillmentType: "dropship", stockQty: 0,
    description: "5kW hibrit monofaze inverter, 48V düşük voltaj akü. Dahili WiFi ve limiter. Konut depolamalı GES sistemleri için.",
  },
  {
    name: "DEYE 8kW Hibrit Monofaze İnverter LV",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 82476.00, markupPercent: 20, fulfillmentType: "dropship", stockQty: 0,
    description: "8kW hibrit monofaze inverter, 48V akü. Dahili WiFi ve limiter. Yüksek tüketimli konutlar için.",
  },
  {
    name: "DEYE 10kW Hibrit Monofaze İnverter LV",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 106934.40, markupPercent: 20, fulfillmentType: "dropship", stockQty: 0,
    description: "10kW hibrit monofaze inverter, 48V akü. Dahili WiFi ve limiter. Monofaze şebekede maksimum güç.",
  },
  {
    name: "DEYE 16kW Hibrit Monofaze İnverter LV",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 145044.00, markupPercent: 20, fulfillmentType: "dropship", stockQty: 0,
    description: "16kW hibrit monofaze inverter, 48V akü. Dahili WiFi ve limiter. Büyük monofaze tesisatlar için.",
  },
  {
    name: "DEYE 8kW Hibrit Trifaze İnverter LV",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 113475.60, markupPercent: 20, fulfillmentType: "dropship", stockQty: 0,
    description: "8kW hibrit trifaze inverter, 48V akü. Dahili WiFi ve limiter. Trifaze konut ve küçük işletmeler için.",
  },
  {
    name: "DEYE 12kW Hibrit Trifaze İnverter LV",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 116604.00, markupPercent: 20, fulfillmentType: "dropship", stockQty: 0,
    description: "12kW hibrit trifaze inverter, 48V akü. Dahili WiFi ve limiter. Depolamalı trifaze sistemler için.",
  },
  {
    name: "DEYE 15kW Hibrit Trifaze İnverter LV",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 141915.60, markupPercent: 20, fulfillmentType: "dropship", stockQty: 0,
    description: "15kW hibrit trifaze inverter, 48V akü. Dahili WiFi ve limiter. İşletme ölçekli depolamalı sistemler için.",
  },
  {
    name: "DEYE 20kW Hibrit Trifaze İnverter LV",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 187704.00, markupPercent: 20, fulfillmentType: "dropship", stockQty: 0,
    description: "20kW hibrit trifaze inverter, 48V akü. Dahili WiFi ve limiter. Düşük voltaj akü bankalı ticari sistemler için.",
  },
  {
    name: "DEYE 20kW Hibrit Trifaze İnverter HV",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 127980.00, markupPercent: 20, fulfillmentType: "dropship", stockQty: 0,
    description: "20kW hibrit trifaze inverter, yüksek voltaj akü. Dahili WiFi ve limiter. Ticari depolamalı GES için.",
  },
  {
    name: "DEYE 25kW Hibrit Trifaze İnverter HV",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 170071.20, markupPercent: 20, fulfillmentType: "dropship", stockQty: 0,
    description: "25kW hibrit trifaze inverter, yüksek voltaj akü. Dahili WiFi ve limiter.",
  },
  {
    name: "DEYE 30kW Hibrit Trifaze İnverter HV",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 213300.00, markupPercent: 20, fulfillmentType: "dropship", stockQty: 0,
    description: "30kW hibrit trifaze inverter, yüksek voltaj akü. Dahili WiFi ve limiter.",
  },
  {
    name: "DEYE 40kW Hibrit Trifaze İnverter HV",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 294069.60, markupPercent: 20, fulfillmentType: "dropship", stockQty: 0,
    description: "40kW hibrit trifaze inverter, yüksek voltaj akü. Dahili WiFi ve limiter. Sanayi ölçekli depolama için.",
  },
  {
    name: "DEYE 50kW Hibrit Trifaze İnverter HV",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 340711.20, markupPercent: 20, fulfillmentType: "dropship", stockQty: 0,
    description: "50kW hibrit trifaze inverter, yüksek voltaj akü. Dahili WiFi ve limiter. Sanayi ölçekli depolama için.",
  },
  {
    name: "DEYE 60kW Hibrit Trifaze İnverter HV",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 369720.00, markupPercent: 20, fulfillmentType: "dropship", stockQty: 0,
    description: "60kW hibrit trifaze inverter, yüksek voltaj akü. Dahili WiFi ve limiter. Büyük ticari santraller için.",
  },
  {
    name: "DEYE 80kW Hibrit Trifaze İnverter HV",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 401004.00, markupPercent: 20, fulfillmentType: "dropship", stockQty: 0,
    description: "80kW hibrit trifaze inverter, yüksek voltaj akü. Dahili WiFi ve limiter. Büyük ticari ve sanayi santralleri için.",
  },

  // --- LEXRON tam sinüs inverterler ---
  // NOT: Bu bölümden itibaren (tam sinüs, akıllı MPPT, Sorotec, Deye on-grid)
  // costPrice olarak tedarikçinin PERAKENDE liste fiyatı yazılıdır (markup %0,
  // satış = liste). Bayi ALIŞ fiyatları geldiğinde modifiye sinüs bölümündeki
  // gibi costPrice/sellPrice ayrımına geçirilmelidir.
  {
    name: "Lexron 2000W-12V Tam Sinüs İnverter (UPS)",
    category: "inverter", brand: "lexron", supplier: "lexron",
    costPrice: 25771.20, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "2000W tam sinüs inverter, dahili UPS (şebeke öncelikli otomatik transfer). Hassas elektronik cihazlar ve kombiler için güvenli dalga formu.",
  },
  {
    name: "Lexron 1000W-12V Tam Sinüs İnverter (UPS)",
    category: "inverter", brand: "lexron", supplier: "lexron",
    costPrice: 13197.12, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "1000W tam sinüs inverter, dahili UPS fonksiyonu. Elektrik kesintisinde kesintisiz geçiş; modem, kombi ve aydınlatma için ideal.",
  },
  {
    name: "Lexron 3000W-12V Tam Sinüs İnverter",
    category: "inverter", brand: "lexron", supplier: "lexron",
    costPrice: 22372.80, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "3000W sürekli güç tam sinüs inverter. Buzdolabı, pompa gibi kalkış akımı yüksek yükleri sürebilir. LED durum göstergesi.",
  },
  {
    name: "Lexron 2000W-12V Tam Sinüs İnverter",
    category: "inverter", brand: "lexron", supplier: "lexron",
    costPrice: 16368.96, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "2000W sürekli güç tam sinüs inverter. Ev tipi cihazlarla tam uyumlu temiz sinüs çıkışı, akıllı fan ve çoklu koruma.",
  },
  {
    name: "Lexron 1000W-24V Tam Sinüs İnverter",
    category: "inverter", brand: "lexron", supplier: "lexron",
    costPrice: 0, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0, status: "draft",
    description: "1000W sürekli güç, 24V giriş tam sinüs inverter. Kompakt gövde, sessiz çalışma.",
  },
  {
    name: "Lexron 1000W-12V Tam Sinüs İnverter",
    category: "inverter", brand: "lexron", supplier: "lexron",
    costPrice: 0, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0, status: "draft",
    description: "1000W sürekli güç, 12V giriş tam sinüs inverter. Kompakt gövde, sessiz çalışma.",
  },
  {
    name: "Lexron 600W-12V Tam Sinüs İnverter",
    category: "inverter", brand: "lexron", supplier: "lexron",
    costPrice: 0, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0, status: "draft",
    description: "600W sürekli güç, 12V giriş tam sinüs inverter. Hassas cihazlar için temiz sinüs, giriş seviyesi güç.",
  },

  // --- LEXRON / SOROTEC akıllı (MPPT şarjlı) inverterler ---
  {
    name: "Lexron 11kW HV 2xMPPT Akıllı İnverter 48V",
    category: "inverter", brand: "lexron", supplier: "lexron",
    costPrice: 73632.00, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "11kW off-grid akıllı inverter, çift MPPT yüksek voltaj PV girişi, 48V akü. Paralel çalışma desteği ile büyük sistemlere ölçeklenir.",
  },
  {
    name: "Lexron 8kW HV MPPT Akıllı İnverter 48V",
    category: "inverter", brand: "lexron", supplier: "lexron",
    costPrice: 56640.00, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "8kW off-grid akıllı inverter, yüksek voltaj MPPT şarj kontrollü, 48V akü. WiFi izleme opsiyonu.",
  },
  {
    name: "Lexron 6.2kW HV MPPT Akıllı İnverter 48V",
    category: "inverter", brand: "lexron", supplier: "lexron",
    costPrice: 35286.72, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "6.2kW off-grid akıllı inverter, HV MPPT girişli, 48V akü. Ev ve bağ evi sistemleri için güçlü tek ünite çözüm.",
  },
  {
    name: "Lexron 4.2kW HV MPPT Akıllı İnverter 24V",
    category: "inverter", brand: "lexron", supplier: "lexron",
    costPrice: 28320.00, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "4.2kW off-grid akıllı inverter, HV MPPT şarj kontrollü, 24V akü. Orta ölçekli off-grid sistemler için.",
  },
  {
    name: "Lexron 3kW HV MPPT Akıllı İnverter 24V",
    category: "inverter", brand: "lexron", supplier: "lexron",
    costPrice: 20107.20, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "3kW off-grid akıllı inverter, HV MPPT girişli, 24V akü. Bağ evi ve küçük ev sistemlerinin standardı.",
  },
  {
    name: "Lexron 1kW MPPT Akıllı İnverter 12V",
    category: "inverter", brand: "lexron", supplier: "lexron",
    costPrice: 15066.24, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "1kW off-grid akıllı inverter, MPPT şarj kontrollü, 12V akü. Kamp, karavan ve küçük sistemler için hepsi bir arada.",
  },
  {
    name: "Sorotec 5.5kW HV MPPT Akıllı İnverter 48V",
    category: "inverter", brand: "sorotec", supplier: "lexron",
    costPrice: 32851.20, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "5.5kW off-grid akıllı inverter, yüksek voltaj MPPT, 48V akü. Renkli LCD ekran, geniş PV giriş aralığı.",
  },
  {
    name: "Sorotec 1.5kW HV MPPT Akıllı İnverter 12V",
    category: "inverter", brand: "sorotec", supplier: "lexron",
    costPrice: 16312.32, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "1.5kW off-grid akıllı inverter, HV MPPT girişli, 12V akü. Kompakt sistemler için ekonomik akıllı çözüm.",
  },

  // --- DEYE on-grid inverterler (ACS Enerji) ---
  {
    name: "DEYE 3kW On-Grid Monofaze İnverter",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 33247.68, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "3kW şebeke bağlantılı monofaze inverter. Dahili limiter ve WiFi ile üretim/tüketim izleme. Çatı GES mahsuplaşma sistemleri için.",
  },
  {
    name: "DEYE 5kW On-Grid Monofaze İnverter",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 45312.00, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "5kW şebeke bağlantılı monofaze inverter. Dahili limiter ve WiFi. Konut çatı sistemlerinin en yaygın gücü.",
  },
  {
    name: "DEYE 10kW On-Grid Trifaze İnverter",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 78049.92, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "10kW şebeke bağlantılı trifaze inverter. Dahili enerjimeter ve WiFi. Büyük konut ve küçük işletme çatıları için.",
  },
  {
    name: "DEYE 20kW On-Grid Trifaze İnverter",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 113280.00, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "20kW şebeke bağlantılı trifaze inverter. Dahili enerjimeter ve WiFi. Ticari çatı GES projeleri için.",
  },
  {
    name: "DEYE 25kW On-Grid Trifaze İnverter",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 117697.92, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "25kW şebeke bağlantılı trifaze inverter. Dahili enerjimeter ve WiFi. Ticari ve tarımsal GES kurulumları için.",
  },
  {
    name: "DEYE 30kW On-Grid Trifaze İnverter",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 135936.00, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "30kW şebeke bağlantılı trifaze inverter. Dahili enerjimeter ve WiFi. Orta ölçekli ticari projeler için.",
  },
  {
    name: "DEYE 50kW On-Grid Trifaze İnverter",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 250632.00, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "50kW şebeke bağlantılı trifaze inverter. Dahili enerjimeter ve WiFi. Sanayi çatıları ve arazi GES için.",
  },
  {
    name: "DEYE 100kW On-Grid Trifaze İnverter",
    category: "inverter", brand: "deye", supplier: "acs-enerji",
    costPrice: 434202.24, markupPercent: 0, fulfillmentType: "dropship", stockQty: 0,
    description: "100kW şebeke bağlantılı trifaze inverter. Dahili enerjimeter ve WiFi. Büyük ölçekli ticari ve sanayi GES santralleri için.",
  },

  {
    name: "DC Sigorta + Parafudr Koruma Kutusu",
    category: "aksesuar", brand: "lexron", supplier: "mexxsun",
    costPrice: 1650, markupPercent: 38, fulfillmentType: "dropship", stockQty: 0,
    description: "2 string DC kombiner kutu. Parafudr (SPD), DC sigortalar ve şalter dahil. IP65.",
  },
];

export async function seedDatabase() {
  console.log("Seed başlıyor...");

  // 1) Tenant
  await db
    .insert(tenants)
    .values({ name: "GES MARKETİM", slug: "gesmarketim" })
    .onConflictDoNothing();
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, "gesmarketim"));
  if (!tenant) throw new Error("Tenant oluşturulamadı");
  const tenantId = tenant.id;
  console.log("✓ tenant:", tenant.slug);

  // 2) Suppliers (admin-only, müşteriye görünmez)
  // Sabit %22 dönemi: kademeli marj BOŞ seed'lenir (defaultMarkupPercent:
  // null) — listedeki tarihsel değerler kademeye dönüş için belge niteliğinde.
  await db
    .insert(suppliers)
    .values(
      SUPPLIERS.map((s) => ({
        tenantId,
        name: s.name,
        slug: s.slug,
        defaultMarkupPercent: null,
        isVisibleToCustomer: false,
      })),
    )
    .onConflictDoNothing();
  console.log(`✓ suppliers: ${SUPPLIERS.length}`);

  // 3) Categories — kademeli marj boş (bkz. suppliers notu)
  await db
    .insert(categories)
    .values(
      CATEGORIES.map((c) => ({
        tenantId,
        name: c.name,
        slug: c.slug,
        defaultMarkupPercent: null,
        sortOrder: c.sortOrder,
      })),
    )
    .onConflictDoNothing();
  console.log(`✓ categories: ${CATEGORIES.length}`);

  // 4) Brands
  await db
    .insert(brands)
    .values(BRANDS.map((b) => ({ tenantId, ...b })))
    .onConflictDoNothing();
  console.log(`✓ brands: ${BRANDS.length}`);

  // Lookup maps for product foreign keys
  const catRows = await db.select().from(categories).where(eq(categories.tenantId, tenantId));
  const brandRows = await db.select().from(brands).where(eq(brands.tenantId, tenantId));
  const supRows = await db.select().from(suppliers).where(eq(suppliers.tenantId, tenantId));
  const catId = new Map(catRows.map((c) => [c.slug, c.id]));
  const brandId = new Map(brandRows.map((b) => [b.slug, b.id]));
  const supId = new Map(supRows.map((s) => [s.slug, s.id]));

  // 5) Products (finalPrice computed via the pricing engine)
  let created = 0;
  let backfilled = 0;
  for (const p of PRODUCTS) {
    const slug = slugify(p.name);
    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.slug, slug)))
      .limit(1);
    if (existing.length > 0) {
      // Görsel backfill: daha önce görselsiz seed'lenmiş üründe artık repo
      // görseli varsa doldur. Yalnızca images boşken yazar — admin'in
      // yüklediği görsellerin üzerine asla yazmaz.
      if (PRODUCT_IMAGE_SLUGS.has(slug)) {
        const updated = await db
          .update(products)
          .set({ images: imagesFor(slug, p.name), updatedAt: new Date() })
          .where(
            and(
              eq(products.tenantId, tenantId),
              eq(products.slug, slug),
              sql`jsonb_array_length(${products.images}) = 0`,
            ),
          )
          .returning({ id: products.id });
        if (updated.length > 0) backfilled++;
      }
      continue;
    }

    // Sabit %22 dönemi: ürün seviyesinde marj override YAZILMAZ; fiyat
    // tenant.defaultMarkup üzerinden hesaplanır (kademeler boş → %22).
    const { finalPrice } = computeFinalPrice(
      {
        costPrice: p.costPrice,
        productMarkupPct: null,
        supplierMarkupPct: null,
        categoryMarkupPct: null,
      },
      {
        defaultMarkup: tenant.defaultMarkup,
        fxUsdTry: tenant.fxUsdTry,
        fxBufferPct: tenant.fxBufferPct,
        minProfitPct: tenant.minProfitPct,
      },
    );

    await db.insert(products).values({
      tenantId,
      slug,
      name: p.name,
      description: p.description,
      brandId: brandId.get(p.brand) ?? null,
      categoryId: catId.get(p.category) ?? null,
      supplierId: supId.get(p.supplier) ?? null,
      costPrice: String(p.costPrice),
      markupPercent: null,
      finalPrice: finalPrice.toFixed(2),
      currency: "TRY",
      fulfillmentType: p.fulfillmentType,
      stockQty: p.stockQty,
      images: imagesFor(slug, p.name),
      status: p.status ?? "active",
    });
    created++;
  }
  console.log(
    `✓ products: ${created} eklendi (${PRODUCTS.length - created} zaten vardı, ${backfilled} görsel backfill)`,
  );

  console.log("Seed tamamlandı ✅");
}
