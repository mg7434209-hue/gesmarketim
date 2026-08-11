CREATE TABLE IF NOT EXISTS "supplier_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"supplier_id" uuid,
	"price_date" date NOT NULL,
	"cost_usd" numeric(12, 2),
	"cost_try" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "supplier_prices" ADD CONSTRAINT "supplier_prices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "supplier_prices" ADD CONSTRAINT "supplier_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "supplier_prices" ADD CONSTRAINT "supplier_prices_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_prices_product_supplier_date_idx" ON "supplier_prices" USING btree ("product_id","supplier_id","price_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplier_prices_product_idx" ON "supplier_prices" USING btree ("tenant_id","product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplier_prices_supplier_idx" ON "supplier_prices" USING btree ("supplier_id");