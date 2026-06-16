// Storefront commercial settings. Centralized so values are never scattered
// across routes; override via env in Railway without code changes.

function envNum(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export const shopConfig = {
  currency: "TRY",
  // Free shipping at/above this subtotal; otherwise flatShipping is added.
  freeShippingThreshold: envNum("FREE_SHIPPING_THRESHOLD", 7500),
  flatShipping: envNum("FLAT_SHIPPING_COST", 350),
  // Guard rails for checkout payloads.
  maxItemsPerOrder: envNum("MAX_ITEMS_PER_ORDER", 50),
  maxQtyPerItem: envNum("MAX_QTY_PER_ITEM", 99),
};

/** Shipping cost for a given subtotal. */
export function shippingFor(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= shopConfig.freeShippingThreshold ? 0 : shopConfig.flatShipping;
}

// ---------------------------------------------------------------------------
// Payment configuration
// ---------------------------------------------------------------------------

function envStr(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

function envBool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
}

export type PaymentMethod = "bank_transfer" | "cash_on_delivery" | "card";

/** Card payments are "configured" once the iyzico keys are present in env. */
export function isCardConfigured(): boolean {
  return Boolean(envStr("IYZICO_API_KEY") && envStr("IYZICO_SECRET_KEY"));
}

export const paymentConfig = {
  /** Bank transfer (havale/EFT) account details, shown to the customer. */
  bankTransfer: {
    enabled: envBool("PAYMENT_BANK_TRANSFER_ENABLED", true),
    bankName: envStr("BANK_NAME") ?? "Banka bilgisi yakında",
    accountHolder: envStr("BANK_ACCOUNT_HOLDER") ?? "GES MARKETİM",
    iban: envStr("BANK_IBAN") ?? "",
  },
  cashOnDelivery: {
    enabled: envBool("PAYMENT_COD_ENABLED", true),
  },
  card: {
    // Only truly available when iyzico keys exist.
    enabled: envBool("PAYMENT_CARD_ENABLED", true) && isCardConfigured(),
    provider: "iyzico" as const,
  },
};

/** The set of payment methods currently offered to customers. */
export function enabledPaymentMethods(): PaymentMethod[] {
  const methods: PaymentMethod[] = [];
  if (paymentConfig.bankTransfer.enabled) methods.push("bank_transfer");
  if (paymentConfig.cashOnDelivery.enabled) methods.push("cash_on_delivery");
  if (paymentConfig.card.enabled) methods.push("card");
  // Never end up with zero methods — fall back to bank transfer.
  return methods.length > 0 ? methods : ["bank_transfer"];
}
