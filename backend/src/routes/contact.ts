// İletişim formu: POST /api/contact → admin'e e-posta iletir.
//
// SMTP yapılandırılmamışsa bile istek kabul edilir ama gönderim "skipped"
// döner; kullanıcıya WhatsApp'a yönlendiren bir mesaj verilir.

import { Router, type Request, type Response, type NextFunction } from "express";
import { sendMail, isEmailConfigured } from "../lib/notify/email.js";
import { adminRecipients } from "../lib/notify/orderEmail.js";
import { rateLimit } from "../lib/rateLimit.js";

export const contactRouter = Router();

function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const contactLimiter = rateLimit({
  windowMs: 10 * 60_000,
  max: 5,
  message: "Çok fazla mesaj gönderildi. Lütfen daha sonra tekrar deneyin.",
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUBJECTS = ["Genel Bilgi", "Ürün Sorusu", "Sipariş / Kargo", "İade / Değişim", "Diğer"];

contactRouter.post(
  "/contact",
  contactLimiter,
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = str(body.name);
    const email = str(body.email);
    const phone = str(body.phone);
    const subject = SUBJECTS.includes(str(body.subject)) ? str(body.subject) : "Diğer";
    const message = str(body.message);

    const errors: Record<string, string> = {};
    if (name.length < 2) errors.name = "Ad soyad gerekli.";
    if (!EMAIL_RE.test(email)) errors.email = "Geçerli bir e-posta girin.";
    if (message.length < 10) errors.message = "Mesaj en az 10 karakter olmalı.";
    if (message.length > 5000) errors.message = "Mesaj çok uzun.";
    if (phone && !/^[0-9+\s()-]{10,20}$/.test(phone)) errors.phone = "Geçerli bir telefon girin.";
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: "validation", fields: errors });
      return;
    }

    if (!isEmailConfigured()) {
      // Mesajı kaydedecek başka kanal yok; kullanıcıyı dürüstçe WhatsApp'a yönlendir.
      res.status(503).json({
        error: "email_unavailable",
        message:
          "Mesaj sistemi şu an kullanılamıyor. Lütfen WhatsApp üzerinden ulaşın.",
      });
      return;
    }

    const result = await sendMail({
      to: adminRecipients(),
      replyTo: email,
      subject: `İletişim formu: ${subject} — ${name}`,
      html: `
        <h2 style="margin:0 0 12px">Yeni iletişim formu mesajı</h2>
        <table style="font-size:14px">
          <tr><td style="padding:3px 12px 3px 0;color:#555">Ad Soyad</td><td>${esc(name)}</td></tr>
          <tr><td style="padding:3px 12px 3px 0;color:#555">E-posta</td><td>${esc(email)}</td></tr>
          <tr><td style="padding:3px 12px 3px 0;color:#555">Telefon</td><td>${esc(phone || "—")}</td></tr>
          <tr><td style="padding:3px 12px 3px 0;color:#555">Konu</td><td>${esc(subject)}</td></tr>
        </table>
        <p style="white-space:pre-wrap;border-top:1px solid #ddd;margin-top:12px;padding-top:12px">${esc(message)}</p>`,
      text: `Ad Soyad: ${name}\nE-posta: ${email}\nTelefon: ${phone || "—"}\nKonu: ${subject}\n\n${message}`,
    });

    if (result.status !== "sent") {
      res.status(502).json({
        error: "send_failed",
        message:
          "Mesaj iletilemedi. Lütfen tekrar deneyin veya WhatsApp üzerinden ulaşın.",
      });
      return;
    }
    res.status(201).json({ ok: true });
  }),
);
