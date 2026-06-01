import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { getSession } from '@/lib/auth/session'
import { hasRole } from '@/lib/auth/middleware'

export async function POST(req: Request) {
  try {
    const session = await getSession()

    // Only allow admins to access this
    if (!session?.userId || !hasRole(session.role, 'admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const testUsers = [
      {
        name: 'Contributor One',
        email: 'contributor1@test.local',
        role: 'contributor',
        sevaPoints: 500,
        avatarUrl: null as string | null,
      },
      {
        name: 'Contributor Two',
        email: 'contributor2@test.local',
        role: 'contributor',
        sevaPoints: 450,
        avatarUrl: null,
      },
      {
        name: 'Contributor Three',
        email: 'contributor3@test.local',
        role: 'contributor',
        sevaPoints: 400,
        avatarUrl: null,
      },
      {
        name: 'Contributor Four',
        email: 'contributor4@test.local',
        role: 'contributor',
        sevaPoints: 350,
        avatarUrl: null,
      },
    ]

    const results = []

    for (const user of testUsers) {
      try {
        await db.insert(users).values(user)
        results.push({ name: user.name, status: 'created' })
      } catch (error) {
        // Likely already exists (unique constraint)
        results.push({ name: user.name, status: 'already_exists' })
      }
    }

    return Response.json({
      success: true,
      message: 'Database seeded with test users',
      results,
    })
  } catch (error) {
    console.error('Seeding error:', error)
    return Response.json(
      { error: 'Failed to seed database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
