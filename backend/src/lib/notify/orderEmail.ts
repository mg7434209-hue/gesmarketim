// Builds and sends order notification emails:
//   - admin alert  → new order with full customer/address/contact details
//   - customer copy → thank-you confirmation with summary + payment next steps
//
// Fired (non-blocking) from POST /api/orders after the order is persisted.
// Both are skipped silently when SMTP is unconfigured (see ./email.ts).

import { sendMail, isEmailConfigured } from "./email.js";
import { paymentConfig, type PaymentMethod } from "../shopConfig.js";
import { siteBaseUrl } from "../siteUrl.js";

export interface OrderEmailItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  city: string;
  district: string;
  addressLine: string;
  note: string | null;
  paymentMethod: PaymentMethod;
  items: OrderEmailItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  currency: string;
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: "Havale / EFT",
  cash_on_delivery: "Kapıda Ödeme",
  card: "Kredi / Banka Kartı",
};

function money(n: number): string {
  return `${n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₺`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function itemRows(items: OrderEmailItem[]): string {
  return items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #eee">${esc(i.name)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right">${money(i.unitPrice)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right">${money(i.lineTotal)}</td>
      </tr>`,
    )
    .join("");
}

function totalsBlock(o: OrderEmailData): string {
  return `
    <table style="width:100%;margin-top:8px;font-size:14px">
      <tr><td style="padding:3px 10px;text-align:right;color:#555">Ara toplam</td>
          <td style="padding:3px 10px;text-align:right;width:120px">${money(o.subtotal)}</td></tr>
      <tr><td style="padding:3px 10px;text-align:right;color:#555">Kargo</td>
          <td style="padding:3px 10px;text-align:right">${
            o.shippingCost === 0 ? "Ücretsiz" : money(o.shippingCost)
          }</td></tr>
      <tr><td style="padding:6px 10px;text-align:right;font-weight:700;font-size:16px">Genel toplam</td>
          <td style="padding:6px 10px;text-align:right;font-weight:700;font-size:16px;color:#0F2547">${money(
            o.total,
          )}</td></tr>
    </table>`;
}

function itemsTable(o: OrderEmailData): string {
  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:6px">
      <thead>
        <tr style="background:#f6f7f9">
          <th style="padding:8px 10px;text-align:left">Ürün</th>
          <th style="padding:8px 10px;text-align:center">Adet</th>
          <th style="padding:8px 10px;text-align:right">Birim</th>
          <th style="padding:8px 10px;text-align:right">Tutar</th>
        </tr>
      </thead>
      <tbody>${itemRows(o.items)}</tbody>
    </table>`;
}

function shell(title: string, body: string): string {
  return `<!doctype html><html lang="tr"><body style="margin:0;background:#f1f5f9;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
    <table style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <tr><td style="background:#0F2547;padding:18px 24px;color:#fff;font-size:18px;font-weight:800">GES MARKETİM</td></tr>
      <tr><td style="padding:24px">
        <h1 style="margin:0 0 16px;font-size:20px;color:#0F2547">${esc(title)}</h1>
        ${body}
      </td></tr>
      <tr><td style="padding:16px 24px;background:#f6f7f9;color:#6b7280;font-size:12px">
        GES MARKETİM · Manavgat / Antalya · gesmarketim.com
      </td></tr>
    </table>
  </body></html>`;
}

/** Recipients for the internal new-order alert. */
function adminRecipients(): string[] {
  const raw =
    process.env.ORDER_NOTIFY_EMAIL?.trim() ||
    process.env.MAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "";
  // MAIL_FROM may be "Name <addr>"; extract a bare address when needed.
  return raw
    .split(",")
    .map((s) => {
      const m = s.match(/<([^>]+)>/);
      return (m ? m[1] : s).trim();
    })
    .filter((s) => s.length > 0);
}

function adminHtml(o: OrderEmailData): string {
  return shell(
    `Yeni sipariş: ${o.orderNumber}`,
    `
    <p style="margin:0 0 14px">Yeni bir sipariş alındı. Detaylar aşağıda.</p>
    <table style="width:100%;font-size:14px;margin-bottom:14px">
      <tr><td style="padding:3px 0;color:#555;width:130px">Müşteri</td><td>${esc(o.customerName)}</td></tr>
      <tr><td style="padding:3px 0;color:#555">Telefon</td><td>${esc(o.customerPhone)}</td></tr>
      ${o.customerEmail ? `<tr><td style="padding:3px 0;color:#555">E-posta</td><td>${esc(o.customerEmail)}</td></tr>` : ""}
      <tr><td style="padding:3px 0;color:#555">Adres</td><td>${esc(o.addressLine)}, ${esc(o.district)} / ${esc(o.city)}</td></tr>
      <tr><td style="padding:3px 0;color:#555">Ödeme</td><td>${PAYMENT_LABELS[o.paymentMethod]}</td></tr>
      ${o.note ? `<tr><td style="padding:3px 0;color:#555">Not</td><td>${esc(o.note)}</td></tr>` : ""}
    </table>
    ${itemsTable(o)}
    ${totalsBlock(o)}`,
  );
}

function customerHtml(o: OrderEmailData): string {
  let paymentNote = "";
  if (o.paymentMethod === "bank_transfer" && paymentConfig.bankTransfer.iban) {
    paymentNote = `
      <div style="margin-top:16px;padding:14px;border:1px dashed #cbd5e1;border-radius:8px;font-size:14px">
        <strong>Havale / EFT bilgileri</strong><br/>
        Banka: ${esc(paymentConfig.bankTransfer.bankName)}<br/>
        Alıcı: ${esc(paymentConfig.bankTransfer.accountHolder)}<br/>
        IBAN: ${esc(paymentConfig.bankTransfer.iban)}<br/>
        <span style="color:#6b7280">Açıklama kısmına sipariş numaranızı (${esc(o.orderNumber)}) yazınız.</span>
      </div>`;
  } else if (o.paymentMethod === "cash_on_delivery") {
    paymentNote = `<p style="margin-top:16px;font-size:14px">Ödemeyi teslimatta nakit veya kart ile yapabilirsiniz.</p>`;
  } else if (o.paymentMethod === "card") {
    paymentNote = `<p style="margin-top:16px;font-size:14px">Kart ödemeniz alındığında siparişiniz onaylanacaktır.</p>`;
  }

  const base = siteBaseUrl();
  const trackLink = base
    ? `<p style="margin-top:16px;font-size:14px">Siparişinizi görüntüleyin: <a href="${base}/siparis/${encodeURIComponent(
        o.orderNumber,
      )}" style="color:#0F2547">${base}/siparis/${esc(o.orderNumber)}</a></p>`
    : "";

  return shell(
    "Siparişiniz alındı 🎉",
    `
    <p style="margin:0 0 6px">Merhaba ${esc(o.customerName)},</p>
    <p style="margin:0 0 14px">Siparişiniz için teşekkür ederiz. Sipariş numaranız:
      <strong>${esc(o.orderNumber)}</strong>. Ödeme yöntemi: <strong>${PAYMENT_LABELS[o.paymentMethod]}</strong>.</p>
    ${itemsTable(o)}
    ${totalsBlock(o)}
    ${paymentNote}
    ${trackLink}
    <p style="margin-top:18px;font-size:14px;color:#6b7280">Sorularınız için bu e-postayı yanıtlayabilirsiniz.</p>`,
  );
}

/**
 * Send admin + (optional) customer emails for a new order. Resolves to the
 * per-recipient results; never rejects so callers can fire-and-forget.
 */
export async function sendOrderNotifications(
  o: OrderEmailData,
): Promise<{ admin: string; customer: string }> {
  if (!isEmailConfigured()) return { admin: "skipped", customer: "skipped" };

  const recipients = adminRecipients();
  const adminResult = recipients.length
    ? await sendMail({
        to: recipients,
        subject: `🛒 Yeni sipariş ${o.orderNumber} — ${money(o.total)}`,
        html: adminHtml(o),
        replyTo: o.customerEmail ?? undefined,
      })
    : { status: "skipped" as const };

  let customerStatus = "skipped";
  if (o.customerEmail) {
    const r = await sendMail({
      to: o.customerEmail,
      subject: `Siparişiniz alındı — ${o.orderNumber}`,
      html: customerHtml(o),
    });
    customerStatus = r.status;
  }

  return { admin: adminResult.status, customer: customerStatus };
}

// ---------------------------------------------------------------------------
// Order status change → customer notification
// ---------------------------------------------------------------------------

export type NotifiableStatus = "confirmed" | "shipped" | "delivered" | "cancelled";

const STATUS_COPY: Record<NotifiableStatus, { label: string; line: string }> = {
  confirmed: {
    label: "Onaylandı",
    line: "Siparişiniz onaylandı ve hazırlanmaya başlandı.",
  },
  shipped: {
    label: "Kargoya verildi",
    line: "Siparişiniz kargoya verildi. Kısa süre içinde elinizde olacak.",
  },
  delivered: {
    label: "Teslim edildi",
    line: "Siparişiniz teslim edildi. Bizi tercih ettiğiniz için teşekkürler!",
  },
  cancelled: {
    label: "İptal edildi",
    line: "Siparişiniz iptal edildi. Sorunuz olursa bu e-postayı yanıtlayabilirsiniz.",
  },
};

export function isNotifiableStatus(s: string): s is NotifiableStatus {
  return s === "confirmed" || s === "shipped" || s === "delivered" || s === "cancelled";
}

export interface OrderStatusEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: NotifiableStatus;
  total: number;
}

/**
 * Email the customer when an admin changes their order status. Skipped when
 * SMTP is unconfigured. Never throws — safe to fire-and-forget.
 */
export async function sendOrderStatusEmail(
  o: OrderStatusEmailData,
): Promise<string> {
  if (!isEmailConfigured()) return "skipped";

  const copy = STATUS_COPY[o.status];
  const base = siteBaseUrl();
  const trackLink = base
    ? `<p style="margin-top:16px;font-size:14px">Sipariş detayı:
        <a href="${base}/siparis/${encodeURIComponent(o.orderNumber)}" style="color:#0F2547">
        ${base}/siparis/${esc(o.orderNumber)}</a></p>`
    : "";

  const html = shell(
    `Sipariş durumu: ${copy.label}`,
    `
    <p style="margin:0 0 6px">Merhaba ${esc(o.customerName)},</p>
    <p style="margin:0 0 14px">${copy.line}</p>
    <table style="width:100%;font-size:14px;margin-bottom:6px">
      <tr><td style="padding:3px 0;color:#555;width:140px">Sipariş no</td><td><strong>${esc(o.orderNumber)}</strong></td></tr>
      <tr><td style="padding:3px 0;color:#555">Yeni durum</td><td>${copy.label}</td></tr>
      <tr><td style="padding:3px 0;color:#555">Tutar</td><td>${money(o.total)}</td></tr>
    </table>
    ${trackLink}`,
  );

  const r = await sendMail({
    to: o.customerEmail,
    subject: `Sipariş ${o.orderNumber} — ${copy.label}`,
    html,
  });
  return r.status;
}
