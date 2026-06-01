import { NextRequest, NextResponse } from 'next/server'
import { searchLectures, getAvailableSpeakers, getAvailableCategories } from '@/lib/search/service'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    if (searchParams.get('filters') === 'true') {
      const [speakers, categories] = await Promise.all([
        getAvailableSpeakers(),
        getAvailableCategories(),
      ])
      return NextResponse.json({ speakers, categories })
    }

    const session = await getSession()
    const isAdmin = session?.role === 'admin'

    // publishedOnly=false is only honoured for admins
    const publishedOnlyParam = searchParams.get('publishedOnly')
    const publishedOnly = (!isAdmin || publishedOnlyParam !== 'false') ? 'true' : 'false'

    const result = await searchLectures({
      q: searchParams.get('q') || '',
      speaker: searchParams.get('speaker') || '',
      category: searchParams.get('category') || '',
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
      publishedOnly,
    })

    return NextResponse.json({ ...result, isAdmin })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    )
  }
}
