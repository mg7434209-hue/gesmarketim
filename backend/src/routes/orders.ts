// Public checkout + order lookup.
//
//   POST /api/orders            → create an order from a cart payload
//   GET  /api/orders/:number    → fetch a single order (confirmation page)
//
// SECURITY: prices are NEVER trusted from the client. The server re-reads each
// product's current finalPrice and recomputes all totals. The client only sends
// product references + quantities.

import { Router, type Request, type Response, type NextFunction } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { products, orders, orderItems } from "../db/schema.js";
import { getTenantId } from "../lib/tenant.js";
import { generateOrderNumber } from "../lib/util.js";
import { shippingFor, shopConfig } from "../lib/shopConfig.js";

export const ordersRouter = Router();

function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

interface IncomingItem {
  productId: string;
  quantity: number;
}

function parseItems(raw: unknown): IncomingItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  if (raw.length > shopConfig.maxItemsPerOrder) return null;
  const out: IncomingItem[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) return null;
    const productId = (entry as Record<string, unknown>).productId;
    const quantity = (entry as Record<string, unknown>).quantity;
    if (typeof productId !== "string" || productId.length === 0) return null;
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > shopConfig.maxQtyPerItem) return null;
    out.push({ productId, quantity: qty });
  }
  return out;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------- POST /api/orders ----------
ordersRouter.post(
  "/orders",
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const body = (req.body ?? {}) as Record<string, unknown>;

    // --- customer / address validation ---
    const customerName = str(body.customerName);
    const customerPhone = str(body.customerPhone);
    const customerEmail = str(body.customerEmail);
    const city = str(body.city);
    const district = str(body.district);
    const addressLine = str(body.addressLine);
    const note = str(body.note);

    const errors: Record<string, string> = {};
    if (customerName.length < 2) errors.customerName = "Ad soyad gerekli.";
    if (!/^[0-9+\s()-]{10,20}$/.test(customerPhone)) errors.customerPhone = "Geçerli bir telefon girin.";
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))
      errors.customerEmail = "Geçerli bir e-posta girin.";
    if (city.length < 2) errors.city = "İl gerekli.";
    if (district.length < 2) errors.district = "İlçe gerekli.";
    if (addressLine.length < 10) errors.addressLine = "Açık adres gerekli.";

    const items = parseItems(body.items);
    if (!items) errors.items = "Sepet geçersiz.";

    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: "validation", fields: errors });
      return;
    }

    // --- re-price server-side (never trust client prices) ---
    const ids = Array.from(new Set(items!.map((i) => i.productId)));
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        finalPrice: products.finalPrice,
        status: products.status,
        fulfillmentType: products.fulfillmentType,
        stockQty: products.stockQty,
      })
      .from(products)
      .where(and(eq(products.tenantId, tenantId), inArray(products.id, ids)));

    const byId = new Map(rows.map((r) => [r.id, r]));

    const lineValues: {
      productId: string;
      productName: string;
      productSlug: string;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
    }[] = [];

    for (const item of items!) {
      const p = byId.get(item.productId);
      if (!p || p.status !== "active") {
        res.status(409).json({
          error: "unavailable",
          message: "Sepetteki bir ürün artık mevcut değil. Lütfen sepeti güncelleyin.",
          productId: item.productId,
        });
        return;
      }
      const available = p.fulfillmentType === "dropship" || p.stockQty > 0;
      if (!available) {
        res.status(409).json({
          error: "out_of_stock",
          message: `"${p.name}" şu an stokta değil.`,
          productId: item.productId,
        });
        return;
      }
      const unitPrice = Number(p.finalPrice);
      const lineTotal = round2(unitPrice * item.quantity);
      lineValues.push({
        productId: p.id,
        productName: p.name,
        productSlug: p.slug,
        unitPrice,
        quantity: item.quantity,
        lineTotal,
      });
    }

    const subtotal = round2(lineValues.reduce((s, l) => s + l.lineTotal, 0));
    const shippingCost = shippingFor(subtotal);
    const total = round2(subtotal + shippingCost);

    // --- persist (transaction: order + items together) ---
    const created = await db.transaction(async (tx) => {
      // Retry order-number generation on the (rare) unique collision.
      let orderRow:
        | { id: string; orderNumber: string; createdAt: Date }
        | undefined;
      for (let attempt = 0; attempt < 5; attempt++) {
        const orderNumber = generateOrderNumber();
        const inserted = await tx
          .insert(orders)
          .values({
            tenantId,
            orderNumber,
            customerName,
            customerPhone,
            customerEmail: customerEmail || null,
            city,
            district,
            addressLine,
            note: note || null,
            status: "pending",
            subtotal: subtotal.toFixed(2),
            shippingCost: shippingCost.toFixed(2),
            total: total.toFixed(2),
            currency: shopConfig.currency,
          })
          .onConflictDoNothing()
          .returning({
            id: orders.id,
            orderNumber: orders.orderNumber,
            createdAt: orders.createdAt,
          });
        if (inserted[0]) {
          orderRow = inserted[0];
          break;
        }
      }
      if (!orderRow) throw new Error("order_number_generation_failed");

      await tx.insert(orderItems).values(
        lineValues.map((l) => ({
          orderId: orderRow!.id,
          productId: l.productId,
          productName: l.productName,
          productSlug: l.productSlug,
          unitPrice: l.unitPrice.toFixed(2),
          quantity: l.quantity,
          lineTotal: l.lineTotal.toFixed(2),
        })),
      );

      return orderRow;
    });

    res.status(201).json({
      orderNumber: created.orderNumber,
      status: "pending",
      subtotal,
      shippingCost,
      total,
      currency: shopConfig.currency,
      items: lineValues.map((l) => ({
        name: l.productName,
        slug: l.productSlug,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
        lineTotal: l.lineTotal,
      })),
    });
  }),
);

// ---------- GET /api/orders/:number ----------
ordersRouter.get(
  "/orders/:number",
  asyncHandler(async (req, res) => {
    const tenantId = await getTenantId();
    const orderNumber = req.params.number;

    const order = await db.query.orders.findFirst({
      where: and(eq(orders.tenantId, tenantId), eq(orders.orderNumber, orderNumber)),
      with: {
        items: true,
      },
    });

    if (!order) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.json({
      orderNumber: order.orderNumber,
      status: order.status,
      customerName: order.customerName,
      city: order.city,
      district: order.district,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      total: Number(order.total),
      currency: order.currency,
      createdAt: order.createdAt,
      items: order.items.map((i) => ({
        name: i.productName,
        slug: i.productSlug,
        unitPrice: Number(i.unitPrice),
        quantity: i.quantity,
        lineTotal: Number(i.lineTotal),
      })),
    });
  }),
);
