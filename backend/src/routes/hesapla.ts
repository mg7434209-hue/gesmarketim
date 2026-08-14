// Sistem Kur v2 — POST /api/hesapla
//
// Deterministik boyutlandırma ucu: girdi zod ile doğrulanır, motor
// src/lib/hesapla.ts'tedir (katsayılar orada; burada sayı YOK). AI asistanı da
// aynı motoru doğrudan import eder — HTTP üzerinden değil.

import { Router, type Request, type Response } from "express";
import { hesapla, hesaplaInputSchema } from "../lib/hesapla.js";

export const hesaplaRouter = Router();

hesaplaRouter.post("/hesapla", (req: Request, res: Response) => {
  const parsed = hesaplaInputSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const alan = issue?.path?.length ? ` (${issue.path.join(".")})` : "";
    res.status(400).json({
      error: "validation",
      message: `${issue?.message ?? "Geçersiz istek"}${alan}`,
    });
    return;
  }
  res.json(hesapla(parsed.data));
});
