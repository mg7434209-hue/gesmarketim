// CLI: tüm finalPrice/saleUsd snapshot'larını yeniden hesapla.
//   npm run db:recompute            → yaz
//   npm run db:recompute -- --dry-run → önizleme (yazmaz)
// Aktif tenant TENANT_SLUG env'inden çözülür (varsayılan "gesmarketim").

import "dotenv/config";
import { pool } from "./index.js";
import { getTenantId } from "../lib/tenant.js";
import { recomputeTenantPrices } from "./recomputePrices.js";

const dryRun = process.argv.includes("--dry-run");

try {
  const tenantId = await getTenantId();
  const summary = await recomputeTenantPrices(tenantId, { dryRun });
  console.log(
    `[recompute]${summary.dryRun ? " (dry-run)" : ""} toplam ${summary.total} ürün — ` +
      `${summary.changed} değişti, ${summary.unchanged} aynı kaldı`,
  );
  for (const s of summary.samples) {
    console.log(
      `  ${s.slug}: ₺${s.from} → ₺${s.to}${s.saleUsd ? ` ($${s.saleUsd})` : ""}`,
    );
  }
  if (summary.changed > summary.samples.length) {
    console.log(`  … (+${summary.changed - summary.samples.length} satır daha)`);
  }
  await pool.end();
  process.exit(0);
} catch (err) {
  console.error("[recompute] hata:", err);
  await pool.end();
  process.exit(1);
}
