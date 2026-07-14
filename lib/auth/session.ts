import { SessionPayload } from './types'
import { auth } from './config'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Get the current session from Next-Auth
 */
export async function getSession(): Promise<SessionPayload | null> {
  const nextAuthSession = await auth()
  if (!nextAuthSession?.user?.email) return null

  const s = nextAuthSession as typeof nextAuthSession & { userId: number; role: string }
  return {
    userId: s.userId,
    email: nextAuthSession.user.email,
    name: nextAuthSession.user.name ?? '',
    role: (s.role ?? 'viewer') as SessionPayload['role'],
  }
}

/**
 * Validate that user's session hasn't been invalidated (role change detected)
 * Only call this on sensitive operations (editing, admin actions, etc)
 * Throws error if session is invalid
 */
export async function validateSessionVersion(userId: number, storedSessionVersion: number): Promise<void> {
  const dbUser = await db
    .select({ sessionVersion: users.sessionVersion })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!dbUser[0]) {
    throw new Error('User not found')
  }

  if (storedSessionVersion !== dbUser[0].sessionVersion) {
    throw new Error('Session invalidated: your role or permissions have changed. Please re-login.')
  }
}

