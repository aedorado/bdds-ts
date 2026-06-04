import { NextRequest, NextResponse } from 'next/server'
import { getSession, validateSessionVersion } from '@/lib/auth'
import { processEditingHeartbeat } from '@/lib/points'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const lectureId = Number(body.lectureId)
  if (!lectureId || isNaN(lectureId)) {
    return NextResponse.json({ error: 'Invalid lectureId' }, { status: 400 })
  }

  // Validate session on sensitive operation
  try {
    const sessionVersion = (session as any).sessionVersion ?? 0
    await validateSessionVersion(session.userId, sessionVersion)
  } catch (error) {
    return NextResponse.json({ error: 'Session invalid' }, { status: 401 })
  }

  const result = await processEditingHeartbeat(session.userId, lectureId)
  return NextResponse.json(result)
}
