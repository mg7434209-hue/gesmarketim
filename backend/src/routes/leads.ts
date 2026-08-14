// Sistem Kur v2 — POST /api/leads (potansiyel müşteri kaydı)
//
// Sihirbaz/asistan akışının sonunda ad+telefon bırakan müşteri buraya yazılır
// (tip: dogrulama randevusu / whatsapp'a geçiş / pdf teklif). Honeypot alanı
// (`website`) dolu gelen bot istekleri sessizce "başarılı" cevabı alır ama
// kayıt YAZILMAZ. Admin listesi routes/admin.ts'tedir (GET /api/admin/leads).

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { leads } from "../db/schema.js";
import { getTenantId } from "../lib/tenant.js";
import { rateLimit } from "../lib/rateLimit.js";

export const leadsRouter = Router();

function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

const leadsLimiter = rateLimit({
  windowMs: 10 * 60_000,
  max: 10,
  message: "Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin.",
});

const leadInputSchema = z.object({
  tip: z.enum(["dogrulama", "whatsapp", "pdf"], {
    error: "Geçersiz tip — dogrulama, whatsapp veya pdf olmalı",
  }),
  ad: z.string().trim().min(2, "Ad soyad gerekli").max(120),
  telefon: z
    .string()
    .trim()
    .regex(/^[0-9+\s()-]{10,20}$/, "Geçerli bir telefon girin"),
  email: z.string().trim().email("Geçerli bir e-posta girin").max(160).optional(),
  ozet: z.unknown().optional(), // teklif/hesap özeti snapshot'ı (JSON)
  website: z.string().optional(), // honeypot — insan formu bu alanı görmez
});

leadsRouter.post(
  "/leads",
  leadsLimiter,
  asyncHandler(async (req, res) => {
    const parsed = leadInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        error: "validation",
        message: parsed.error.issues[0]?.message ?? "Geçersiz istek",
      });
      return;
    }

    // Honeypot dolu = bot. Botu bilgilendirmemek için normal cevap dön.
    if (parsed.data.website) {
      res.status(201).json({ ok: true });
      return;
    }

    const tenantId = await getTenantId();
    const [row] = await db
      .insert(leads)
      .values({
        tenantId,
        tip: parsed.data.tip,
        ad: parsed.data.ad,
        telefon: parsed.data.telefon,
        email: parsed.data.email ?? null,
        ozetJson: parsed.data.ozet ?? null,
      })
      .returning({ id: leads.id });

    console.log(`[leads] yeni kayıt tip=${parsed.data.tip} id=${row?.id}`);
    res.status(201).json({ ok: true, id: row?.id });
  }),
);
