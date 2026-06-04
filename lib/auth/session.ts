import { cookies } from 'next/headers'
import { SessionPayload } from './types'
import { auth } from './config'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const SESSION_COOKIE_NAME = 'devotional_session'
const SESSION_EXPIRY_DAYS = 30

/**
 * Get the current session from cookies (dev) or next-auth (production)
 */
export async function getSession(): Promise<SessionPayload | null> {
  if (process.env.ENABLE_DEV_AUTH !== 'true') {
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

  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

    if (!sessionCookie?.value) {
      return null
    }

    const session = JSON.parse(sessionCookie.value) as SessionPayload
    return session
  } catch {
    return null
  }
}

/**
 * Set a session cookie (dev auth only)
 */
export async function setSessionCookie(session: SessionPayload) {
  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
    path: '/',
  })
}

/**
 * Clear the session cookie
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

/**
 * Get dev auth session (used in development)
 * userId=1 → admin, userId=2 → corrector
 */
export function getDevAuthSession(userId: number): SessionPayload | null {
  if (process.env.ENABLE_DEV_AUTH !== 'true') {
    return null
  }

  const devUsers: Record<number, SessionPayload> = {
    1: {
      userId: 1,
      email: 'admin@devotional.local',
      name: 'Admin User',
      role: 'admin',
    },
    2: {
      userId: 2,
      email: 'corrector@devotional.local',
      name: 'Corrector User',
      role: 'contributor',
    },
    3: {
      userId: 3,
      email: 'proofreader@devotional.local',
      name: 'Proofreader User',
      role: 'contributor',
    },
    4: {
      userId: 4,
      email: 'viewer@devotional.local',
      name: 'Viewer User',
      role: 'viewer',
    },
  }

  return devUsers[userId] || null
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
