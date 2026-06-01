import { getSession } from '@/lib/auth/session'
import { hasRole } from '@/lib/auth/middleware'
import { redirect } from 'next/navigation'
import { getLectures, getAllContributors } from '@/lib/db/queries'
import { AdminLecturesClient } from './client'

export default async function AdminLecturesPage() {
  const session = await getSession()

  if (!session?.userId || !hasRole(session.role, 'admin')) {
    redirect('/')
  }

  // Fetch all data in parallel
  const [lecturesData, contributors] = await Promise.all([
    getLectures(1, 50),
    getAllContributors(),
  ])

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold font-heading mb-2">Manage Lectures</h1>
        <p className="text-muted-foreground">
          Upload transcripts, assign contributors, and manage lecture status
        </p>
      </div>

      <AdminLecturesClient
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialLectures={lecturesData.lectures as any}
        totalLectures={lecturesData.total}
        contributors={contributors}
        userId={session.userId}
        currentUserId={session.userId}
      />
    </div>
  )
}
