import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return new Response('Missing url', { status: 400 })

  // Only proxy Google Drive URLs
  if (!url.includes('drive.google.com')) {
    return new Response('Only Google Drive URLs supported', { status: 400 })
  }

  const fileIdMatch = url.match(/\/file\/d\/([^\/]+)/)
  if (!fileIdMatch?.[1]) return new Response('Invalid Drive URL', { status: 400 })

  const driveUrl = `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}&confirm=t`

  const range = req.headers.get('range')
  const headers: HeadersInit = { 'User-Agent': 'Mozilla/5.0' }
  if (range) headers['Range'] = range

  const upstream = await fetch(driveUrl, { headers, redirect: 'follow' })

  const responseHeaders = new Headers()
  responseHeaders.set('Content-Type', upstream.headers.get('Content-Type') || 'audio/m4a')
  responseHeaders.set('Accept-Ranges', 'bytes')
  responseHeaders.set('Cache-Control', 'public, max-age=3600')
  const contentLength = upstream.headers.get('Content-Length')
  if (contentLength) responseHeaders.set('Content-Length', contentLength)
  const contentRange = upstream.headers.get('Content-Range')
  if (contentRange) responseHeaders.set('Content-Range', contentRange)

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}
