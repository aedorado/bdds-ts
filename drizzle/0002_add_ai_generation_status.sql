-- Add AI generation status columns to lectures table
ALTER TABLE "lectures" ADD COLUMN "ai_generation_status" varchar(50);
ALTER TABLE "lectures" ADD COLUMN "ai_generation_started_at" timestamp;
ALTER TABLE "lectures" ADD COLUMN "ai_generation_completed_at" timestamp;
ALTER TABLE "lectures" ADD COLUMN "ai_generation_error" text;

-- Add index for querying by status
CREATE INDEX "ai_generation_status_idx" ON "lectures" ("ai_generation_status");
