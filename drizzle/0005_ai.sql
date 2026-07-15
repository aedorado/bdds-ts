ALTER TABLE "ai_summaries" ADD COLUMN IF NOT EXISTS "verses" text[];--> statement-breakpoint
ALTER TABLE "ai_summaries" ADD COLUMN IF NOT EXISTS "personalities" text[];--> statement-breakpoint
ALTER TABLE "ai_summaries" ADD COLUMN IF NOT EXISTS "sadhana_tips" text[];--> statement-breakpoint
ALTER TABLE "ai_summaries" ADD COLUMN IF NOT EXISTS "quotes" text[];--> statement-breakpoint
ALTER TABLE "ai_summaries" ADD COLUMN IF NOT EXISTS "qa" jsonb;