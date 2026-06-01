import { NextRequest, NextResponse } from 'next/server'
import { getLectureBySlug } from '@/lib/db/queries'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const lecture = await getLectureBySlug(slug)

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
