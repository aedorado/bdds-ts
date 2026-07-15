import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lectures } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { or, eq, desc } from 'drizzle-orm'

/**
 * GET /api/library
 * Fetches all lectures with a minimal set of fields to build the folder hierarchy.
 * Admins and contributors can see all lectures. 
 * Viewers and guests can only see public/published lectures.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    const canSeeAll = session?.role === 'admin' || session?.role === 'contributor'

    const query = db
      .select({
        id: lectures.id,
        slug: lectures.slug,
        title: lectures.title,
        speaker: lectures.speaker,
        audioUrl: lectures.audioUrl,
        durationSeconds: lectures.durationSeconds,
        category: lectures.category,
        place: lectures.place,
        lectureDate: lectures.lectureDate,
        status: lectures.status,
        isPublic: lectures.isPublic,
      })
      .from(lectures)
      .orderBy(desc(lectures.createdAt))

    // If not authorized to see all, filter only published or public lectures
    if (!canSeeAll) {
      query.where(
        or(
          eq(lectures.status, 'published'),
          eq(lectures.isPublic, true)
        )
      )
    }

    const results = await query

    return NextResponse.json({ lectures: results })
  } catch (error) {
    console.error('Failed to fetch library lectures:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch library lectures' },
      { status: 500 }
    )
  }
}
export const dynamic = 'force-dynamic'
