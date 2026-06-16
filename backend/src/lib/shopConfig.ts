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
