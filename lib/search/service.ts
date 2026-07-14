import { db } from '@/lib/db'
import { lectures } from '@/lib/db/schema'
import { sql, and, ilike, eq, or, SQL } from 'drizzle-orm'
import { z } from 'zod'

export const SearchParamsSchema = z.object({
  q: z.string().optional().default(''),
  speaker: z.string().optional().default(''),
  category: z.string().optional().default(''),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  publishedOnly: z.string().optional().default('true'),
})

export type SearchParams = z.infer<typeof SearchParamsSchema>

export interface SearchResult {
  lectureId: number
  slug: string
  title: string
  speaker: string
  status: string
  snippet: string
  matchTimestamps: number[]
  thumbnailUrl: string | null
}

/**
 * Search lectures using full-text search
 */
export async function searchLectures(params: SearchParams) {
  const parsed = SearchParamsSchema.parse(params)
  const page = Math.max(1, parseInt(parsed.page, 10))
  const limit = Math.min(100, parseInt(parsed.limit, 10))
  const offset = (page - 1) * limit

  const conditions: (SQL | undefined)[] = []

  // Restrict to published or explicitly public lectures unless admin bypasses
  if (parsed.publishedOnly !== 'false') {
    conditions.push(or(eq(lectures.status, 'published'), eq(lectures.isPublic, true)))
  }

  // Full-text search on title, speaker, or transcript content
  if (parsed.q.trim()) {
    conditions.push(
      or(
        ilike(lectures.title, `%${parsed.q}%`),
        ilike(lectures.speaker, `%${parsed.q}%`),
        ilike(lectures.cleanedTranscript, `%${parsed.q}%`),
        ilike(lectures.rawTranscript, `%${parsed.q}%`)
      )
    )
  }

  // Filter by speaker
  if (parsed.speaker.trim()) {
    conditions.push(ilike(lectures.speaker, `%${parsed.speaker}%`))
  }

  // Filter by category
  if (parsed.category.trim()) {
    conditions.push(eq(lectures.category, parsed.category))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Get total count
  const countResult = await db.execute(
    sql`SELECT COUNT(*) as count FROM ${lectures} WHERE ${whereClause || sql`1=1`}`
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawCount = ((countResult as any).rows?.[0] ?? countResult[0] as { count: number })?.count ?? 0
  const total = parseInt(String(rawCount), 10)

  // Get paginated results
  const results = await db.select().from(lectures)
    .where(whereClause || sql`1=1`)
    .orderBy(sql`CASE WHEN ${lectures.completionPercentage} > 0 THEN 1 ELSE 0 END DESC, ${lectures.createdAt} DESC`)
    .limit(limit)
    .offset(offset)

  // Transform to SearchResult format
  const searchResults: SearchResult[] = results.map((lecture) => ({
    lectureId: lecture.id,
    slug: lecture.slug,
    title: lecture.title,
    speaker: lecture.speaker,
    status: lecture.status,
    snippet: getSnippet(lecture.cleanedTranscript || lecture.rawTranscript || '', parsed.q, 200),
    matchTimestamps: extractTimestamps(
      lecture.cleanedTranscript || lecture.rawTranscript || '',
      parsed.q
    ),
    thumbnailUrl: lecture.thumbnailUrl,
  }))

  return {
    results: searchResults,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    hasMore: offset + limit < total,
  }
}

/**
 * Get a text snippet around the search query
 */
function getSnippet(text: string, query: string, length: number = 200): string {
  if (!query.trim() || !text) return text.substring(0, length)

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const index = lowerText.indexOf(lowerQuery)

  if (index === -1) {
    // Fallback to beginning of text
    return text.substring(0, length) + (text.length > length ? '...' : '')
  }

  // Get surrounding context
  const start = Math.max(0, index - length / 2)
  const end = Math.min(text.length, start + length)

  let snippet = text.substring(start, end)

  // Add ellipsis if needed
  if (start > 0) snippet = '...' + snippet
  if (end < text.length) snippet = snippet + '...'

  return snippet
}

/**
 * Extract timestamps that match the query
 * Looks for patterns like [HH:MM:SS] or [MM:SS] near the search term
 */
function extractTimestamps(text: string, query: string): number[] {
  if (!query.trim() || !text) return []

  const timestamps: number[] = []
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()

  // Find all occurrences of the query
  let startIndex = 0
  let index: number

  while ((index = lowerText.indexOf(lowerQuery, startIndex)) !== -1) {
    // Look backwards for a timestamp
    const before = text.substring(Math.max(0, index - 200), index)
    const timestampMatch = before.match(/\[(\d{1,2}):(\d{2})(?::(\d{2}))?\].*$/)

    if (timestampMatch) {
      const hours = parseInt(timestampMatch[1], 10)
      const minutes = parseInt(timestampMatch[2], 10)
      const seconds = timestampMatch[3] ? parseInt(timestampMatch[3], 10) : 0

      const totalSeconds = hours * 3600 + minutes * 60 + seconds
      timestamps.push(totalSeconds)
    }

    startIndex = index + 1
  }

  // Remove duplicates and sort
  return [...new Set(timestamps)].sort((a, b) => a - b)
}

/**
 * Get available speakers for filtering
 */
export async function getAvailableSpeakers() {
  const result = await db.execute(
    sql`SELECT DISTINCT speaker FROM ${lectures} ORDER BY speaker`
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((result as any).rows ?? result).map((row: { speaker: string }) => row.speaker)
}

/**
 * Get available categories for filtering
 */
export async function getAvailableCategories() {
  const result = await db.execute(
    sql`SELECT DISTINCT category FROM ${lectures} WHERE category IS NOT NULL ORDER BY category`
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((result as any).rows ?? result).map((row: { category: string | null }) => row.category).filter(Boolean)
}
