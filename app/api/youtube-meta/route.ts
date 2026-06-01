import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    const res = await fetch(oembedUrl)
    if (!res.ok) return NextResponse.json({ error: 'Could not fetch YouTube metadata' }, { status: 400 })

    const data = await res.json()

    // Extract video ID for thumbnail
    const videoIdMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    const videoId = videoIdMatch?.[1]
    const thumbnailUrl = videoId
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : data.thumbnail_url

    return NextResponse.json({
      title: data.title ?? '',
      author: data.author_name ?? '',
      thumbnailUrl,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 })
  }
}
