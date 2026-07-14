// Payment endpoints.
//
//   GET  /api/payment/methods         → which methods are offered + bank details
//   POST /api/payment/iyzico/callback → iyzico Checkout Form return (form-encoded)
//
// The methods endpoint drives the checkout UI. The callback verifies the result
// with iyzico, updates the order's payment status, and redirects the customer to
// the order confirmation page.

import { Router, type Request, type Response, type NextFunction } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { orders } from "../db/schema.js";
import { getTenantId } from "../lib/tenant.js";
import {
  enabledPaymentMethods,
  paymentConfig,
} from "../lib/shopConfig.js";
import { retrieveCheckoutResult } from "../lib/payments/iyzico.js";
import { sendOrderNotifications } from "../lib/notify/orderEmail.js";
import { siteBaseUrl } from "../lib/siteUrl.js";

export const paymentRouter = Router();

function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

// ---------- GET /api/payment/methods ----------
paymentRouter.get("/payment/methods", (_req, res) => {
  const methods = enabledPaymentMethods();
  res.json({
    methods,
    bankTransfer: methods.includes("bank_transfer")
      ? {
          bankName: paymentConfig.bankTransfer.bankName,
          accountHolder: paymentConfig.bankTransfer.accountHolder,
          iban: paymentConfig.bankTransfer.iban,
        }
      : null,
    card: { enabled: methods.includes("card"), provider: paymentConfig.card.provider },
  });
});

// ---------- POST /api/payment/iyzico/callback ----------
// iyzico posts `token` as application/x-www-form-urlencoded to this URL.
paymentRouter.post(
  "/payment/iyzico/callback",
  asyncHandler(async (req, res) => {
    const token =
      typeof req.body?.token === "string" ? req.body.token : undefined;
    const base = siteBaseUrl();

    const fail = (orderNumber?: string) => {
      const target = orderNumber
        ? `${base}/siparis/${orderNumber}?payment=failed`
        : `${base}/sepet?payment=failed`;
      res.redirect(303, target || "/");
    };

    if (!token) {
      fail();
      return;
    }

    const result = await retrieveCheckoutResult(token);
    const orderNumber = result.conversationId;

    if (!orderNumber) {
      fail();
      return;
    }

    const tenantId = await getTenantId();
    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.tenantId, tenantId),
        eq(orders.orderNumber, orderNumber),
      ),
      columns: { id: true, paymentStatus: true, total: true },
    });
    if (!order) {
      fail();
      return;
    }

    // Idempotens: ödeme zaten kesinleşmiş bir siparişi callback tekrarı
    // (yenileme/replay) failed'a geri çeviremez.
    if (order.paymentStatus === "paid") {
      res.redirect(303, `${base}/siparis/${orderNumber}?payment=success`);
      return;
    }

    let paid = result.status === "success" && result.paymentStatus === "SUCCESS";

    // Tutar doğrulama: iyzico'nun tahsil ettiği tutar sipariş toplamından
    // farklıysa siparişi otomatik onaylama — manuel inceleme gerekir.
    if (paid && result.paidPrice !== undefined) {
      const paidAmount = Number(result.paidPrice);
      const expected = Number(order.total);
      if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - expected) > 0.01) {
        console.error(
          `[payment] amount mismatch on ${orderNumber}: paid=${result.paidPrice} expected=${order.total} — manuel inceleme gerekli`,
        );
        paid = false;
      }
    }

    await db
      .update(orders)
      .set({
        paymentStatus: paid ? "paid" : "failed",
        status: paid ? "confirmed" : "pending",
        paymentRef: result.paymentId ?? token,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    // Kart siparişinin bildirimleri checkout'ta değil burada, ödeme gerçekten
    // tahsil edilince gönderilir (admin alarmı + müşteri onayı).
    if (paid) {
      void (async () => {
        const full = await db.query.orders.findFirst({
          where: eq(orders.id, order.id),
          with: { items: true },
        });
        if (!full) return;
        await sendOrderNotifications({
          orderNumber: full.orderNumber,
          customerName: full.customerName,
          customerEmail: full.customerEmail,
          customerPhone: full.customerPhone,
          city: full.city,
          district: full.district,
          addressLine: full.addressLine,
          note: full.note,
          paymentMethod: full.paymentMethod,
          items: full.items.map((i) => ({
            name: i.productName,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
            lineTotal: Number(i.lineTotal),
          })),
          subtotal: Number(full.subtotal),
          shippingCost: Number(full.shippingCost),
          total: Number(full.total),
          currency: full.currency,
        });
      })().catch((err) => console.error("[payment] notification failed", err));
    }

    res.redirect(
      303,
      `${base}/siparis/${orderNumber}?payment=${paid ? "success" : "failed"}`,
    );
  }),
);
