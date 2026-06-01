import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getLectureById, updateLecture, deleteLecture } from '@/lib/db/queries'
import { hasRole } from '@/lib/auth/middleware'

/**
 * GET /api/lectures/[id] - Get a specific lecture
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr, 10)

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid lecture ID' }, { status: 400 })
    }

    const lecture = await getLectureById(id)

    if (!lecture) {
      return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })
    }

    return NextResponse.json(lecture)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch lecture' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/lectures/[id] - Update a lecture (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasRole(session.role, 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: idStr } = await params
    const id = parseInt(idStr, 10)

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid lecture ID' }, { status: 400 })
    }

    const body = await request.json()

    const lecture = await updateLecture(id, body)

    if (!lecture) {
      return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })
    }

    return NextResponse.json(lecture)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update lecture' },
      { status: 400 }
    )
  }
}

/**
 * DELETE /api/lectures/[id] - Delete a lecture (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasRole(session.role, 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: idStr } = await params
    const id = parseInt(idStr, 10)

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid lecture ID' }, { status: 400 })
    }

    const lecture = await getLectureById(id)

    if (!lecture) {
      return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })
    }

    await deleteLecture(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete lecture' },
      { status: 500 }
    )
  }
}
