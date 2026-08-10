// Allowlist sızıntı testi — müşteri API çıktısına maliyet/marj/tedarikçi
// alanlarının SIZMADIĞINI doğrular. Tüm müşteri ürün yanıtları
// toPublicProduct()'tan geçer; bu test o mapper'ın sözleşmesidir.
// Çalıştır: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { toPublicProduct } from "../lib/publicProduct.js";
import type { Product } from "../db/schema.js";

// Sızması yasak alanlar (schema'daki iç/sync metadata).
const FORBIDDEN_KEYS = [
  "costPrice",
  "costUsd",
  "markupPercent",
  "competitorPrice",
  "supplierId",
  "supplierSku",
  "sourceUrl",
  "lastSyncedAt",
  "syncStatus",
  "autoDisableOnOos",
  "tenantId",
];

// Kasıtlı olarak "tuzak" değerlerle dolu tam ürün satırı.
const row: Product = {
  id: "00000000-0000-0000-0000-000000000001",
  tenantId: "00000000-0000-0000-0000-0000000000aa",
  slug: "12w-polikristal-gunes-paneli",
  name: "12W POLİKRİSTAL GÜNEŞ PANELİ",
  description: "Test ürünü",
  brandId: "00000000-0000-0000-0000-0000000000bb",
  categoryId: "00000000-0000-0000-0000-0000000000cc",
  supplierId: "SUPPLIER-LEAK-CANARY",
  supplierSku: "SKU-LEAK-CANARY",
  sourceUrl: "https://tedarikci.example/LEAK",
  costPrice: "999999.99",
  costUsd: "12.84",
  markupPercent: "22.00",
  finalPrice: "753.94",
  saleUsd: "15.66",
  competitorPrice: "888888.88",
  currency: "TRY",
  fulfillmentType: "dropship",
  stockQty: 0,
  images: [{ url: "/img/products/test.jpg", isPrimary: true }],
  status: "active",
  lastSyncedAt: new Date("2026-08-10T00:00:00Z"),
  syncStatus: "ok",
  autoDisableOnOos: true,
  createdAt: new Date("2026-08-10T00:00:00Z"),
  updatedAt: new Date("2026-08-10T00:00:00Z"),
};

test("toPublicProduct yalnız allowlist alanları döndürür", () => {
  const pub = toPublicProduct({
    product: row,
    brand: { name: "LEXRON", slug: "lexron" },
    category: { name: "Panel", slug: "panel" },
  });

  assert.deepEqual(Object.keys(pub).sort(), [
    "brand",
    "category",
    "currency",
    "description",
    "fulfillmentType",
    "id",
    "images",
    "inStock",
    "name",
    "price",
    "priceUsd",
    "slug",
  ]);

  // Satış fiyatları doğru alanlardan gelir.
  assert.equal(pub.price, 753.94); // finalPrice ₺
  assert.equal(pub.priceUsd, 15.66); // saleUsd $ (satış fiyatı — maliyet değil)
});

test("yasaklı alanlar ne anahtar ne değer olarak sızar", () => {
  const pub = toPublicProduct({ product: row, brand: null, category: null });
  const json = JSON.stringify(pub);

  for (const key of FORBIDDEN_KEYS) {
    assert.ok(!(key in (pub as unknown as Record<string, unknown>)), `anahtar sızdı: ${key}`);
    assert.ok(!json.includes(`"${key}"`), `JSON'da anahtar sızdı: ${key}`);
  }
  // Tuzak DEĞERLER de görünmemeli (maliyet, tedarikçi, rakip tavanı, kaynak URL).
  for (const canary of ["999999.99", "12.84", "888888.88", "LEAK", "22.00"]) {
    assert.ok(!json.includes(canary), `değer sızdı: ${canary}`);
  }
});

test("priceUsd yoksa null döner (TRY maliyetli eski ürünler)", () => {
  const pub = toPublicProduct({
    product: { ...row, saleUsd: null },
    brand: null,
    category: null,
  });
  assert.equal(pub.priceUsd, null);
});
