-- Add last_points_awarded_at column to users table for rate limiting points awards
ALTER TABLE "users" ADD COLUMN "last_points_awarded_at" timestamp;
