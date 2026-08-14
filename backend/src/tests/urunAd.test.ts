// urun_ara ad ayrıştırma testleri — watt/Ah çıkarımı ürün önerisini
// yönlendirdiği için yanlış çıkarım yanlış ürün önerir. Çalıştır: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { wattFromName, ahFromName } from "../lib/urunAd.js";

test("wattFromName — W/KW çıkarımı, volt karışmaz", () => {
  assert.equal(wattFromName("Lexron 550W Half-Cut Monokristal Güneş Paneli"), 550);
  assert.equal(wattFromName("3KW HV MPPT AKILLI İNVERTER 24V"), 3000);
  assert.equal(wattFromName("6.2KW HV MPPT AKILLI İNVERTER 48V"), 6200);
  assert.equal(wattFromName("55 W panel"), 55);
  // "25.6V" volt — W değil; "100AH" da W değil
  assert.equal(wattFromName("100AH 25.6V LİTYUM BATARYA"), null);
  // "Wallbox" gibi W'den sonra harf gelen kelimeler eşleşmez
  assert.equal(wattFromName("Akıllı 22 Wallbox şarj"), null);
  assert.equal(wattFromName("MC4 Konnektör"), null);
});

test("ahFromName — amper-saat çıkarımı", () => {
  assert.equal(ahFromName("Lexron 12V 100Ah Jel Akü"), 100);
  assert.equal(ahFromName("200AH 12.8V LİTYUM BATARYA"), 200);
  assert.equal(ahFromName("Lexron 450W Güneş Paneli"), null);
});
