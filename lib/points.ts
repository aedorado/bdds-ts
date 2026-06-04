import { db } from '@/lib/db'
import { users, contributionStats, activityLogs } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

// Hourly milestone bonus schedule
const HOURLY_MILESTONES: Record<number, number> = { 1: 10, 2: 20, 3: 30, 4: 40 }

function hourlyBonus(hour: number): number {
  return HOURLY_MILESTONES[Math.min(hour, 4)]
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function isYesterday(ref: Date, today: Date) {
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  return isSameDay(ref, yesterday)
}

async function addPoints(userId: number, delta: number) {
  await db.update(users)
    .set({ sevaPoints: sql`${users.sevaPoints} + ${delta}` })
    .where(eq(users.id, userId))
}

async function logActivity(userId: number, action: string, metadata?: Record<string, unknown>, lectureId?: number) {
  await db.insert(activityLogs).values({
    userId,
    lectureId: lectureId ?? null,
    action,
    metadata: metadata ?? null,
  })
}

async function getOrCreateStats(userId: number) {
  const rows = await db.select().from(contributionStats).where(eq(contributionStats.userId, userId)).limit(1)
  if (rows[0]) return rows[0]
  const created = await db.insert(contributionStats).values({
    userId,
    transcriptsCorrected: 0,
    transcriptsProofread: 0,
    minutesProcessed: 0,
    lastActiveAt: new Date(),
  }).returning()
  return created[0]
}

/**
 * Called every 60 seconds while user is actively editing.
 * Awards 1 base point, hourly milestone bonuses, and handles streaks.
 */
export async function processEditingHeartbeat(userId: number, lectureId: number) {
  const stats = await getOrCreateStats(userId)
  const now = new Date()

  const prevMinutes = stats.minutesProcessed
  const newMinutes = prevMinutes + 1

  let totalAwarded = 1 // base: 1 pt / minute
  const bonuses: string[] = []

  // Hourly milestone: did we cross a new hour boundary?
  const prevHours = Math.floor(prevMinutes / 60)
  const newHours = Math.floor(newMinutes / 60)
  if (newHours > prevHours) {
    const bonus = hourlyBonus(newHours)
    totalAwarded += bonus
    bonuses.push(`${newHours}h milestone +${bonus}pts`)
  }

  // Streak logic
  const lastDate = new Date(stats.lastActiveAt)
  let streakDelta = 0

  if (!isSameDay(lastDate, now)) {
    // New day
    const [userRow] = await db.select({ streakDays: users.streakDays })
      .from(users).where(eq(users.id, userId)).limit(1)
    const currentStreak = userRow?.streakDays ?? 0

    if (isYesterday(lastDate, now)) {
      // Consecutive day — extend streak
      const newStreak = currentStreak + 1
      streakDelta = newStreak // award streakDays points (1 for day1, 2 for day2 …)
      await db.update(users).set({ streakDays: newStreak }).where(eq(users.id, userId))
      bonuses.push(`day ${newStreak} streak +${newStreak}pts`)
    } else {
      // Streak broken — reset to 1, award 1 point
      streakDelta = 1
      await db.update(users).set({ streakDays: 1 }).where(eq(users.id, userId))
      bonuses.push('streak reset, day 1 +1pt')
    }
    totalAwarded += streakDelta
  }

  // Persist stats + points atomically-ish
  await db.update(contributionStats).set({
    minutesProcessed: newMinutes,
    lastActiveAt: now,
  }).where(eq(contributionStats.userId, userId))

  await addPoints(userId, totalAwarded)

  await logActivity(userId, 'editing_heartbeat', {
    minutesTotal: newMinutes,
    pointsAwarded: totalAwarded,
    bonuses,
  }, lectureId)

  return { pointsAwarded: totalAwarded, bonuses, totalMinutes: newMinutes }
}

/**
 * Award completion bonus when corrector marks lecture as corrected.
 */
export async function awardCorrectionBonus(userId: number, lectureId: number) {
  const BONUS = 100
  await addPoints(userId, BONUS)
  await db.update(contributionStats)
    .set({ transcriptsCorrected: sql`${contributionStats.transcriptsCorrected} + 1` })
    .where(eq(contributionStats.userId, userId))
  await logActivity(userId, 'lecture_corrected', { pointsAwarded: BONUS }, lectureId)
}

/**
 * Award points when an admin inputs (creates) a new lecture.
 */
export async function awardLectureInputBonus(userId: number, lectureId: number) {
  const BONUS = 25
  await addPoints(userId, BONUS)
  await logActivity(userId, 'lecture_input', { pointsAwarded: BONUS }, lectureId)
}

/**
 * Award completion bonus when proofreader marks lecture as proofread.
 */
export async function awardProofreadBonus(userId: number, lectureId: number) {
  const BONUS = 50
  await addPoints(userId, BONUS)
  await db.update(contributionStats)
    .set({ transcriptsProofread: sql`${contributionStats.transcriptsProofread} + 1` })
    .where(eq(contributionStats.userId, userId))
  await logActivity(userId, 'lecture_proofread', { pointsAwarded: BONUS }, lectureId)
}
