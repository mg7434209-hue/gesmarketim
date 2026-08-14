// ============================================================================
// Sistem Kur v2 — deterministik hesap motoru (AI'sız, birim testli).
//
// Formüller docs/hesaplayici-spec.md (Antalya kalibrasyonu) ve mevcut Sistem
// Kurucu boyutlandırmasından taşındı — DEĞİŞTİRİLMEDİ:
//   günlükWh   = Σ adet × watt × saatGün
//   inverterW  = max(toplamW × eşzamanlılık, enBüyükCihazW) × emniyet
//   panelW     = günlükWh / (güneşSaat × sistemVerim)
//   aküWh      = günlükWh × özerklikGün / DoD / inverterVerim
//   tarımsal   : akü YOK; panelW = sürücüKw × 1000 × pvOversize (spec pump),
//                sürücü kademesi katalog HP basamaklarına YUKARI yuvarlanır
//   tasarruf   : yıllıkÜretim = panelW/1000 × bölgeVerim;
//                ₺ = yıllıkÜretim × ELEKTRIK_BIRIM_FIYAT_TL
//
// KURAL: hiçbir katsayı route/prompta gömülmez; hepsi bu dosyadaki KATSAYILAR
// nesnesinde (elektrik birim fiyatı env'den, spec varsayılanıyla).
// ============================================================================

import { z } from "zod";

// ---------------------------------------------------------------------------
// Katsayılar — Antalya kalibrasyonu (spec + Sistem Kurucu sizing)
// ---------------------------------------------------------------------------
export const KATSAYILAR = {
  sunHours: 4.2, // güneşlenme (kWh/kWp/gün) — kış ağırlıklı, temkinli
  systemEff: 0.75, // panel→priz toplam sistem verimi
  invEff: 0.93, // inverter/şarj verimi (akü boyutunda)
  simultaneity: 0.7, // cihazların aynı anda çalışma oranı
  surgeHeadroom: 1.25, // inverter gücü emniyet payı
  dod: { lityum: 0.9, jel: 0.5 } as Record<string, number>,
  bolgeVerim: { antalya: 1650 } as Record<string, number>, // kWh/kWp/yıl (Akdeniz)
  pumpOversize: 1.35, // spec pump pvOversize: panel/sürücü oranı
  panelRoundW: 50, // panel gücü yuvarlama adımı (W)
  invRoundW: 100, // inverter gücü yuvarlama adımı (W)
} as const;

/** ₺/kWh — env ELEKTRIK_BIRIM_FIYAT_TL, yoksa spec defaultUnitPrice (2.5). */
export function elektrikBirimFiyatTL(): number {
  const v = Number(process.env.ELEKTRIK_BIRIM_FIYAT_TL);
  return Number.isFinite(v) && v > 0 ? v : 2.5;
}

// Solar pompa sürücü kademeleri — katalogdaki HP basamaklarıyla birebir.
// Pompa HP'si bir kademeye denk gelmiyorsa YUKARI yuvarlanır.
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
// Girdi doğrulama (zod) — saçma değerlerde anlaşılır Türkçe mesaj
// ---------------------------------------------------------------------------
const cihazSchema = z.object({
  ad: z.string().min(1, "Cihaz adı boş olamaz").max(80),
  adet: z.number().int().min(1).max(100, "Cihaz adedi 100'ü aşamaz"),
  watt: z.number().min(1).max(20000, "Cihaz gücü 20.000 W'ı aşamaz"),
  saatGun: z.number().min(0).max(24, "Günlük kullanım 24 saati aşamaz"),
});

export const hesaplaInputSchema = z
  .object({
    senaryo: z.enum(["karavan", "bag_evi", "mustakil_ev", "isletme", "tarimsal_sulama"], {
      error: "Geçersiz senaryo — karavan, bag_evi, mustakil_ev, isletme veya tarimsal_sulama olmalı",
    }),
    cihazlar: z.array(cihazSchema).min(1).max(50, "En fazla 50 cihaz girilebilir").optional(),
    pompa: z
      .object({
        hp: z.number().min(0.5, "Pompa gücü en az 0,5 HP olmalı").max(200, "Pompa gücü 200 HP'yi aşamaz"),
        gunlukSaat: z.number().min(0.5).max(24, "Günlük sulama 24 saati aşamaz"),
      })
      .optional(),
    ozerklikGun: z.number().min(0).max(7, "Özerklik en fazla 7 gün olabilir").default(1),
    bolge: z.string().default("antalya"),
  })
  .superRefine((v, ctx) => {
    if (v.cihazlar && v.pompa) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "cihazlar ve pompa birlikte gönderilemez" });
    }
    if (!v.cihazlar && !v.pompa) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "cihazlar veya pompa zorunludur" });
    }
    if (v.senaryo === "tarimsal_sulama" && !v.pompa) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tarımsal sulama senaryosunda pompa bilgisi gerekir" });
    }
    if (v.senaryo !== "tarimsal_sulama" && v.pompa) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Pompa yalnızca tarımsal sulama senaryosunda girilir" });
    }
  });

export type HesaplaInput = z.infer<typeof hesaplaInputSchema>;

export interface HesaplaSonuc {
  gunlukTuketimWh: number;
  gereksinim: {
    panelWatt: number;
    invertorWatt?: number;
    invertorTip?: "tam_sinus_mppt";
    akuWh?: number;
    akuOnerisi?: "lityum" | "jel";
    pompaSurucuHp?: number;
    pompaSurucuKw?: number;
  };
  tasarruf: { yillikUretimKwh: number; yillikTasarrufTL: number };
  notlar: string[];
}

// Kayan nokta gürültüsü (11×1000×1.35 = 14850.000000000002) bir üst adıma
// sıçratmasın diye önce 1e-6 hassasiyetine yuvarlanır.
const roundUpTo = (v: number, step: number) =>
  Math.ceil(Math.round(v * 1e6) / 1e6 / step) * step;

// ---------------------------------------------------------------------------
// Motor
// ---------------------------------------------------------------------------
export function hesapla(input: HesaplaInput): HesaplaSonuc {
  const K = KATSAYILAR;
  const bolgeVerim = K.bolgeVerim[input.bolge] ?? K.bolgeVerim.antalya;
  const birimFiyat = elektrikBirimFiyatTL();
  const notlar: string[] = ["Kış ayı ışınımına göre boyutlandırıldı (Antalya kalibrasyonu)."];

  // ---- Tarımsal sulama: akü YOK, sürücü kademesi YUKARI yuvarlanır ----
  if (input.senaryo === "tarimsal_sulama" && input.pompa) {
    const kademe =
      POMPA_KADEMELERI.find((k) => k.hp >= input.pompa!.hp) ??
      POMPA_KADEMELERI[POMPA_KADEMELERI.length - 1];
    if (input.pompa.hp > POMPA_KADEMELERI[POMPA_KADEMELERI.length - 1].hp) {
      notlar.push("Pompa gücü katalogdaki en büyük sürücü kademesini aşıyor; en büyük kademe önerildi.");
    } else if (kademe.hp !== input.pompa.hp) {
      notlar.push(`Pompa gücü ${kademe.hp} HP sürücü kademesine yukarı yuvarlandı.`);
    }

    // Emniyet katsayısı spec'ten (pump pvOversize): panel = sürücüKw × 1000 × 1.35
    const panelWatt = roundUpTo(kademe.kw * 1000 * K.pumpOversize, K.panelRoundW);
    const gunlukTuketimWh = Math.round(kademe.kw * 1000 * input.pompa.gunlukSaat);
    const yillikUretimKwh = Math.round((panelWatt / 1000) * bolgeVerim);

    notlar.push("Tarımsal sulamada akü önerilmez — pompa gündüz doğrudan güneşten çalışır.");
    return {
      gunlukTuketimWh,
      gereksinim: { panelWatt, pompaSurucuHp: kademe.hp, pompaSurucuKw: kademe.kw },
      tasarruf: {
        yillikUretimKwh,
        yillikTasarrufTL: Math.round(yillikUretimKwh * birimFiyat),
      },
      notlar,
    };
  }

  // ---- Ev tipi senaryolar (cihaz listesi) ----
  const cihazlar = input.cihazlar ?? [];
  let gunlukTuketimWh = 0;
  let toplamW = 0;
  let enBuyukW = 0;
  for (const c of cihazlar) {
    gunlukTuketimWh += c.adet * c.watt * c.saatGun;
    toplamW += c.adet * c.watt;
    enBuyukW = Math.max(enBuyukW, c.watt);
  }
  gunlukTuketimWh = Math.round(gunlukTuketimWh);

  const invW = Math.max(toplamW * K.simultaneity, enBuyukW) * K.surgeHeadroom;
  const invertorWatt = roundUpTo(invW, K.invRoundW);
  const panelWatt = roundUpTo(gunlukTuketimWh / (K.sunHours * K.systemEff), K.panelRoundW);

  const gereksinim: HesaplaSonuc["gereksinim"] = {
    panelWatt,
    invertorWatt,
    invertorTip: "tam_sinus_mppt",
  };

  if (input.ozerklikGun > 0) {
    // Bağ evi (hafta sonu, düşük döngü) → jel; sürekli kullanım → lityum
    const akuOnerisi: "lityum" | "jel" = input.senaryo === "bag_evi" ? "jel" : "lityum";
    const dod = K.dod[akuOnerisi];
    gereksinim.akuWh = Math.round((gunlukTuketimWh * input.ozerklikGun) / dod / K.invEff);
    gereksinim.akuOnerisi = akuOnerisi;
  } else {
    notlar.push("Özerklik 0 gün seçildi — akü önerilmedi (şebeke bağlantılı kullanım).");
  }

  const yillikUretimKwh = Math.round((panelWatt / 1000) * bolgeVerim);
  return {
    gunlukTuketimWh,
    gereksinim,
    tasarruf: {
      yillikUretimKwh,
      yillikTasarrufTL: Math.round(yillikUretimKwh * birimFiyat),
    },
    notlar,
  };
}
