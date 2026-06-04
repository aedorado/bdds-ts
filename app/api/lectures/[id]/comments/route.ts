import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { comments, users } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { getPostHogClient } from '@/lib/posthog-server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const lectureId = parseInt(id, 10)
    if (isNaN(lectureId)) return NextResponse.json({ error: 'Invalid lecture ID' }, { status: 400 })

    const rows = await db
      .select({
        id: comments.id,
        paragraphIndex: comments.paragraphIndex,
        timestampSeconds: comments.timestampSeconds,
        content: comments.content,
        resolved: comments.resolved,
        createdAt: comments.createdAt,
        user: { id: users.id, name: users.name },
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.lectureId, lectureId))
      .orderBy(asc(comments.createdAt))

    return NextResponse.json(rows)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const lectureId = parseInt(id, 10)
    if (isNaN(lectureId)) return NextResponse.json({ error: 'Invalid lecture ID' }, { status: 400 })

    const body = await request.json()
    const { paragraphIndex, timestampSeconds, content } = body

    if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

    const result = await db
      .insert(comments)
      .values({
        lectureId,
        userId: session.userId,
        paragraphIndex: paragraphIndex ?? 0,
        timestampSeconds: timestampSeconds ?? null,
        content: content.trim(),
      })
      .returning()

    const posthog = getPostHogClient()
    posthog.capture({
      distinctId: String(session.userId),
      event: 'comment_added',
      properties: {
        lecture_id: lectureId,
        comment_id: result[0].id,
        has_timestamp: timestampSeconds != null,
        paragraph_index: paragraphIndex ?? 0,
      },
    })
    await posthog.shutdown()
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create comment' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const lectureId = parseInt(id, 10)
    if (isNaN(lectureId)) return NextResponse.json({ error: 'Invalid lecture ID' }, { status: 400 })

    const body = await request.json()
    const { commentId, resolved } = body

    const result = await db
      .update(comments)
      .set({ resolved })
      .where(eq(comments.id, commentId))
      .returning()

    return NextResponse.json(result[0])
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update comment' },
      { status: 500 }
    )
  }
}
