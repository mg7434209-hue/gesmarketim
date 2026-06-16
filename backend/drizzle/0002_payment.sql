DO $$ BEGIN
 CREATE TYPE "public"."payment_method" AS ENUM('bank_transfer', 'cash_on_delivery', 'card');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'awaiting', 'paid', 'failed', 'refunded');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_method" "payment_method" DEFAULT 'bank_transfer' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_ref" text;