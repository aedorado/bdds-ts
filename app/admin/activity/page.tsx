import { getSession } from '@/lib/auth/session'
import { hasRole } from '@/lib/auth/middleware'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { activityLogs, users, lectures } from '@/lib/db/schema'
import { desc, eq, count, ilike, and } from 'drizzle-orm'
import { ActivityClient } from './client'

const PAGE_SIZE = 25

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; user?: string }>
}) {
  const session = await getSession()
  if (!session?.userId || !hasRole(session.role, 'admin')) redirect('/')

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const userFilter = params.user?.trim() ?? ''
  const offset = (page - 1) * PAGE_SIZE

  const where = userFilter
    ? and(ilike(users.name, `%${userFilter}%`))
    : undefined

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        metadata: activityLogs.metadata,
        createdAt: activityLogs.createdAt,
        userName: users.name,
        userEmail: users.email,
        userRole: users.role,
        lectureTitle: lectures.title,
        lectureSlug: lectures.slug,
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .leftJoin(lectures, eq(activityLogs.lectureId, lectures.id))
      .where(where)
      .orderBy(desc(activityLogs.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),

    db
      .select({ total: count() })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .where(where),
  ])

  const total = totalResult[0]?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold font-heading mb-2">Activity Log</h1>
        <p className="text-muted-foreground">All contributor actions across lectures</p>
      </div>
      <ActivityClient rows={rows} page={page} totalPages={totalPages} total={total} userFilter={userFilter} />
    </div>
  )
}
