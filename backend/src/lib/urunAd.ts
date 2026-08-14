// Ürün adından güç/kapasite çıkarımı (Sistem Kur v2 urun_ara filtreleri).
// Saf fonksiyonlar — DB bağımlılığı yok, birim testli (src/tests/urunAd.test.ts).

/** "1500W", "3KW", "550 W" → watt. "25.6V" gibi volt değerleri W sanılmaz
 *  (W'den sonra harf gelmemesi şart; "KW" ×1000). Bulunamazsa null. */
export function wattFromName(name: string): number | null {
  const m = /(\d+(?:[.,]\d+)?)\s*(K?)W(?![A-Za-zĞÜŞİÖÇğüşiöç])/i.exec(name);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return m[2] ? n * 1000 : n;
}

/** "100AH", "200 Ah" → amper-saat. Bulunamazsa null. */
export function ahFromName(name: string): number | null {
  const m = /(\d+(?:[.,]\d+)?)\s*AH(?![A-Za-z])/i.exec(name);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
