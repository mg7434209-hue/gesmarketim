// Display-side shipping estimate. Mirrors the backend defaults in
// backend/src/lib/shopConfig.ts. The SERVER is the source of truth — it
// recomputes shipping at order creation. These values only drive the UI
// preview in the cart / checkout summary.
//
// Optionally overridable at build time via Vite env so a deploy can keep the
// two sides in sync without touching code.

function envNum(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export const FREE_SHIPPING_THRESHOLD = envNum(
  import.meta.env.VITE_FREE_SHIPPING_THRESHOLD,
  7500,
);
export const FLAT_SHIPPING = envNum(import.meta.env.VITE_FLAT_SHIPPING_COST, 350);

export function shippingFor(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
}
