import { getSession } from '@/lib/auth/session'
import { hasRole } from '@/lib/auth/middleware'
import { redirect } from 'next/navigation'
import { getAllUsers } from '@/lib/db/queries'
import { AdminUsersClient } from './client'

export default async function AdminUsersPage() {
  const session = await getSession()

  if (!session?.userId || !hasRole(session.role, 'admin')) {
    redirect('/')
  }

  const usersData = await getAllUsers(1, 50)

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold font-heading mb-2">Manage Users</h1>
        <p className="text-muted-foreground">
          View all users, manage roles, and track contributions
        </p>
      </div>

      <AdminUsersClient
        initialUsers={usersData.users}
        totalUsers={usersData.total}
        currentUserId={session.userId}
      />
    </div>
  )
}
