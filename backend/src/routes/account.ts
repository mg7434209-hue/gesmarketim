// Customer account endpoints (storefront, cookie-gated where noted):
//
//   POST /api/account/register  → create account + start session
//   POST /api/account/login     → start session
//   POST /api/account/logout    → clear session
//   GET  /api/account/me        → current profile            (auth)
//   PATCH /api/account/me       → update profile / default address (auth)
//   GET  /api/account/orders    → this customer's order history (auth)
//
// Sessions + password hashing live in src/lib/customerAuth.ts.

import { Router, type Request, type Response, type NextFunction } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { customers, orders } from "../db/schema.js";
import { getTenantId } from "../lib/tenant.js";
import {
  hashPassword,
  verifyPassword,
  issueCustomerToken,
  setCustomerCookie,
  clearCustomerCookie,
  requireCustomer,
} from "../lib/customerAuth.js";

export const accountRouter = Router();

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CustomerRow = typeof customers.$inferSelect;

function publicProfile(c: CustomerRow) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    defaultCity: c.defaultCity,
    defaultDistrict: c.defaultDistrict,
    defaultAddress: c.defaultAddress,
  };
}

// ---------- POST /api/account/register ----------
accountRouter.post(
  "/account/register",
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const body = (req.body ?? {}) as Record<string, unknown>;

    const name = str(body.name);
    const email = str(body.email).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const phone = str(body.phone);

    const errors: Record<string, string> = {};
    if (name.length < 2) errors.name = "Ad soyad gerekli.";
    if (!EMAIL_RE.test(email)) errors.email = "Geçerli bir e-posta girin.";
    if (password.length < 8) errors.password = "Parola en az 8 karakter olmalı.";
    if (phone && !/^[0-9+\s()-]{10,20}$/.test(phone))
      errors.phone = "Geçerli bir telefon girin.";
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: "validation", fields: errors });
      return;
    }

    const existing = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.email, email)))
      .limit(1);
    if (existing[0]) {
      res.status(409).json({
        error: "email_taken",
        message: "Bu e-posta ile bir hesap zaten var. Giriş yapmayı deneyin.",
        fields: { email: "Bu e-posta zaten kayıtlı." },
      });
      return;
    }

    const [created] = await db
      .insert(customers)
      .values({
        tenantId,
        email,
        passwordHash: hashPassword(password),
        name,
        phone: phone || null,
      })
      .returning();

    setCustomerCookie(res, issueCustomerToken(created.id));
    res.status(201).json(publicProfile(created));
  }),
);

// ---------- POST /api/account/login ----------
accountRouter.post(
  "/account/login",
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const body = (req.body ?? {}) as Record<string, unknown>;

    const email = str(body.email).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";

    const [row] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.email, email)))
      .limit(1);

    // Same response for unknown email vs. wrong password (no account enumeration).
    if (!row || !verifyPassword(password, row.passwordHash)) {
      res.status(401).json({
        error: "invalid_credentials",
        message: "E-posta veya parola hatalı.",
      });
      return;
    }

    setCustomerCookie(res, issueCustomerToken(row.id));
    res.json(publicProfile(row));
  }),
);

// ---------- POST /api/account/logout ----------
accountRouter.post("/account/logout", (_req, res) => {
  clearCustomerCookie(res);
  res.json({ ok: true });
});

// ---------- GET /api/account/me ----------
accountRouter.get(
  "/account/me",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const customerId = (req as Request & { customerId: string }).customerId;
    const [row] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);
    if (!row) {
      clearCustomerCookie(res);
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.json(publicProfile(row));
  }),
);

// ---------- PATCH /api/account/me ----------
accountRouter.patch(
  "/account/me",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const customerId = (req as Request & { customerId: string }).customerId;
    const body = (req.body ?? {}) as Record<string, unknown>;

    const updates: Partial<CustomerRow> = {};
    const errors: Record<string, string> = {};

    if (body.name !== undefined) {
      const name = str(body.name);
      if (name.length < 2) errors.name = "Ad soyad gerekli.";
      else updates.name = name;
    }
    if (body.phone !== undefined) {
      const phone = str(body.phone);
      if (phone && !/^[0-9+\s()-]{10,20}$/.test(phone))
        errors.phone = "Geçerli bir telefon girin.";
      else updates.phone = phone || null;
    }
    if (body.defaultCity !== undefined) updates.defaultCity = str(body.defaultCity) || null;
    if (body.defaultDistrict !== undefined)
      updates.defaultDistrict = str(body.defaultDistrict) || null;
    if (body.defaultAddress !== undefined)
      updates.defaultAddress = str(body.defaultAddress) || null;

    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: "validation", fields: errors });
      return;
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "no_changes", message: "Güncellenecek alan yok." });
      return;
    }

    updates.updatedAt = new Date();
    const [row] = await db
      .update(customers)
      .set(updates)
      .where(eq(customers.id, customerId))
      .returning();
    res.json(publicProfile(row));
  }),
);

// ---------- GET /api/account/orders ----------
accountRouter.get(
  "/account/orders",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const customerId = (req as Request & { customerId: string }).customerId;

    const rows = await db.query.orders.findMany({
      where: and(eq(orders.tenantId, tenantId), eq(orders.customerId, customerId)),
      orderBy: [desc(orders.createdAt)],
      with: { items: true },
    });

    res.json(
      rows.map((o) => ({
        orderNumber: o.orderNumber,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        subtotal: Number(o.subtotal),
        shippingCost: Number(o.shippingCost),
        total: Number(o.total),
        currency: o.currency,
        createdAt: o.createdAt,
        items: o.items.map((i) => ({
          name: i.productName,
          slug: i.productSlug,
          unitPrice: Number(i.unitPrice),
          quantity: i.quantity,
          lineTotal: Number(i.lineTotal),
        })),
      })),
    );
  }),
);
