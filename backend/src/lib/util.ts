// Small shared helpers.

import crypto from "node:crypto";

const TR_MAP: Record<string, string> = {
  ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", İ: "i",
  ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
};

/** URL-safe slug from arbitrary (incl. Turkish) text. */
export function slugify(input: string): string {
  return input
    .trim()
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TR_MAP[ch] ?? ch)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** Human-readable order number, e.g. GM-7F3K9Q. */
export function generateOrderNumber(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return `GM-${code}`;
}
