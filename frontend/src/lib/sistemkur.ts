// Sistem Kur v2 — /api/hesapla, /api/asistan ve /api/leads istemcileri +
// sihirbaz yolunda katalogdan ürün eşleştirme.
//
// Kural: fiyat/watt/adet burada ÜRETİLMEZ — fiyatlar canlı /api/products
// verisinden, boyutlandırma backend /api/hesapla motorundan gelir. Buradaki
// eşleştirme yalnızca "gereksinimi karşılayan en uygun katalog ürünü"nü seçer.

import type { PublicProduct } from './api';

const API_URL = import.meta.env.VITE_API_URL || '';

// ---------------------------------------------------------------------------
// /api/hesapla
// ---------------------------------------------------------------------------

export type Senaryo =
  | 'karavan'
  | 'bag_evi'
  | 'mustakil_ev'
  | 'isletme'
  | 'tarimsal_sulama';

export type HesaplaCihaz = {
  ad: string;
  adet: number;
  watt: number;
  saatGun: number;
};

export type HesaplaRequest = {
  senaryo: Senaryo;
  cihazlar?: HesaplaCihaz[];
  pompa?: { hp: number; gunlukSaat: number };
  ozerklikGun?: number;
  bolge?: string;
};

export type HesaplaSonuc = {
  gunlukTuketimWh: number;
  gereksinim: {
    panelWatt: number;
    invertorWatt?: number;
    invertorTip?: 'tam_sinus_mppt';
    akuWh?: number;
    akuOnerisi?: 'lityum' | 'jel';
    pompaSurucuHp?: number;
    pompaSurucuKw?: number;
  };
  tasarruf: { yillikUretimKwh: number; yillikTasarrufTL: number };
  notlar: string[];
};

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let data: { error?: string; message?: string } = {};
    try {
      data = await res.json();
    } catch {
      /* ignore */
    }
    const err = new Error(data.message || `İstek başarısız (${res.status}).`);
    err.name = data.error || 'ApiError';
    throw err;
  }
  return (await res.json()) as T;
}

export function hesapla(req: HesaplaRequest): Promise<HesaplaSonuc> {
  return postJson<HesaplaSonuc>('/api/hesapla', req);
}

// ---------------------------------------------------------------------------
// /api/asistan
// ---------------------------------------------------------------------------

export type GecmisTur = { rol: 'user' | 'asistan'; metin: string };

export type AsistanTeklifUrun = {
  productId: string;
  slug: string;
  ad: string;
  adet: number;
  birimFiyat: number;
};

export type AsistanTeklif = {
  urunler: AsistanTeklifUrun[];
  paketSku: string | null;
  toplamTL: number;
  hesapOzeti: string;
};

export type AsistanYanit = {
  tip: 'soru' | 'teklif';
  metin: string;
  teklif?: AsistanTeklif;
};

/** Asistan servis dışı (API anahtarı yok / upstream hatası / ağ) — sihirbaza düş. */
export class AsistanKapaliError extends Error {
  constructor() {
    super('asistan_kapali');
    this.name = 'AsistanKapaliError';
  }
}

export async function asistanSor(
  mesaj: string,
  gecmis: GecmisTur[],
): Promise<AsistanYanit> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/asistan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ mesaj, gecmis }),
    });
  } catch {
    throw new AsistanKapaliError();
  }
  if (!res.ok) {
    let data: { error?: string; message?: string } = {};
    try {
      data = await res.json();
    } catch {
      /* ignore */
    }
    // 400 (doğrulama) ve 429 (saatlik limit) kullanıcıya kendi mesajıyla
    // gösterilir; 502/503 ve diğerleri "asistan kapalı" akışına düşer.
    if ((res.status === 400 || res.status === 429) && data.message) {
      throw new Error(data.message);
    }
    throw new AsistanKapaliError();
  }
  return (await res.json()) as AsistanYanit;
}

// ---------------------------------------------------------------------------
// /api/leads
// ---------------------------------------------------------------------------

export type LeadPayload = {
  tip: 'dogrulama' | 'whatsapp' | 'pdf';
  ad: string;
  telefon: string;
  email?: string;
  ozet?: unknown;
};

export async function sendLead(payload: LeadPayload): Promise<void> {
  await postJson<{ ok: boolean }>('/api/leads', payload);
}

// ---------------------------------------------------------------------------
// Senaryo / cihaz tanımları (sihirbaz)
// Watt ve saat değerleri yalnızca TÜKETİM varsayımıdır (fiyat değildir);
// hesap yine backend motorunda yapılır.
// ---------------------------------------------------------------------------

export type SenaryoTanim = {
  id: Senaryo;
  ad: string;
  emoji: string;
  aciklama: string;
};

export const SENARYOLAR: SenaryoTanim[] = [
  {
    id: 'karavan',
    ad: 'Karavan / Tekne',
    emoji: '🚐',
    aciklama: 'Kompakt sistem — buzdolabı, aydınlatma, şarj.',
  },
  {
    id: 'bag_evi',
    ad: 'Bağ Evi (hafta sonu)',
    emoji: '🏡',
    aciklama: 'Temel konfor: buzdolabı, TV, aydınlatma, su pompası.',
  },
  {
    id: 'mustakil_ev',
    ad: 'Müstakil Ev (sürekli)',
    emoji: '🏠',
    aciklama: 'Çamaşır makinesi ve klima dahil tam ev yükü.',
  },
  {
    id: 'isletme',
    ad: 'İşletme / Ticari',
    emoji: '🏭',
    aciklama: 'Yüksek tüketim — soğutma, aydınlatma, ofis yükleri.',
  },
  {
    id: 'tarimsal_sulama',
    ad: 'Tarımsal Sulama',
    emoji: '🌱',
    aciklama: 'Gündüz güneşle çalışan pompa — bahçe, sera ve tarla.',
  },
];

export type CihazTanim = {
  id: string;
  ad: string;
  emoji: string;
  watt: number;
  saatGun: number;
  senaryolar: Senaryo[];
};

const EV_HEPSI: Senaryo[] = ['karavan', 'bag_evi', 'mustakil_ev', 'isletme'];

export const CIHAZLAR: CihazTanim[] = [
  { id: 'led', ad: 'LED aydınlatma (ampul başı)', emoji: '💡', watt: 10, saatGun: 6, senaryolar: EV_HEPSI },
  { id: 'buzdolabi', ad: 'Buzdolabı (A++)', emoji: '🧊', watt: 100, saatGun: 10, senaryolar: EV_HEPSI },
  { id: 'tv', ad: 'TV + uydu', emoji: '📺', watt: 80, saatGun: 5, senaryolar: EV_HEPSI },
  { id: 'sarj', ad: 'Telefon / laptop şarjı', emoji: '🔌', watt: 60, saatGun: 3, senaryolar: EV_HEPSI },
  { id: 'su_pompasi', ad: 'Su pompası / hidrofor', emoji: '🚿', watt: 750, saatGun: 1.5, senaryolar: ['bag_evi', 'mustakil_ev', 'isletme'] },
  { id: 'camasir', ad: 'Çamaşır makinesi', emoji: '🌀', watt: 600, saatGun: 1, senaryolar: ['mustakil_ev', 'isletme'] },
  { id: 'klima', ad: 'Klima (12.000 BTU inverter)', emoji: '❄️', watt: 1000, saatGun: 4, senaryolar: ['mustakil_ev', 'isletme'] },
  { id: 'kettle', ad: 'Kettle / su ısıtıcı', emoji: '☕', watt: 1800, saatGun: 0.3, senaryolar: ['bag_evi', 'mustakil_ev', 'isletme'] },
];

export type ProfilTanim = {
  id: string;
  ad: string;
  aciklama: string;
  adetler: Record<string, number>;
};

/** Karavan ve bağ evi için 3'lü hazır profil; diğerleri doğrudan detay listesi. */
export const PROFILLER: Partial<Record<Senaryo, ProfilTanim[]>> = {
  karavan: [
    { id: 'minimal', ad: 'Minimal', aciklama: 'Aydınlatma + telefon şarjı', adetler: { led: 2, sarj: 1 } },
    { id: 'standart', ad: 'Standart', aciklama: 'Buzdolabı, aydınlatma, şarj', adetler: { led: 4, buzdolabi: 1, sarj: 1 } },
    { id: 'konforlu', ad: 'Konforlu', aciklama: 'Buzdolabı, TV ve fazlası', adetler: { led: 6, buzdolabi: 1, tv: 1, sarj: 2 } },
  ],
  bag_evi: [
    { id: 'minimal', ad: 'Minimal', aciklama: 'Aydınlatma + telefon şarjı', adetler: { led: 4, sarj: 1 } },
    { id: 'standart', ad: 'Standart', aciklama: 'Buzdolabı, TV, aydınlatma', adetler: { led: 6, buzdolabi: 1, tv: 1, sarj: 1 } },
    { id: 'konforlu', ad: 'Konforlu', aciklama: 'Su pompası ve kettle dahil', adetler: { led: 8, buzdolabi: 1, tv: 1, sarj: 2, su_pompasi: 1, kettle: 1 } },
  ],
};

/** Detay listesi doğrudan açılan senaryoların başlangıç adetleri. */
export const VARSAYILAN_ADETLER: Partial<Record<Senaryo, Record<string, number>>> = {
  mustakil_ev: { led: 8, buzdolabi: 1, tv: 1, sarj: 2, su_pompasi: 1, camasir: 1, klima: 1, kettle: 1 },
  isletme: { led: 12, buzdolabi: 2, tv: 1, sarj: 4, su_pompasi: 1, klima: 2 },
};

/** Pompa sürücü kademeleri — backend POMPA_KADEMELERI ile birebir (katalog HP basamakları). */
export const POMPA_KADEMELERI: ReadonlyArray<{ hp: number; kw: number }> = [
  { hp: 3, kw: 2.2 },
  { hp: 5.5, kw: 4 },
  { hp: 7.5, kw: 5.5 },
  { hp: 10, kw: 7.5 },
  { hp: 15, kw: 11 },
  { hp: 20, kw: 15 },
  { hp: 25, kw: 18.5 },
  { hp: 30, kw: 22 },
  { hp: 40, kw: 30 },
  { hp: 120, kw: 90 },
];

// ---------------------------------------------------------------------------
// Katalog eşleştirme (sihirbaz yolu — AI kapalıyken de çalışır)
// ---------------------------------------------------------------------------

export type TeklifKalem = { product: PublicProduct; adet: number };

export type EslesmeSonucu = {
  kalemler: TeklifKalem[];
  /** Katalogda karşılığı bulunamayan gereksinimler (kullanıcıya gösterilir). */
  eksikler: string[];
};

/** Türkçe karakterleri sadeleştirip küçük harfe indirir ("İnvertör" → "invertor"). */
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .toLowerCase();
}

function sayi(raw: string): number {
  return Number(raw.replace(',', '.'));
}

/** Ürün adından watt çıkarır: "450W", "2000W-24V", "4kW", "1.6KW". */
function wattOf(name: string): number | null {
  const n = norm(name);
  const kw = n.match(/(\d+(?:[.,]\d+)?)\s*k\s?w(?!h)/);
  if (kw) return sayi(kw[1]) * 1000;
  const w = n.match(/(\d+(?:[.,]\d+)?)\s*w(?!h)/);
  if (w) return sayi(w[1]);
  return null;
}

/** Akü kapasitesi (Wh): "5.3kWh" doğrudan; "12V 100Ah" → V×Ah (V yoksa 12V). */
function whOf(name: string): number | null {
  const n = norm(name);
  const kwh = n.match(/(\d+(?:[.,]\d+)?)\s*kwh/);
  if (kwh) return sayi(kwh[1]) * 1000;
  const ah = n.match(/(\d+(?:[.,]\d+)?)\s*ah/);
  if (!ah) return null;
  const volt = n.match(/(\d+(?:[.,]\d+)?)\s*v(?![a-z0-9])/);
  return sayi(ah[1]) * (volt ? sayi(volt[1]) : 12);
}

function hpOf(name: string): number | null {
  const m = norm(name).match(/(\d+(?:[.,]\d+)?)\s*hp/);
  return m ? sayi(m[1]) : null;
}

type UrunTip = 'panel' | 'inverter' | 'aku' | 'pompa' | 'diger';

function tipOf(p: PublicProduct): UrunTip {
  const kat = norm(`${p.category?.slug ?? ''} ${p.category?.name ?? ''}`);
  if (kat.includes('panel')) return 'panel';
  if (kat.includes('pompa')) return 'pompa';
  if (kat.includes('aku') || kat.includes('batarya')) return 'aku';
  if (kat.includes('inverter') || kat.includes('invertor')) return 'inverter';
  return 'diger';
}

function akuTipi(name: string): 'lityum' | 'jel' | 'bilinmiyor' {
  const n = norm(name);
  if (/lityum|lifepo|li-?ion|lithium/.test(n)) return 'lityum';
  if (/jel|agm|gel/.test(n)) return 'jel';
  return 'bilinmiyor';
}

/** [adet, toplam fiyat] ikilisine göre en küçüğü seçer (önce adet, sonra fiyat). */
function enUcuzKonfig(
  adaylar: Array<{ product: PublicProduct; birimDeger: number }>,
  hedef: number,
  maxAdet: number,
): TeklifKalem | null {
  let best: { kalem: TeklifKalem; toplam: number } | null = null;
  for (const a of adaylar) {
    if (a.birimDeger <= 0) continue;
    const adet = Math.ceil(hedef / a.birimDeger);
    if (adet < 1 || adet > maxAdet) continue;
    const toplam = adet * a.product.price;
    if (
      !best ||
      adet < best.kalem.adet ||
      (adet === best.kalem.adet && toplam < best.toplam)
    ) {
      best = { kalem: { product: a.product, adet }, toplam };
    }
  }
  return best?.kalem ?? null;
}

/**
 * Hesap sonucundaki gereksinimi stoktaki katalog ürünleriyle karşılar.
 * Panel: gereksinimi karşılayan en az adet (eşitlikte en ucuz toplam).
 * İnverter: gereksinimin bir üst kademesi (tam sinüs tercih edilir).
 * Akü: önerilen kimyada Wh'ı karşılayan en az adet.
 * Pompa sürücüsü: HP kademesini karşılayan en küçük sürücü.
 */
export function urunEslestir(
  sonuc: HesaplaSonuc,
  products: PublicProduct[],
): EslesmeSonucu {
  const stokta = products.filter((p) => p.inStock);
  const kalemler: TeklifKalem[] = [];
  const eksikler: string[] = [];
  const g = sonuc.gereksinim;

  // --- Panel ---
  const paneller = stokta
    .filter((p) => tipOf(p) === 'panel')
    .map((p) => ({ product: p, birimDeger: wattOf(p.name) ?? 0 }))
    .filter((a) => a.birimDeger >= 50); // küçük bakım panellerini eleme
  const panelKalem = enUcuzKonfig(paneller, g.panelWatt, 60);
  if (panelKalem) kalemler.push(panelKalem);
  else eksikler.push(`${g.panelWatt} W panel gücü için uygun panel bulunamadı.`);

  // --- İnverter (ev tipi senaryolar) ---
  if (g.invertorWatt && g.invertorWatt > 0) {
    const inverterler = stokta
      .filter((p) => tipOf(p) === 'inverter')
      .map((p) => ({ product: p, watt: wattOf(p.name) }))
      .filter((a): a is { product: PublicProduct; watt: number } => a.watt !== null);
    const secim = (havuz: typeof inverterler) => {
      let best: { product: PublicProduct; watt: number } | null = null;
      for (const a of havuz) {
        if (a.watt < g.invertorWatt!) continue;
        if (
          !best ||
          a.watt < best.watt ||
          (a.watt === best.watt && a.product.price < best.product.price)
        ) {
          best = a;
        }
      }
      return best;
    };
    // Önce tam sinüs (modifiye olmayan); yoksa herhangi bir uygun inverter.
    const tamSinus = inverterler.filter((a) => !norm(a.product.name).includes('modifiye'));
    const inv = secim(tamSinus) ?? secim(inverterler);
    if (inv) kalemler.push({ product: inv.product, adet: 1 });
    else
      eksikler.push(
        `${g.invertorWatt} W ve üzeri inverter kataloğumuzda şu an stokta yok.`,
      );
  }

  // --- Akü ---
  if (g.akuWh && g.akuWh > 0) {
    const akuler = stokta
      .filter((p) => tipOf(p) === 'aku')
      .map((p) => ({ product: p, birimDeger: whOf(p.name) ?? 0 }))
      .filter((a) => a.birimDeger > 0);
    const oneri = g.akuOnerisi ?? 'lityum';
    const tercih = akuler.filter((a) => akuTipi(a.product.name) === oneri);
    const akuKalem =
      enUcuzKonfig(tercih, g.akuWh, 32) ?? enUcuzKonfig(akuler, g.akuWh, 32);
    if (akuKalem) kalemler.push(akuKalem);
    else
      eksikler.push(
        `${(g.akuWh / 1000).toFixed(1)} kWh depolama için uygun akü bulunamadı.`,
      );
  }

  // --- Pompa sürücüsü (tarımsal sulama) ---
  if (g.pompaSurucuHp && g.pompaSurucuHp > 0) {
    const surucular = stokta
      .filter((p) => tipOf(p) === 'pompa')
      .map((p) => ({ product: p, hp: hpOf(p.name) }))
      .filter((a): a is { product: PublicProduct; hp: number } => a.hp !== null);
    let best: { product: PublicProduct; hp: number } | null = null;
    for (const a of surucular) {
      if (a.hp < g.pompaSurucuHp) continue;
      if (
        !best ||
        a.hp < best.hp ||
        (a.hp === best.hp && a.product.price < best.product.price)
      ) {
        best = a;
      }
    }
    if (best) kalemler.push({ product: best.product, adet: 1 });
    else
      eksikler.push(
        `${g.pompaSurucuHp} HP pompa sürücüsü kataloğumuzda şu an stokta yok.`,
      );
  }

  return { kalemler, eksikler };
}
