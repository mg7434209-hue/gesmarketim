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

export const paymentRouter = Router();

function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

function siteBaseUrl(): string {
  const explicit = process.env.PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const cors = process.env.CORS_ORIGIN?.split(",")[0]?.trim();
  if (cors) return cors.replace(/\/$/, "");
  return "";
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
    const paid = result.status === "success" && result.paymentStatus === "SUCCESS";

    await db
      .update(orders)
      .set({
        paymentStatus: paid ? "paid" : "failed",
        status: paid ? "confirmed" : "pending",
        paymentRef: result.paymentId ?? token,
        updatedAt: new Date(),
      })
      .where(
        and(eq(orders.tenantId, tenantId), eq(orders.orderNumber, orderNumber)),
      );

    res.redirect(
      303,
      `${base}/siparis/${orderNumber}?payment=${paid ? "success" : "failed"}` ||
        "/",
    );
  }),
);
