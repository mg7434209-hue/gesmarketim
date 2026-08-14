// Sistem Kur v2 — POST /api/asistan (AI satış danışmanı)
//
// Anthropic Messages API + tool-use döngüsü. KIRMIZI ÇİZGİLER (brief):
//   • AI kendi kafasından watt/adet/fiyat ÜRETMEZ — boyutlandırma yalnızca
//     `hesapla` aracından (src/lib/hesapla.ts, doğrudan import — HTTP değil),
//     ürün/fiyat yalnızca `urun_ara` + `teklif_sun` araçlarından gelir.
//   • teklif_sun'da birim fiyatlar SUNUCUDA veritabanından yeniden çözülür;
//     model ne yazarsa yazsın müşteriye giden fiyat DB'deki finalPrice'tır.
//   • Maliyet/markup/tedarikçi alanları araç çıktılarında YOKTUR (allowlist).
//   • Pasif (status != 'active') veya stoksuz ürün önerilmez — urun_ara
//     sorgusu bunları hiç döndürmez.
//
// ANTHROPIC_API_KEY yoksa uç 503 `asistan_kapali` döner; frontend sihirbaza
// geri düşer. Rate limit: 20 istek/saat/IP (in-memory).

import { Router, type Request, type Response, type NextFunction } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { and, asc, eq, gt, ilike, or, type SQL } from "drizzle-orm";
import { db } from "../db/index.js";
import { categories, products, type ProductImage } from "../db/schema.js";
import { getTenantId } from "../lib/tenant.js";
import { rateLimit } from "../lib/rateLimit.js";
import { hesapla, hesaplaInputSchema } from "../lib/hesapla.js";
import { wattFromName, ahFromName } from "../lib/urunAd.js";

export const asistanRouter = Router();

const MODEL = process.env.ASISTAN_MODEL ?? "claude-sonnet-4-6";
const MAX_TOOL_TURNS = 8;
const MAX_TOKENS = 4096;

function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

const asistanLimiter = rateLimit({
  windowMs: 60 * 60_000,
  max: 20,
  message: "Asistan için saatlik istek sınırına ulaşıldı. Lütfen biraz sonra tekrar deneyin.",
});

// ---------------------------------------------------------------------------
// Girdi doğrulama
// ---------------------------------------------------------------------------
const gecmisSchema = z.object({
  rol: z.enum(["user", "asistan"]),
  metin: z.string().min(1).max(4000),
});

const asistanInputSchema = z.object({
  mesaj: z.string().min(1, "Mesaj boş olamaz").max(2000, "Mesaj çok uzun"),
  gecmis: z.array(gecmisSchema).max(10, "Geçmiş en fazla 10 tur olabilir").default([]),
});

// ---------------------------------------------------------------------------
// Araç tanımları (JSON Schema) — hesapla şeması src/lib/hesapla.ts zod'unun aynası
// ---------------------------------------------------------------------------
const TOOLS: Anthropic.Tool[] = [
  {
    name: "hesapla",
    description:
      "Deterministik güneş enerjisi boyutlandırma motoru. Panel/inverter/akü gereksinimini ve yıllık tasarrufu hesaplar. Boyutlandırma İÇİN TEK KAYNAK budur — kendi hesabını yapma. Ev tipi senaryolarda cihaz listesi, tarımsal sulamada pompa bilgisi gönder (ikisi birden gönderilemez).",
    input_schema: {
      type: "object",
      properties: {
        senaryo: {
          type: "string",
          enum: ["karavan", "bag_evi", "mustakil_ev", "isletme", "tarimsal_sulama"],
          description: "Kullanım senaryosu",
        },
        cihazlar: {
          type: "array",
          description: "Ev tipi senaryolar için cihaz listesi (tarımsal sulamada KULLANILMAZ)",
          items: {
            type: "object",
            properties: {
              ad: { type: "string", description: "Cihaz adı (ör. buzdolabı)" },
              adet: { type: "integer", minimum: 1 },
              watt: { type: "number", description: "Cihaz gücü (W)" },
              saatGun: { type: "number", description: "Günlük çalışma saati" },
            },
            required: ["ad", "adet", "watt", "saatGun"],
          },
        },
        pompa: {
          type: "object",
          description: "YALNIZ tarimsal_sulama senaryosunda",
          properties: {
            hp: { type: "number", description: "Pompa gücü (HP)" },
            gunlukSaat: { type: "number", description: "Günlük sulama saati" },
          },
          required: ["hp", "gunlukSaat"],
        },
        ozerklikGun: {
          type: "number",
          description: "Akü özerkliği (gün). 0 = akü istenmiyor. Varsayılan 1.",
        },
      },
      required: ["senaryo"],
    },
  },
  {
    name: "urun_ara",
    description:
      "Katalogda SATIŞTAKİ ürünleri arar (pasif/stoksuz ürünler zaten gelmez). Fiyatlar KDV dahil ₺ satış fiyatıdır. Ürün ve fiyat bilgisi için TEK KAYNAK budur — fiyat uydurma. minWatt/minAh ile hesapla çıktısındaki gereksinimi karşılayan en küçük ürünü bul.",
    input_schema: {
      type: "object",
      properties: {
        kategori: {
          type: "string",
          description: "Kategori slug'ı (sistem isteminde listelendi). Boş = tüm kategoriler.",
        },
        q: { type: "string", description: "Ürün adında geçen kelime (ör. MPPT, lityum, 48V)" },
        minWatt: { type: "number", description: "En az bu W gücünde (panel/inverter için)" },
        minAh: { type: "number", description: "En az bu Ah kapasitede (akü için)" },
        limit: { type: "integer", description: "En fazla sonuç (varsayılan 10, en çok 20)" },
      },
      required: [],
    },
  },
  {
    name: "teklif_sun",
    description:
      "Müşteriye nihai paket teklifini sunar — sohbeti teklifle bitirirken EN SON bunu çağır. Önce hesapla ile boyutlandır, urun_ara ile ürünleri seç, sonra buraya productId + adet listesini ver. Birim fiyatlar sunucuda veritabanından yeniden çözülür; toplam sunucuda hesaplanır.",
    input_schema: {
      type: "object",
      properties: {
        urunler: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              productId: { type: "string", description: "urun_ara çıktısındaki id" },
              adet: { type: "integer", minimum: 1 },
            },
            required: ["productId", "adet"],
          },
        },
        hesapOzeti: {
          type: "string",
          description: "hesapla çıktısının kısa özeti (günlük tüketim, panel/inverter/akü gereksinimi)",
        },
      },
      required: ["urunler", "hesapOzeti"],
    },
  },
];

// ---------------------------------------------------------------------------
// Araç yürütücüleri
// ---------------------------------------------------------------------------
function runHesapla(input: unknown): unknown {
  const parsed = hesaplaInputSchema.safeParse(input);
  if (!parsed.success) {
    return { hata: parsed.error.issues[0]?.message ?? "Geçersiz hesap girdisi" };
  }
  return hesapla(parsed.data);
}

interface UrunSatiri {
  id: string;
  slug: string;
  ad: string;
  kategori: string | null;
  watt: number | null;
  ah: number | null;
  fiyatTL: number;
  gorsel: string | null;
}

const urunAraInput = z.object({
  kategori: z.string().optional(),
  q: z.string().max(80).optional(),
  minWatt: z.number().positive().optional(),
  minAh: z.number().positive().optional(),
  limit: z.number().int().min(1).max(20).default(10),
});

export async function runUrunAra(tenantId: string, rawInput: unknown): Promise<unknown> {
  const parsed = urunAraInput.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return { hata: parsed.error.issues[0]?.message ?? "Geçersiz arama girdisi" };
  }
  const input = parsed.data;

  const conditions: SQL[] = [
    eq(products.tenantId, tenantId),
    eq(products.status, "active"),
  ];
  // Stokta olmayan ürün önerilmez: dropship her zaman temin edilir, stok
  // ürününde stockQty > 0 şartı aranır.
  const stockCond = or(eq(products.fulfillmentType, "dropship"), gt(products.stockQty, 0));
  if (stockCond) conditions.push(stockCond);

  if (input.kategori) {
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.slug, input.kategori)))
      .limit(1);
    if (!cat) {
      const all = await db
        .select({ slug: categories.slug, name: categories.name })
        .from(categories)
        .where(eq(categories.tenantId, tenantId))
        .orderBy(asc(categories.sortOrder));
      return { hata: `Kategori bulunamadı: ${input.kategori}`, kategoriler: all };
    }
    conditions.push(eq(products.categoryId, cat.id));
  }
  if (input.q) {
    conditions.push(ilike(products.name, `%${input.q}%`));
  }

  const rows = await db.query.products.findMany({
    where: and(...conditions),
    with: { category: { columns: { name: true, slug: true } } },
    orderBy: [asc(products.finalPrice)],
    limit: 100,
  });

  let list: UrunSatiri[] = rows.map((row) => {
    const images = Array.isArray(row.images) ? (row.images as ProductImage[]) : [];
    const primary = images.find((i) => i.isPrimary) ?? images[0];
    return {
      id: row.id,
      slug: row.slug,
      ad: row.name,
      kategori: row.category?.slug ?? null,
      watt: wattFromName(row.name),
      ah: ahFromName(row.name),
      fiyatTL: Number(row.finalPrice),
      gorsel: primary?.url ?? null,
    };
  });

  // Gereksinim filtreleri: değeri addan çıkarılamayan ürün, eşik filtresi
  // istendiğinde ELENİR (yanlış öneri, önerisizlikten kötü).
  if (input.minWatt !== undefined) {
    list = list
      .filter((u) => u.watt !== null && u.watt >= input.minWatt!)
      .sort((a, b) => (a.watt ?? 0) - (b.watt ?? 0) || a.fiyatTL - b.fiyatTL);
  }
  if (input.minAh !== undefined) {
    list = list
      .filter((u) => u.ah !== null && u.ah >= input.minAh!)
      .sort((a, b) => (a.ah ?? 0) - (b.ah ?? 0) || a.fiyatTL - b.fiyatTL);
  }

  const sonuc = list.slice(0, input.limit);
  if (sonuc.length === 0) {
    return { sonuc: [], not: "Kriterlere uyan satıştaki ürün bulunamadı. Filtreyi gevşetip tekrar dene (ör. q veya minWatt'ı değiştir)." };
  }
  return { sonuc };
}

const teklifSunInput = z.object({
  urunler: z
    .array(z.object({ productId: z.string().min(1), adet: z.number().int().min(1).max(200) }))
    .min(1, "Teklifte en az bir ürün olmalı")
    .max(30),
  hesapOzeti: z.string().min(1).max(2000),
});

export interface TeklifPayload {
  urunler: Array<{ productId: string; slug: string; ad: string; adet: number; birimFiyat: number }>;
  paketSku: string;
  toplamTL: number;
  hesapOzeti: string;
}

// Birim fiyatlar burada DB'den YENİDEN çözülür — modelin gördüğü/yazdığı
// hiçbir fiyat müşteriye doğrudan gitmez.
export async function runTeklifSun(
  tenantId: string,
  rawInput: unknown,
): Promise<{ teklif?: TeklifPayload; hata?: string }> {
  const parsed = teklifSunInput.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return { hata: parsed.error.issues[0]?.message ?? "Geçersiz teklif girdisi" };
  }

  const satirlar: TeklifPayload["urunler"] = [];
  let toplamTL = 0;
  for (const item of parsed.data.urunler) {
    const row = await db.query.products.findFirst({
      where: and(
        eq(products.tenantId, tenantId),
        eq(products.status, "active"),
        eq(products.id, item.productId),
      ),
      columns: { id: true, slug: true, name: true, finalPrice: true, fulfillmentType: true, stockQty: true },
    });
    if (!row) {
      return { hata: `Ürün bulunamadı veya satışta değil: ${item.productId}. urun_ara ile geçerli bir ürün seç.` };
    }
    if (row.fulfillmentType !== "dropship" && row.stockQty <= 0) {
      return { hata: `Ürün stokta yok: ${row.name}. urun_ara ile stoktaki bir alternatif seç.` };
    }
    const birimFiyat = Number(row.finalPrice);
    toplamTL += birimFiyat * item.adet;
    satirlar.push({
      productId: row.id,
      slug: row.slug,
      ad: row.name,
      adet: item.adet,
      birimFiyat,
    });
  }

  return {
    teklif: {
      urunler: satirlar,
      paketSku: `SKV2-${Date.now().toString(36).toUpperCase()}`,
      toplamTL: Math.round(toplamTL * 100) / 100,
      hesapOzeti: parsed.data.hesapOzeti,
    },
  };
}

// ---------------------------------------------------------------------------
// Sistem istemi
// ---------------------------------------------------------------------------
function systemPrompt(kategoriler: Array<{ slug: string; name: string }>): string {
  const katList = kategoriler.map((k) => `${k.slug} (${k.name})`).join(", ");
  return [
    "Sen GES Marketim'in (gesmarketim.com — güneş enerjisi e-ticaret) satış danışmanısın.",
    "Samimi, kısa ve net Türkçe konuş. Teknik terimi sadeleştirerek açıkla.",
    "",
    "GÖREV: Müşterinin ihtiyacını anla → hesapla aracıyla boyutlandır → urun_ara ile katalogdan uygun ürünleri seç → teklif_sun ile paket teklifi ver.",
    "",
    "KURALLAR (kesin):",
    "1. Eksik bilgi varsa TEK, en kritik soruyu sor ve dur — soru yağmuru yapma.",
    "2. Boyutlandırmayı ASLA kendin yapma; her zaman hesapla aracını çağır. Watt/adet değerlerini yalnız hesapla çıktısından aktar.",
    "3. Fiyatları ASLA kendin yazma/uydurma; yalnız urun_ara ve teklif_sun çıktısındaki fiyatları kullan.",
    "4. Yalnızca araçların döndürdüğü ürünleri öner — araç dışından ürün adı üretme.",
    "5. Teklife hazır olduğunda MUTLAKA teklif_sun aracını çağır; sonra teklifi metinde kısaca özetle (toplamı belirt).",
    "6. Maliyet, tedarikçi, kâr marjı hakkında konuşma; sorulursa 'liste fiyatlarımız KDV dahildir' de.",
    "7. Fiyatlar KDV dahil ₺; kargo ve isteğe bağlı kurulum ayrıca belirtilir.",
    "8. Konu dışı istekleri kibarca güneş enerjisine geri getir.",
    "",
    `Katalog kategorileri (urun_ara 'kategori' parametresi): ${katList}.`,
    "Tarımsal sulamada akü önerilmez; pompa gündüz doğrudan panelden çalışır (hesapla bunu zaten uygular).",
  ].join("\n");
}

function extractText(resp: Anthropic.Message): string {
  return resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// ---------------------------------------------------------------------------
// POST /api/asistan
// ---------------------------------------------------------------------------
asistanRouter.post(
  "/asistan",
  asistanLimiter,
  asyncHandler(async (req, res) => {
    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(503).json({
        error: "asistan_kapali",
        message: "AI asistan şu an kullanılamıyor. Sihirbazla devam edebilirsiniz.",
      });
      return;
    }

    const parsed = asistanInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        error: "validation",
        message: parsed.error.issues[0]?.message ?? "Geçersiz istek",
      });
      return;
    }
    const { mesaj, gecmis } = parsed.data;

    const t0 = Date.now();
    const tenantId = await getTenantId();
    const kategoriler = await db
      .select({ slug: categories.slug, name: categories.name })
      .from(categories)
      .where(eq(categories.tenantId, tenantId))
      .orderBy(asc(categories.sortOrder));

    const client = new Anthropic();
    const messages: Anthropic.MessageParam[] = [
      ...gecmis.map(
        (g): Anthropic.MessageParam => ({
          role: g.rol === "asistan" ? "assistant" : "user",
          content: g.metin,
        }),
      ),
      { role: "user", content: mesaj },
    ];

    let teklif: TeklifPayload | null = null;
    let metin = "";
    let turns = 0;

    try {
      for (; turns < MAX_TOOL_TURNS; turns++) {
        const resp = await client.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt(kategoriler),
          messages,
          tools: TOOLS,
        });

        if (resp.stop_reason !== "tool_use") {
          metin = extractText(resp);
          break;
        }

        messages.push({ role: "assistant", content: resp.content });
        const results: Anthropic.ToolResultBlockParam[] = [];
        for (const block of resp.content) {
          if (block.type !== "tool_use") continue;
          let out: unknown;
          if (block.name === "hesapla") {
            out = runHesapla(block.input);
          } else if (block.name === "urun_ara") {
            out = await runUrunAra(tenantId, block.input);
          } else if (block.name === "teklif_sun") {
            const r = await runTeklifSun(tenantId, block.input);
            if (r.teklif) teklif = r.teklif;
            out = r.teklif ?? { hata: r.hata };
          } else {
            out = { hata: `Bilinmeyen araç: ${block.name}` };
          }
          console.log(
            `[asistan] araç ${block.name} → ${JSON.stringify(out).slice(0, 200)}`,
          );
          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(out),
          });
        }
        messages.push({ role: "user", content: results });
      }
    } catch (err) {
      if (err instanceof Anthropic.APIError) {
        console.error(`[asistan] API hatası ${err.status}: ${err.message}`);
        res.status(502).json({
          error: "asistan_hata",
          message: "Asistan şu an yanıt veremiyor. Lütfen tekrar deneyin veya sihirbazı kullanın.",
        });
        return;
      }
      throw err;
    }

    if (!metin) {
      // Döngü tavanına takıldı — elimizde teklif varsa yine de sun.
      metin = teklif
        ? "Sizin için hazırladığım paket teklifi aşağıda — sorunuz olursa yardımcı olayım."
        : "Üzgünüm, isteğinizi tamamlayamadım. Sorunuzu biraz daha kısa yazar mısınız?";
    }

    console.log(
      `[asistan] ip=${req.ip} tur=${turns + 1} tip=${teklif ? "teklif" : "soru"} ${Date.now() - t0}ms mesaj="${mesaj.slice(0, 120)}"`,
    );

    res.json({
      tip: teklif ? "teklif" : "soru",
      metin,
      ...(teklif ? { teklif } : {}),
    });
  }),
);
