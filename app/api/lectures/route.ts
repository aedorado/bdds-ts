import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getLectures, createLecture, CreateLectureSchema } from '@/lib/db/queries'
import { hasRole } from '@/lib/auth/middleware'
import { awardLectureInputBonus } from '@/lib/points'

/**
 * GET /api/lectures - List lectures with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const result = await getLectures(page, Math.min(limit, 100))

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch lectures' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/lectures - Create a new lecture (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasRole(session.role, 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validated = CreateLectureSchema.parse(body)

    const lecture = await createLecture(validated, session.userId)

    await awardLectureInputBonus(session.userId, lecture.id)

    return NextResponse.json(lecture, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create lecture' },
      { status: 400 }
    )
  }
}
