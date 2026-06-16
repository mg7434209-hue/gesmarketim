// Lightweight admin authentication. No external session store / JWT lib:
// a stateless, HMAC-signed cookie token keyed on ADMIN_SESSION_SECRET.
//
// Token format:  base64url(payload) "." base64url(hmac)
//   payload = `${subject}:${issuedAtMs}`
// Verification checks the signature (timing-safe) and a max-age window.
//
// Credentials come from ADMIN_USERNAME / ADMIN_PASSWORD. Comparison is
// timing-safe. There is a single admin identity — sufficient for this shop.

import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

const SECRET = process.env.ADMIN_SESSION_SECRET ?? "change-me-in-production";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "change-me-in-production";

export const ADMIN_COOKIE = "gm_admin";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün
const SUBJECT = "admin";

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

/** Validate admin credentials (timing-safe on both fields). */
export function verifyCredentials(username: string, password: string): boolean {
  // Compare both regardless of the first result to avoid short-circuit timing leaks.
  const userOk = timingSafeEqual(username ?? "", ADMIN_USERNAME);
  const passOk = timingSafeEqual(password ?? "", ADMIN_PASSWORD);
  return userOk && passOk;
}

/** Issue a signed session token for the admin subject. */
export function issueToken(): string {
  const payload = `${SUBJECT}:${Date.now()}`;
  return `${b64url(payload)}.${sign(payload)}`;
}

/** Verify a token's signature and freshness. Returns true when valid. */
export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;

  let payload: string;
  try {
    payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
  } catch {
    return false;
  }

  if (!timingSafeEqual(signature, sign(payload))) return false;

  const [subject, issuedAtStr] = payload.split(":");
  if (subject !== SUBJECT) return false;
  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt)) return false;
  if (Date.now() - issuedAt > MAX_AGE_MS) return false;

  return true;
}

/** Minimal cookie-header parser (avoids a cookie-parser dependency). */
export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

export function setAdminCookie(res: Response, token: string): void {
  const secure = process.env.NODE_ENV === "production";
  const attrs = [
    `${ADMIN_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(MAX_AGE_MS / 1000)}`,
  ];
  if (secure) attrs.push("Secure");
  res.append("Set-Cookie", attrs.join("; "));
}

export function clearAdminCookie(res: Response): void {
  const secure = process.env.NODE_ENV === "production";
  const attrs = [
    `${ADMIN_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) attrs.push("Secure");
  res.append("Set-Cookie", attrs.join("; "));
}

/** Express middleware: 401 unless a valid admin cookie is present. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const cookies = parseCookies(req.headers.cookie);
  if (verifyToken(cookies[ADMIN_COOKIE])) {
    next();
    return;
  }
  res.status(401).json({ error: "unauthorized" });
}
