ALTER TABLE "categories" ALTER COLUMN "default_markup_percent" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "default_markup_percent" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cost_usd" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sale_usd" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "competitor_price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "default_markup" numeric(6, 4) DEFAULT '0.22' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "fx_usd_try" numeric(12, 4) DEFAULT '47.20' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "fx_buffer_pct" numeric(6, 2) DEFAULT '2.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "min_profit_pct" numeric(6, 2) DEFAULT '10.00' NOT NULL;--> statement-breakpoint
-- Sabit %22 dönemi: kademeli (tiered) marj KAYITLARI boşaltılır; kolon/tablo
-- yapısı duruyor — ileride bir kademeye değer yazmak onu yeniden devreye alır.
UPDATE "suppliers" SET "default_markup_percent" = NULL;--> statement-breakpoint
UPDATE "categories" SET "default_markup_percent" = NULL;--> statement-breakpoint
UPDATE "products" SET "markup_percent" = NULL;--> statement-breakpoint
-- Mevcut tenant kayıtlarında da sabit marjı garantiye al (yeni kolon default'u
-- zaten 0.22 basar; bu satır açık niyet beyanı).
UPDATE "tenants" SET "default_markup" = '0.22';
