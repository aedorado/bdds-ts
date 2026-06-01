import { getSession } from '@/lib/auth/session'
import { hasRole } from '@/lib/auth/middleware'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { lectures, users, activityLogs } from '@/lib/db/schema'
import { count, sql } from 'drizzle-orm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AdminDashboardCharts } from '@/components/admin/dashboard-charts'
import { Activity, BookOpen, Users, TrendingUp } from 'lucide-react'

export default async function AdminPage() {
  const session = await getSession()

  if (!session?.userId || !hasRole(session.role, 'admin')) {
    redirect('/')
  }

  // Get metrics
  const [lectureStats, userStats, activityStats] = await Promise.all([
    Promise.all([
      db.select({ count: count() }).from(lectures).where(sql`status = 'completed'`),
      db.select({ count: count() }).from(lectures).where(sql`status = 'correcting'`),
      db.select({ count: count() }).from(lectures).where(sql`status = 'proofreading'`),
      db.select({ count: count() }).from(lectures),
    ]),
    db.select({ count: count() }).from(users),
    db.execute(
      sql`
        SELECT action, COUNT(*) as count 
        FROM ${activityLogs}
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY action
        ORDER BY count DESC
      `
    ),
  ])

  const completedLectures = lectureStats[0][0].count
  const correctingLectures = lectureStats[1][0].count
  const proofreadingLectures = lectureStats[2][0].count
  const totalLectures = lectureStats[3][0].count
  const totalUsers = userStats[0].count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activities = ((activityStats as any) ?? []) as { action: string; count: string | number }[]

  // Status distribution data
  const statusData = [
    { name: 'Completed', value: completedLectures, fill: '#9ACD32' },
    { name: 'Correcting', value: correctingLectures, fill: '#FFA500' },
    { name: 'Proofreading', value: proofreadingLectures, fill: '#87CEEB' },
    { name: 'Pending', value: Math.max(0, totalLectures - completedLectures - correctingLectures - proofreadingLectures), fill: '#D3D3D3' },
  ]

  // Activity data for bar chart
  const activityData = activities.map((a) => ({
    name: a.action.replace(/_/g, ' '),
    count: parseInt(a.count.toString()),
  }))

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold font-heading mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Platform metrics and management
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Lectures */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Total Lectures</CardTitle>
              <BookOpen className="w-4 h-4 text-saffron-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalLectures}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {completedLectures} completed
            </p>
          </CardContent>
        </Card>

        {/* Total Users */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Total Users</CardTitle>
              <Users className="w-4 h-4 text-tulasi-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active contributors
            </p>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Completion Rate</CardTitle>
              <TrendingUp className="w-4 h-4 text-lotus-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {completedLectures} / {totalLectures}
            </p>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">In Progress</CardTitle>
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {correctingLectures + proofreadingLectures}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {correctingLectures} correcting
            </p>
          </CardContent>
        </Card>
      </div>

      <AdminDashboardCharts statusData={statusData} activityData={activityData} />

      {/* Status Breakdown Details */}
      <Card>
        <CardHeader>
          <CardTitle>Status Breakdown</CardTitle>
          <CardDescription>Detailed metrics for each status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-green-900 dark:text-green-100">Completed</h3>
                <Badge variant="default" className="bg-green-600">
                  ✓
                </Badge>
              </div>
              <p className="text-2xl font-bold text-green-600">{completedLectures}</p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                {totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0}% of total
              </p>
            </div>

            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-orange-900 dark:text-orange-100">Correcting</h3>
                <Badge variant="secondary">◐</Badge>
              </div>
              <p className="text-2xl font-bold text-orange-600">{correctingLectures}</p>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                Pending correction review
              </p>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Proofreading</h3>
                <Badge variant="secondary">◑</Badge>
              </div>
              <p className="text-2xl font-bold text-blue-600">{proofreadingLectures}</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Pending final review
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/20 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Pending</h3>
                <Badge variant="secondary">○</Badge>
              </div>
              <p className="text-2xl font-bold text-slate-600">
                {Math.max(0, totalLectures - completedLectures - correctingLectures - proofreadingLectures)}
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                Awaiting assignment
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
