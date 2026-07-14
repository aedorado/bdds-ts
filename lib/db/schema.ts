import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  varchar,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { InferSelectModel, InferInsertModel } from 'drizzle-orm'

// ============ USERS TABLE ============
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    avatarUrl: text('avatar_url'),
    role: varchar('role', { length: 50 }).notNull().default('viewer'), // admin | contributor | viewer
    sevaPoints: integer('seva_points').notNull().default(0),
    streakDays: integer('streak_days').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    sessionVersion: integer('session_version').notNull().default(0), // Increment to invalidate sessions
    lastPointsAwardedAt: timestamp('last_points_awarded_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('email_idx').on(table.email),
  ]
)

// ============ LECTURES TABLE ============
export const lectures = pgTable(
  'lectures',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    title: varchar('title', { length: 500 }).notNull(),
    speaker: varchar('speaker', { length: 255 }).notNull(),
    youtubeUrl: text('youtube_url'),
    audioUrl: text('audio_url'),
    place: varchar('place', { length: 255 }),
    lectureDate: timestamp('lecture_date'),
    category: varchar('category', { length: 100 }),
    status: varchar('status', { length: 50 }).notNull().default('not_started'), // not_started | assigned | correcting | proofreading | completed | archived
    thumbnailUrl: text('thumbnail_url'),
    durationSeconds: integer('duration_seconds'),
    tags: text('tags').array(),
    notes: text('notes'),
    rawTranscript: text('raw_transcript'),
    cleanedTranscript: text('cleaned_transcript'),
    assignedCorrectorId: integer('assigned_corrector_id').references(() => users.id, { onDelete: 'set null' }),
    assignedProofreaderId: integer('assigned_proofreader_id').references(() => users.id, { onDelete: 'set null' }),
    completionPercentage: integer('completion_percentage').notNull().default(0),
    createdBy: integer('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    aiProcessedAt: timestamp('ai_processed_at'),
    aiGenerationStatus: varchar('ai_generation_status', { length: 50 }), // pending | completed | failed
    aiGenerationStartedAt: timestamp('ai_generation_started_at'),
    aiGenerationCompletedAt: timestamp('ai_generation_completed_at'),
    aiGenerationError: text('ai_generation_error'),
    isPublic: boolean('is_public').notNull().default(false),
  },
  (table) => [
    index('status_idx').on(table.status),
    index('assigned_corrector_idx').on(table.assignedCorrectorId),
    index('assigned_proofreader_idx').on(table.assignedProofreaderId),
    index('ai_generation_status_idx').on(table.aiGenerationStatus),
    uniqueIndex('slug_idx').on(table.slug),
  ]
)

// ============ COMMENTS TABLE ============
export const comments = pgTable(
  'comments',
  {
    id: serial('id').primaryKey(),
    lectureId: integer('lecture_id').notNull().references(() => lectures.id, { onDelete: 'cascade' }),
    userId: integer('user_id').notNull().references(() => users.id),
    paragraphIndex: integer('paragraph_index').notNull(),
    timestampSeconds: integer('timestamp_seconds'),
    content: text('content').notNull(),
    resolved: boolean('resolved').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('lecture_comments_idx').on(table.lectureId),
    index('paragraph_idx').on(table.paragraphIndex),
  ]
)

// ============ ACTIVITY LOGS TABLE ============
export const activityLogs = pgTable(
  'activity_logs',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),
    lectureId: integer('lecture_id').references(() => lectures.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(), // transcript_corrected, proofread_completed, comment_added, etc.
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('user_activity_idx').on(table.userId),
    index('lecture_activity_idx').on(table.lectureId),
    index('action_idx').on(table.action),
  ]
)

// ============ AI SUMMARIES TABLE ============
export const aiSummaries = pgTable(
  'ai_summaries',
  {
    id: serial('id').primaryKey(),
    lectureId: integer('lecture_id').notNull().unique().references(() => lectures.id, { onDelete: 'cascade' }),
    summary: text('summary'),
    keyTeachings: text('key_teachings').array(),
    keywords: text('keywords').array(),
    themes: text('themes').array(),
    anecdotes: text('anecdotes').array(),
    generatedAt: timestamp('generated_at').notNull().defaultNow(),
  }
)

// ============ CONTRIBUTION STATS TABLE ============
export const contributionStats = pgTable(
  'contribution_stats',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
    transcriptsCorrected: integer('transcripts_corrected').notNull().default(0),
    transcriptsProofread: integer('transcripts_proofread').notNull().default(0),
    minutesProcessed: integer('minutes_processed').notNull().default(0),
    lastActiveAt: timestamp('last_active_at').notNull().defaultNow(),
  }
)

// ============ TYPE EXPORTS ============
export type User = InferSelectModel<typeof users>
export type NewUser = InferInsertModel<typeof users>

export type Lecture = InferSelectModel<typeof lectures>
export type NewLecture = InferInsertModel<typeof lectures>


export type Comment = InferSelectModel<typeof comments>
export type NewComment = InferInsertModel<typeof comments>

export type ActivityLog = InferSelectModel<typeof activityLogs>
export type NewActivityLog = InferInsertModel<typeof activityLogs>

export type AiSummary = InferSelectModel<typeof aiSummaries>
export type NewAiSummary = InferInsertModel<typeof aiSummaries>

export type ContributionStats = InferSelectModel<typeof contributionStats>
export type NewContributionStats = InferInsertModel<typeof contributionStats>
