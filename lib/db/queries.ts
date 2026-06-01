import { db } from '@/lib/db'
import { lectures, users, contributionStats, aiSummaries } from '@/lib/db/schema'
import { eq, desc, or } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { z } from 'zod'

export const CreateLectureSchema = z.object({
  slug: z.string().toLowerCase().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(500),
  speaker: z.string().min(1).max(255),
  youtubeUrl: z.string().url().optional().or(z.literal('')),
  audioUrl: z.string().url().optional().or(z.literal('')),
  place: z.string().max(255).optional().or(z.literal('')),
  lectureDate: z.date().optional(),
  category: z.string().max(100).optional().or(z.literal('')),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
  durationSeconds: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional().or(z.literal('')),
  rawTranscript: z.string().optional().or(z.literal('')),
})

export type CreateLectureInput = z.infer<typeof CreateLectureSchema>

/**
 * Get a single lecture by id
 */
export async function getLecture(id: number) {
  const rows = await db.select().from(lectures).where(eq(lectures.id, id)).limit(1)
  return rows[0] ?? null
}

/**
 * Get all lectures with pagination
 */
export async function getLectures(page: number = 1, limit: number = 10) {
  const offset = (page - 1) * limit

  const allLectures = await db
    .select()
    .from(lectures)
    .orderBy(desc(lectures.createdAt))
    .limit(limit)
    .offset(offset)

  const countResult = await db
    .select({ count: sql`COUNT(*)`.mapWith(Number) })
    .from(lectures)

  const total = countResult[0]?.count || 0

  return {
    lectures: allLectures,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Get lecture by ID
 */
export async function getLectureById(id: number) {
  const result = await db
    .select()
    .from(lectures)
    .where(eq(lectures.id, id))
    .limit(1)

  return result[0] || null
}

/**
 * Get lecture by slug
 */
export async function getLectureBySlug(slug: string) {
  const result = await db
    .select()
    .from(lectures)
    .where(eq(lectures.slug, slug))
    .limit(1)

  return result[0] || null
}

/**
 * Get lecture with AI summary by slug (public viewer)
 */
export async function getLectureWithAiBySlug(slug: string) {
  const result = await db
    .select({
      lecture: lectures,
      ai: aiSummaries,
    })
    .from(lectures)
    .leftJoin(aiSummaries, eq(aiSummaries.lectureId, lectures.id))
    .where(eq(lectures.slug, slug))
    .limit(1)

  if (!result[0]) return null
  return { ...result[0].lecture, ai: result[0].ai }
}

/**
 * Create a new lecture
 */
export async function createLecture(
  input: CreateLectureInput & { rawTranscript?: string },
  createdByUserId: number
) {
  const validated = CreateLectureSchema.parse(input)

  const lectureData: Record<string, unknown> = {
    slug: validated.slug,
    title: validated.title,
    speaker: validated.speaker,
    category: validated.category ? validated.category : undefined,
    tags: validated.tags && validated.tags.length > 0 ? validated.tags : undefined,
    notes: validated.notes ? validated.notes : undefined,
    rawTranscript: input.rawTranscript ? input.rawTranscript : undefined,
    createdBy: createdByUserId,
    status: 'not_started',
  }

  // Add optional fields only if they have values
  if (validated.youtubeUrl) lectureData.youtubeUrl = validated.youtubeUrl
  if (validated.audioUrl) lectureData.audioUrl = validated.audioUrl
  if (validated.place) lectureData.place = validated.place
  if (validated.lectureDate) lectureData.lectureDate = validated.lectureDate
  if (validated.thumbnailUrl) lectureData.thumbnailUrl = validated.thumbnailUrl
  if (validated.durationSeconds !== undefined) lectureData.durationSeconds = validated.durationSeconds

  const result = await db
    .insert(lectures)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .values(lectureData as any)
    .returning()

  return result[0]
}

/**
 * Update lecture
 */
export async function updateLecture(
  id: number,
  input: Partial<CreateLectureInput> & {
    cleanedTranscript?: string
    status?: string
    completionPercentage?: number
    assignedCorrectorId?: number | null
    assignedProofreaderId?: number | null
  }
) {
  const result = await db
    .update(lectures)
    .set({
      ...(input.title && { title: input.title }),
      ...(input.speaker && { speaker: input.speaker }),
      ...(input.youtubeUrl !== undefined && { youtubeUrl: input.youtubeUrl || null }),
      ...(input.audioUrl !== undefined && { audioUrl: input.audioUrl || null }),
      ...(input.place !== undefined && { place: input.place || null }),
      ...(input.lectureDate && { lectureDate: input.lectureDate }),
      ...(input.category !== undefined && { category: input.category || null }),
      ...(input.thumbnailUrl !== undefined && { thumbnailUrl: input.thumbnailUrl || null }),
      ...(input.durationSeconds !== undefined && { durationSeconds: input.durationSeconds || null }),
      ...(input.tags && { tags: input.tags }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
      ...(input.cleanedTranscript && { cleanedTranscript: input.cleanedTranscript }),
      ...(input.status && { status: input.status }),
      ...(input.completionPercentage !== undefined && { completionPercentage: input.completionPercentage }),
      ...(input.assignedCorrectorId !== undefined && { assignedCorrectorId: input.assignedCorrectorId }),
      ...(input.assignedProofreaderId !== undefined && { assignedProofreaderId: input.assignedProofreaderId }),
      updatedAt: new Date(),
    })
    .where(eq(lectures.id, id))
    .returning()

  return result[0]
}

/**
 * Update raw transcript
 */
export async function updateRawTranscript(id: number, rawTranscript: string) {
  return updateLecture(id, { rawTranscript })
}

/**
 * Get lectures by status
 */
export async function getLecturesByStatus(status: string) {
  return db
    .select()
    .from(lectures)
    .where(eq(lectures.status, status))
    .orderBy(desc(lectures.createdAt))
}

/**
 * Get lectures assigned to a user
 */
export async function getLecturesAssignedToUser(
  userId: number,
  role: 'contributor' | 'admin'
) {
  // Contributors can be assigned as correctors or proofreaders
  // Check both fields for assigned work
  return db
    .select()
    .from(lectures)
    .where(
      or(
        eq(lectures.assignedCorrectorId, userId),
        eq(lectures.assignedProofreaderId, userId)
      )
    )
    .orderBy(desc(lectures.createdAt))
}

/**
 * Delete lecture
 */
export async function deleteLecture(id: number) {
  await db.delete(lectures).where(eq(lectures.id, id))
}

/**
 * Get all contributors (can be assigned as corrector or proofreader)
 */
export async function getAllContributors() {
  return db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.role, 'contributor'))
    .orderBy(users.name)
}

/**
 * Get all correctors
 */
export async function getAllCorrectors() {
  return db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.role, 'corrector'))
    .orderBy(users.name)
}

/**
 * Get all proofreaders
 */
export async function getAllProofreaders() {
  return db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.role, 'proofreader'))
    .orderBy(users.name)
}

/**
 * Get lecture with user info (creator, corrector, proofreader)
 */
export async function getLectureWithUsers(id: number) {
  const result = await db
    .select({
      lecture: lectures,
      creator: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(lectures)
    .leftJoin(users, eq(lectures.createdBy, users.id))
    .where(eq(lectures.id, id))
    .limit(1)

  return result[0] || null
}

/**
 * Get all users with pagination
 */
export async function getAllUsers(page: number = 1, limit: number = 20) {
  const offset = (page - 1) * limit

  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      sevaPoints: users.sevaPoints,
      streakDays: users.streakDays,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset)

  const countResult = await db
    .select({ count: sql`COUNT(*)`.mapWith(Number) })
    .from(users)

  const total = countResult[0]?.count || 0

  return {
    users: allUsers,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Get user with contribution stats
 */
export async function getUserWithStats(userId: number) {
  const result = await db
    .select({
      user: {
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        sevaPoints: users.sevaPoints,
        streakDays: users.streakDays,
        isActive: users.isActive,
        createdAt: users.createdAt,
      },
      stats: {
        transcriptsCorrected: contributionStats.transcriptsCorrected,
        transcriptsProofread: contributionStats.transcriptsProofread,
        minutesProcessed: contributionStats.minutesProcessed,
        lastActiveAt: contributionStats.lastActiveAt,
      },
    })
    .from(users)
    .leftJoin(contributionStats, eq(users.id, contributionStats.userId))
    .where(eq(users.id, userId))
    .limit(1)

  return result[0] || null
}

/**
 * Update user role
 */
export async function updateUserRole(userId: number, newRole: string) {
  const validRoles = ['admin', 'contributor', 'viewer']
  if (!validRoles.includes(newRole)) {
    throw new Error(`Invalid role: ${newRole}`)
  }

  const result = await db
    .update(users)
    .set({ role: newRole })
    .where(eq(users.id, userId))
    .returning()

  return result[0]
}

/**
 * Deactivate user
 */
export async function deactivateUser(userId: number) {
  const result = await db
    .update(users)
    .set({ isActive: false })
    .where(eq(users.id, userId))
    .returning()

  return result[0]
}

/**
 * Reactivate user
 */
export async function reactivateUser(userId: number) {
  const result = await db
    .update(users)
    .set({ isActive: true })
    .where(eq(users.id, userId))
    .returning()

  return result[0]
}
