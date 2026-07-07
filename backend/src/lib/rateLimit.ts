// Minimal in-memory, fixed-window rate limiter (per IP).
//
// Tek instance'lı Railway deployu için yeterli; harici bağımlılık veya store
// gerektirmez. Pencere dolduğunda 429 + Retry-After döner. Bellek büyümesini
// önlemek için süresi geçen kayıtlar periyodik temizlenir.

import type { Request, Response, NextFunction } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  /** Pencere süresi (ms). */
  windowMs: number;
  /** Pencere başına izin verilen istek sayısı. */
  max: number;
  /** 429 gövdesindeki mesaj. */
  message?: string;
}

export function rateLimit(opts: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();
  const message =
    opts.message ?? "Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin.";

  // Süresi dolan kayıtları pencere aralığında bir temizle (unref → process'i
  // açık tutmaz).
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(key);
    }
  }, opts.windowMs);
  sweeper.unref?.();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + opts.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > opts.max) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
      res.status(429).json({ error: "rate_limited", message });
      return;
    }
    next();
  };
}
