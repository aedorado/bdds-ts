import { db } from '@/lib/db'
import { users, activityLogs, contributionStats } from '@/lib/db/schema'
import { sql, desc, eq } from 'drizzle-orm'

export type BadgeTier = 'Shraddha' | 'Sadhu-sanga' | 'Bhajana-kriya' | 'Anartha-nivritti' | 'Nishtha' | 'Ruchi' | 'Asakti' | 'Rati' | 'Prema'

/**
 * Get badge tier based on seva points
 */
export function getBadgeTier(sevaPoints: number): BadgeTier {
  if (sevaPoints >= 50000) return 'Prema'
  if (sevaPoints >= 40000) return 'Rati'
  if (sevaPoints >= 30000) return 'Asakti'
  if (sevaPoints >= 20000) return 'Ruchi'
  if (sevaPoints >= 10000) return 'Nishtha'
  if (sevaPoints >= 5000) return 'Anartha-nivritti'
  if (sevaPoints >= 2000) return 'Bhajana-kriya'
  if (sevaPoints >= 500) return 'Sadhu-sanga'
  return 'Shraddha'
}

/**
 * Get badge color based on tier
 */
export function getBadgeColor(tier: BadgeTier): string {
  switch (tier) {
    case 'Prema':
      return 'bg-gradient-to-r from-rose-400 to-red-700'
    case 'Rati':
      return 'bg-gradient-to-r from-red-400 to-red-600'
    case 'Asakti':
      return 'bg-gradient-to-r from-orange-400 to-orange-600'
    case 'Ruchi':
      return 'bg-gradient-to-r from-yellow-400 to-amber-600'
    case 'Nishtha':
      return 'bg-gradient-to-r from-saffron-400 to-saffron-600'
    case 'Anartha-nivritti':
      return 'bg-gradient-to-r from-tulasi-400 to-tulasi-600'
    case 'Bhajana-kriya':
      return 'bg-gradient-to-r from-cyan-400 to-cyan-600'
    case 'Sadhu-sanga':
      return 'bg-gradient-to-r from-sky-400 to-sky-600'
    case 'Shraddha':
      return 'bg-gradient-to-r from-slate-400 to-slate-600'
  }
}

/**
 * Get top users by seva points (leaderboard)
 */
export async function getTopUsers(limit: number = 10, _timeframe: 'month' | 'all' = 'all') {
  const query = db
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      email: users.email,
      sevaPoints: users.sevaPoints,
      role: users.role,
    })
    .from(users)
    .orderBy(desc(users.sevaPoints))
    .limit(limit)

  const topUsers = await query

  return topUsers.map((user, index) => ({
    ...user,
    rank: index + 1,
    tier: getBadgeTier(user.sevaPoints),
  }))
}

/**
 * Get user rank on leaderboard
 */
export async function getUserRank(userId: number) {
  const user = await db.select({ sevaPoints: users.sevaPoints }).from(users).where(eq(users.id, userId)).limit(1)

  if (!user.length) return null

  const higherCount = await db.execute(
    sql`SELECT COUNT(*) as count FROM ${users} WHERE seva_points > ${user[0].sevaPoints}`
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = ((higherCount as any).rows?.[0] ?? higherCount[0]) as { count: number | string } | undefined
  return (row ? Number(row.count) : 0) + 1
}

/**
 * Award seva points to a user
 */
export async function awardSevaPoints(userId: number, points: number, reason: string) {
  // Update user points
  const result = await db.execute(
    sql`UPDATE ${users} SET seva_points = seva_points + ${points} WHERE id = ${userId}`
  )

  // Log the activity
  await db.insert(activityLogs).values({
    userId,
    action: 'seva_points_awarded',
    metadata: { points, reason },
  })

  return result
}

/**
 * Get user contribution stats
 */
export async function getUserContributionStats(userId: number) {
  const stats = await db
    .select()
    .from(contributionStats)
    .where(eq(contributionStats.userId, userId))
    .limit(1)

  return stats[0] || null
}

/**
 * Update contribution stats
 */
export async function updateContributionStats(
  userId: number,
  updates: {
    transcriptsCorrected?: number
    transcriptsProofread?: number
    minutesProcessed?: number
  }
) {
  // Check if record exists
  const existing = await getUserContributionStats(userId)

  if (existing) {
    return db
      .update(contributionStats)
      .set({
        ...updates,
        lastActiveAt: new Date(),
      })
      .where(eq(contributionStats.userId, userId))
  } else {
    return db.insert(contributionStats).values({
      userId,
      transcriptsCorrected: updates.transcriptsCorrected || 0,
      transcriptsProofread: updates.transcriptsProofread || 0,
      minutesProcessed: updates.minutesProcessed || 0,
    })
  }
}

/**
 * Get activity summary for dashboard
 */
export async function getActivitySummary(hours: number = 24) {
  const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000)

  const result = await db.execute(
    sql`
      SELECT action, COUNT(*) as count 
      FROM ${activityLogs} 
      WHERE created_at > ${cutoffDate}
      GROUP BY action
      ORDER BY count DESC
    `
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((result as any).rows ?? result) as { action: string; count: number }[]
}

/**
 * Get recent activity log
 */
export async function getRecentActivity(limit: number = 20) {
  return db
    .select()
    .from(activityLogs)
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit)
}
