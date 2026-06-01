import { NextRequest, NextResponse } from 'next/server'
import { getDevAuthSession, setSessionCookie } from '@/lib/auth/session'

/**
 * Dev auth login endpoint
 * Usage: POST /api/auth/dev-login?userId=1
 */
export async function POST(request: NextRequest) {
  if (process.env.ENABLE_DEV_AUTH !== 'true') {
    return NextResponse.json({ error: 'Dev auth is disabled' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const userId = parseInt(searchParams.get('userId') || '1', 10)

  const session = getDevAuthSession(userId)
  if (!session) {
    return NextResponse.json(
      { error: 'Invalid user ID. Valid IDs: 1 (admin), 2 (corrector), 3 (proofreader), 4 (viewer)' },
      { status: 400 }
    )
  }

  await setSessionCookie(session)

  return NextResponse.json({
    success: true,
    message: `Logged in as ${session.name} (${session.role})`,
    session,
  })
}
