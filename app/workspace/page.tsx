import { getSession } from '@/lib/auth/session'
import { hasRole } from '@/lib/auth/middleware'
import { redirect } from 'next/navigation'
import { getLecturesAssignedToUser } from '@/lib/db/queries'
import { getUserContributionStats, getUserRank, getBadgeTier } from '@/lib/gamification'
import WorkspaceClient from '@/components/workspace-client'

export default async function WorkspacePage() {
  const session = await getSession()
  if (!session?.userId) {
    redirect('/dev-login')
  }
  if (!hasRole(session.role, 'contributor')) {
    redirect('/')
  }
  const [assignedLectures, stats, rank] = await Promise.all([
    getLecturesAssignedToUser(session.userId, session.role as 'contributor' | 'admin'),
    getUserContributionStats(session.userId),
    getUserRank(session.userId),
  ])
  const user = session
  const tier = getBadgeTier(0)
  const contributionData = [
    { week: 'Week 1', points: 200 },
    { week: 'Week 2', points: 320 },
    { week: 'Week 3', points: 280 },
    { week: 'Week 4', points: 450 },
  ]
  return (
    <WorkspaceClient
      user={user}
      tier={tier}
      assignedLectures={assignedLectures}
      stats={stats}
      rank={rank}
      contributionData={contributionData}
      userId={session.userId}
    />
  )
}
