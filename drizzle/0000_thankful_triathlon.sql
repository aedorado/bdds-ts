CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"lecture_id" integer,
	"action" varchar(100) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"lecture_id" integer NOT NULL,
	"summary" text,
	"key_teachings" text[],
	"keywords" text[],
	"themes" text[],
	"generated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_summaries_lecture_id_unique" UNIQUE("lecture_id")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"lecture_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"paragraph_index" integer NOT NULL,
	"timestamp_seconds" integer,
	"content" text NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contribution_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"transcripts_corrected" integer DEFAULT 0 NOT NULL,
	"transcripts_proofread" integer DEFAULT 0 NOT NULL,
	"minutes_processed" integer DEFAULT 0 NOT NULL,
	"last_active_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contribution_stats_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "lectures" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(500) NOT NULL,
	"speaker" varchar(255) NOT NULL,
	"youtube_url" text,
	"audio_url" text,
	"place" varchar(255),
	"lecture_date" timestamp,
	"category" varchar(100),
	"status" varchar(50) DEFAULT 'not_started' NOT NULL,
	"thumbnail_url" text,
	"duration_seconds" integer,
	"tags" text[],
	"notes" text,
	"raw_transcript" text,
	"cleaned_transcript" text,
	"assigned_corrector_id" integer,
	"assigned_proofreader_id" integer,
	"completion_percentage" integer DEFAULT 0 NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ai_processed_at" timestamp,
	CONSTRAINT "lectures_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"avatar_url" text,
	"role" varchar(50) DEFAULT 'viewer' NOT NULL,
	"seva_points" integer DEFAULT 0 NOT NULL,
	"streak_days" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_summaries" ADD CONSTRAINT "ai_summaries_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_stats" ADD CONSTRAINT "contribution_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lectures" ADD CONSTRAINT "lectures_assigned_corrector_id_users_id_fk" FOREIGN KEY ("assigned_corrector_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lectures" ADD CONSTRAINT "lectures_assigned_proofreader_id_users_id_fk" FOREIGN KEY ("assigned_proofreader_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lectures" ADD CONSTRAINT "lectures_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_activity_idx" ON "activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lecture_activity_idx" ON "activity_logs" USING btree ("lecture_id");--> statement-breakpoint
CREATE INDEX "action_idx" ON "activity_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "lecture_comments_idx" ON "comments" USING btree ("lecture_id");--> statement-breakpoint
CREATE INDEX "paragraph_idx" ON "comments" USING btree ("paragraph_index");--> statement-breakpoint
CREATE INDEX "status_idx" ON "lectures" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assigned_corrector_idx" ON "lectures" USING btree ("assigned_corrector_id");--> statement-breakpoint
CREATE INDEX "assigned_proofreader_idx" ON "lectures" USING btree ("assigned_proofreader_id");--> statement-breakpoint
CREATE UNIQUE INDEX "slug_idx" ON "lectures" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "email_idx" ON "users" USING btree ("email");