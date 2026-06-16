// Customer authentication — storefront accounts (register / login / session).
//
// Mirrors the admin auth approach (src/lib/auth.ts) but for many identities:
//   - Passwords hashed with scrypt (node:crypto, no external lib).
//   - Sessions are stateless, HMAC-signed cookies: base64url(payload)"."sig
//     where payload = `${customerId}:${issuedAtMs}`.
//
// Secret: CUSTOMER_SESSION_SECRET, falling back to ADMIN_SESSION_SECRET.

import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { parseCookies } from "./auth.js";

const SECRET =
  process.env.CUSTOMER_SESSION_SECRET ??
  process.env.ADMIN_SESSION_SECRET ??
  "change-me-in-production";

export const CUSTOMER_COOKIE = "gm_customer";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 gün

// --------------------------- password hashing ---------------------------

/** Hash a password with scrypt. Format: "scrypt$<salt>$<hash>" (base64url). */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

/** Verify a password against a stored scrypt hash (timing-safe). */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[1], "base64url");
    expected = Buffer.from(parts[2], "base64url");
  } catch {
    return false;
  }
  if (expected.length === 0) return false;
  const actual = crypto.scryptSync(password, salt, expected.length);
  return (
    actual.length === expected.length &&
    crypto.timingSafeEqual(actual, expected)
  );
}

// --------------------------- session tokens ---------------------------

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** Issue a signed session token for a customer id. */
export function issueCustomerToken(customerId: string): string {
  const payload = `${customerId}:${Date.now()}`;
  return `${b64url(payload)}.${sign(payload)}`;
}

/** Verify a token; returns the customer id when valid, otherwise null. */
export function verifyCustomerToken(token: string | undefined): string | null {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  let payload: string;
  try {
    payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
  } catch {
    return null;
  }

  if (!timingSafeEqual(signature, sign(payload))) return null;

  const idx = payload.lastIndexOf(":");
  if (idx === -1) return null;
  const customerId = payload.slice(0, idx);
  const issuedAt = Number(payload.slice(idx + 1));
  if (!customerId || !Number.isFinite(issuedAt)) return null;
  if (Date.now() - issuedAt > MAX_AGE_MS) return null;

  return customerId;
}

// --------------------------- cookie helpers ---------------------------

// In production the storefront and API may live on different Railway domains
// (cross-site), so the session cookie needs SameSite=None; Secure to be sent on
// credentialed fetches. In dev (http) browsers reject None, so use Lax.
const COOKIE_SECURE = process.env.NODE_ENV === "production";
const COOKIE_SAMESITE = COOKIE_SECURE ? "None" : "Lax";

export function setCustomerCookie(res: Response, token: string): void {
  const attrs = [
    `${CUSTOMER_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${COOKIE_SAMESITE}`,
    `Max-Age=${Math.floor(MAX_AGE_MS / 1000)}`,
  ];
  if (COOKIE_SECURE) attrs.push("Secure");
  res.append("Set-Cookie", attrs.join("; "));
}

export function clearCustomerCookie(res: Response): void {
  const attrs = [
    `${CUSTOMER_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    `SameSite=${COOKIE_SAMESITE}`,
    "Max-Age=0",
  ];
  if (COOKIE_SECURE) attrs.push("Secure");
  res.append("Set-Cookie", attrs.join("; "));
}

/** Read the authenticated customer id from the request cookie (or null). */
export function customerIdFromRequest(req: Request): string | null {
  const cookies = parseCookies(req.headers.cookie);
  return verifyCustomerToken(cookies[CUSTOMER_COOKIE]);
}

/** Express middleware: 401 unless a valid customer cookie is present.
 *  On success, attaches the id as req.customerId. */
export function requireCustomer(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const id = customerIdFromRequest(req);
  if (!id) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  (req as Request & { customerId?: string }).customerId = id;
  next();
}
