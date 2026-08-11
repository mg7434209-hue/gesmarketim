// Fiyat motoru birim testleri — sabit %22 + kur tamponu + tavan/taban.
// Çalıştır: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFinalPrice, resolveMarkupPct } from "../db/pricing.js";

const SETTINGS = {
  defaultMarkup: "0.22", // tenants.default_markup
  fxUsdTry: "47.20",
  fxBufferPct: "2.00",
  minProfitPct: "10.00",
};

test("doğrulama örneği: 12W panel — costUSD=12.84 → saleUSD=15.66, saleTRY≈753.93", () => {
  const r = computeFinalPrice(
    {
      costPrice: "0",
      costUsd: "12.84",
      productMarkupPct: null,
      supplierMarkupPct: null,
      categoryMarkupPct: null,
    },
    SETTINGS,
  );
  // saleUSD = round2(12.84 × 1.22) = round2(15.6648) = 15.66
  assert.equal(r.saleUsd, 15.66);
  // saleTRY = round2(15.66 × 47.20 × 1.02) = round2(753.935…) = 753.94 (≈753.93)
  assert.equal(r.finalPrice, 753.94);
  assert.equal(r.markupPct, 22);
  assert.equal(r.source, "tenant");
  assert.equal(r.rule, "markup");
});

test("ACS listesi doğrulaması: 12W 12.99→15.85 · 285W 115.01→140.31", () => {
  const p12 = computeFinalPrice(
    { costPrice: "0", costUsd: "12.99", productMarkupPct: null, supplierMarkupPct: null, categoryMarkupPct: null },
    SETTINGS,
  );
  assert.equal(p12.saleUsd, 15.85); // 12.99 × 1.22 = 15.8478 → 15.85
  const p285 = computeFinalPrice(
    { costPrice: "0", costUsd: "115.01", productMarkupPct: null, supplierMarkupPct: null, categoryMarkupPct: null },
    SETTINGS,
  );
  assert.equal(p285.saleUsd, 140.31); // 115.01 × 1.22 = 140.3122 → 140.31
});

test("USD yolunda iki aşamalı yuvarlama: önce saleUSD, sonra tamponlu TRY", () => {
  // 478.72 × 1.22 = 584.0384 → saleUSD 584.04 (CSV sale_usd ile birebir)
  const r = computeFinalPrice(
    {
      costPrice: "0",
      costUsd: "478.72",
      productMarkupPct: null,
      supplierMarkupPct: null,
      categoryMarkupPct: null,
    },
    SETTINGS,
  );
  assert.equal(r.saleUsd, 584.04);
  assert.equal(r.finalPrice, Math.round(584.04 * 47.2 * 1.02 * 100) / 100);
});

test("kur tamponu %2 uygulanır (tampon 0 iken fiyat düşer)", () => {
  const withBuffer = computeFinalPrice(
    { costPrice: "0", costUsd: "100", productMarkupPct: null, supplierMarkupPct: null, categoryMarkupPct: null },
    SETTINGS,
  );
  const noBuffer = computeFinalPrice(
    { costPrice: "0", costUsd: "100", productMarkupPct: null, supplierMarkupPct: null, categoryMarkupPct: null },
    { ...SETTINGS, fxBufferPct: "0" },
  );
  assert.equal(withBuffer.saleUsd, 122);
  assert.equal(withBuffer.finalPrice, Math.round(122 * 47.2 * 1.02 * 100) / 100);
  assert.equal(noBuffer.finalPrice, Math.round(122 * 47.2 * 100) / 100);
  assert.ok(withBuffer.finalPrice > noBuffer.finalPrice);
});

test("rakip fiyat tavanı: satış fiyatı tavanın üstüne çıkmaz", () => {
  const r = computeFinalPrice(
    {
      costPrice: "0",
      costUsd: "100", // tamponlu ≈ ₺5.873
      competitorPrice: "5500",
      productMarkupPct: null,
      supplierMarkupPct: null,
      categoryMarkupPct: null,
    },
    SETTINGS,
  );
  assert.equal(r.finalPrice, 5500);
  assert.equal(r.rule, "ceiling");
});

test("maliyet+min kâr tabanı tavandan önceliklidir (zararına satış yok)", () => {
  const r = computeFinalPrice(
    {
      costPrice: "0",
      costUsd: "100", // maliyet ₺4.720 → taban ₺5.192
      competitorPrice: "4800", // tavan tabanın altında
      productMarkupPct: null,
      supplierMarkupPct: null,
      categoryMarkupPct: null,
    },
    SETTINGS,
  );
  assert.equal(r.finalPrice, Math.round(4720 * 1.1 * 100) / 100); // 5192
  assert.equal(r.rule, "floor");
});

test("TRY yolu (costUsd boş): eski davranış + guardrail'ler", () => {
  const r = computeFinalPrice(
    { costPrice: "1000", productMarkupPct: null, supplierMarkupPct: null, categoryMarkupPct: null },
    SETTINGS,
  );
  assert.equal(r.finalPrice, 1220); // 1000 × 1.22
  assert.equal(r.saleUsd, null);
  assert.equal(r.source, "tenant");

  const capped = computeFinalPrice(
    { costPrice: "1000", competitorPrice: "1150", productMarkupPct: null, supplierMarkupPct: null, categoryMarkupPct: null },
    SETTINGS,
  );
  assert.equal(capped.finalPrice, 1150);
  assert.equal(capped.rule, "ceiling");
});

test("marj zinciri: kademeler boşken tenant %22'ye düşer, kademe yazılınca geri döner", () => {
  assert.deepEqual(
    resolveMarkupPct({ productMarkupPct: null, supplierMarkupPct: null, categoryMarkupPct: null }, SETTINGS),
    { markupPct: 22, source: "tenant" },
  );
  // Kademeye değer yazmak onu yeniden devreye alır (ileride dönüş garantisi).
  assert.deepEqual(
    resolveMarkupPct({ productMarkupPct: null, supplierMarkupPct: "25", categoryMarkupPct: null }, SETTINGS),
    { markupPct: 25, source: "supplier" },
  );
  assert.deepEqual(
    resolveMarkupPct({ productMarkupPct: "30", supplierMarkupPct: "25", categoryMarkupPct: "18" }, SETTINGS),
    { markupPct: 30, source: "product" },
  );
  // Tenant ayarı da yoksa güvenli fallback.
  assert.deepEqual(
    resolveMarkupPct({ productMarkupPct: null, supplierMarkupPct: null, categoryMarkupPct: null }),
    { markupPct: 25, source: "fallback" },
  );
});
