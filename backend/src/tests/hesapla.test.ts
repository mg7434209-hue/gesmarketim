// Sistem Kur v2 — hesap motoru birim testleri (brief 1.4).
// Beklenen değerler spec formülleriyle ELLE hesaplandı; motor değişirse
// bilerek kırılırlar. Çalıştır: npm test
//
//   günlükWh   = Σ adet × watt × saatGün
//   inverterW  = max(toplamW × 0.7, enBüyükW) × 1.25 → 100'e yukarı
//   panelW     = günlükWh / (4.2 × 0.75) → 50'ye yukarı
//   aküWh      = günlükWh × özerklikGün / DoD / 0.93
//   tarımsal   : panelW = sürücüKw × 1000 × 1.35 → 50'ye yukarı, akü YOK
//   tasarruf   : yıllıkKwh = panelW/1000 × 1650; ₺ = yıllıkKwh × birimFiyat

import { test } from "node:test";
import assert from "node:assert/strict";
import { hesapla, hesaplaInputSchema, elektrikBirimFiyatTL } from "../lib/hesapla.js";

function parseOk(input: unknown) {
  const parsed = hesaplaInputSchema.safeParse(input);
  assert.equal(parsed.success, true, JSON.stringify(!parsed.success ? parsed.error.issues : null));
  return parsed.success ? parsed.data : (undefined as never);
}

// ---------------------------------------------------------------------------
test("karavan mini senaryo — panel/inverter/akü birebir", () => {
  const sonuc = hesapla(
    parseOk({
      senaryo: "karavan",
      cihazlar: [
        { ad: "LED aydınlatma", adet: 2, watt: 10, saatGun: 5 }, // 100 Wh
        { ad: "Buzdolabı 12V", adet: 1, watt: 60, saatGun: 8 }, // 480 Wh
        { ad: "Telefon şarjı", adet: 2, watt: 10, saatGun: 2 }, //  40 Wh
      ],
      ozerklikGun: 1,
    }),
  );

  assert.equal(sonuc.gunlukTuketimWh, 620);
  // inverter: max(100×0.7, 60)×1.25 = 87.5 → 100
  assert.equal(sonuc.gereksinim.invertorWatt, 100);
  assert.equal(sonuc.gereksinim.invertorTip, "tam_sinus_mppt");
  // panel: 620 / (4.2×0.75) = 196.8 → 200
  assert.equal(sonuc.gereksinim.panelWatt, 200);
  // akü (lityum DoD 0.9, inv verim 0.93): 620×1/0.9/0.93 = 740.74 → 741
  assert.equal(sonuc.gereksinim.akuWh, 741);
  assert.equal(sonuc.gereksinim.akuOnerisi, "lityum");
  // tarımsal alanları ev senaryosunda bulunmaz
  assert.equal(sonuc.gereksinim.pompaSurucuHp, undefined);
});

// ---------------------------------------------------------------------------
test("bağ evi — hafta sonu kullanımına jel akü önerilir", () => {
  const sonuc = hesapla(
    parseOk({
      senaryo: "bag_evi",
      cihazlar: [
        { ad: "Buzdolabı", adet: 1, watt: 150, saatGun: 8 }, // 1200 Wh
        { ad: "TV", adet: 1, watt: 100, saatGun: 4 }, //  400 Wh
        { ad: "Aydınlatma", adet: 4, watt: 10, saatGun: 5 }, //  200 Wh
      ],
      ozerklikGun: 2,
    }),
  );

  assert.equal(sonuc.gunlukTuketimWh, 1800);
  assert.equal(sonuc.gereksinim.akuOnerisi, "jel");
  // jel DoD 0.5: 1800×2/0.5/0.93 = 7741.9 → 7742
  assert.equal(sonuc.gereksinim.akuWh, 7742);
});

// ---------------------------------------------------------------------------
test("tarımsal 10 HP — kademe birebir (10 HP / 7.5 kW), akü YOK", () => {
  const sonuc = hesapla(
    parseOk({
      senaryo: "tarimsal_sulama",
      pompa: { hp: 10, gunlukSaat: 6 },
    }),
  );

  assert.equal(sonuc.gereksinim.pompaSurucuHp, 10);
  assert.equal(sonuc.gereksinim.pompaSurucuKw, 7.5);
  // panel: 7.5 kW × 1000 × 1.35 = 10125 → 10150
  assert.equal(sonuc.gereksinim.panelWatt, 10150);
  // günlük tüketim: 7500 W × 6 saat
  assert.equal(sonuc.gunlukTuketimWh, 45000);
  // akü önerilmez
  assert.equal(sonuc.gereksinim.akuWh, undefined);
  assert.equal(sonuc.gereksinim.akuOnerisi, undefined);
  assert.ok(sonuc.notlar.some((n) => n.includes("akü önerilmez")));
});

// ---------------------------------------------------------------------------
test("tarımsal 12 HP — bir üst kademeye (15 HP / 11 kW) yukarı yuvarlanır", () => {
  const sonuc = hesapla(
    parseOk({
      senaryo: "tarimsal_sulama",
      pompa: { hp: 12, gunlukSaat: 5 },
    }),
  );

  assert.equal(sonuc.gereksinim.pompaSurucuHp, 15);
  assert.equal(sonuc.gereksinim.pompaSurucuKw, 11);
  // panel: 11 kW × 1000 × 1.35 = 14850 (50'nin katı)
  assert.equal(sonuc.gereksinim.panelWatt, 14850);
  assert.ok(sonuc.notlar.some((n) => n.includes("yukarı yuvarlandı")));
});

// ---------------------------------------------------------------------------
test("sıfır cihaz / eksik girdi / çifte girdi → doğrulama hatası", () => {
  // boş cihaz listesi
  assert.equal(
    hesaplaInputSchema.safeParse({ senaryo: "karavan", cihazlar: [] }).success,
    false,
  );
  // ne cihaz ne pompa
  assert.equal(hesaplaInputSchema.safeParse({ senaryo: "karavan" }).success, false);
  // ikisi birden
  assert.equal(
    hesaplaInputSchema.safeParse({
      senaryo: "tarimsal_sulama",
      cihazlar: [{ ad: "X", adet: 1, watt: 100, saatGun: 1 }],
      pompa: { hp: 5, gunlukSaat: 4 },
    }).success,
    false,
  );
  // pompa ev senaryosunda girilemez
  assert.equal(
    hesaplaInputSchema.safeParse({
      senaryo: "karavan",
      pompa: { hp: 5, gunlukSaat: 4 },
    }).success,
    false,
  );
});

// ---------------------------------------------------------------------------
test("aşırı değerler reddedilir (anlaşılır Türkçe mesajla)", () => {
  const r1 = hesaplaInputSchema.safeParse({
    senaryo: "karavan",
    cihazlar: [{ ad: "Dev cihaz", adet: 1, watt: 50000, saatGun: 5 }],
  });
  assert.equal(r1.success, false);
  if (!r1.success) {
    assert.ok(r1.error.issues.some((i) => i.message.includes("20.000 W")));
  }

  const r2 = hesaplaInputSchema.safeParse({
    senaryo: "tarimsal_sulama",
    pompa: { hp: 500, gunlukSaat: 5 },
  });
  assert.equal(r2.success, false);

  const r3 = hesaplaInputSchema.safeParse({
    senaryo: "karavan",
    cihazlar: [{ ad: "TV", adet: 1, watt: 100, saatGun: 30 }],
  });
  assert.equal(r3.success, false);
});

// ---------------------------------------------------------------------------
test("tasarruf hesabı ELEKTRIK_BIRIM_FIYAT_TL env'ini kullanır", () => {
  const eski = process.env.ELEKTRIK_BIRIM_FIYAT_TL;
  try {
    delete process.env.ELEKTRIK_BIRIM_FIYAT_TL;
    assert.equal(elektrikBirimFiyatTL(), 2.5); // spec defaultUnitPrice

    process.env.ELEKTRIK_BIRIM_FIYAT_TL = "4";
    assert.equal(elektrikBirimFiyatTL(), 4);

    const sonuc = hesapla(
      parseOk({
        senaryo: "mustakil_ev",
        cihazlar: [{ ad: "Klima", adet: 1, watt: 1200, saatGun: 5 }], // 6000 Wh
        ozerklikGun: 0,
      }),
    );
    // panel: 6000/3.15 = 1904.8 → 1950 → yıllık 1.95×1650 = 3217.5 → 3218 kWh
    assert.equal(sonuc.tasarruf.yillikUretimKwh, 3218);
    assert.equal(sonuc.tasarruf.yillikTasarrufTL, 3218 * 4);
    // özerklik 0 → akü yok
    assert.equal(sonuc.gereksinim.akuWh, undefined);
  } finally {
    if (eski === undefined) delete process.env.ELEKTRIK_BIRIM_FIYAT_TL;
    else process.env.ELEKTRIK_BIRIM_FIYAT_TL = eski;
  }
});
