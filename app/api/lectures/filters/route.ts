import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lectures } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

/**
 * GET /api/lectures/filters
 * Returns unique speakers, categories, and places for autocomplete
 * Cached for 1 hour to reduce database load
 */
export async function GET() {
  try {
    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), 5000)
    )

    const fetchPromise = Promise.all([
      // Fetch unique speakers (limited to avoid huge lists)
      db
        .selectDistinct({ speaker: lectures.speaker })
        .from(lectures)
        .where(sql`${lectures.speaker} IS NOT NULL AND ${lectures.speaker} != ''`)
        .orderBy(lectures.speaker)
        .limit(200),

      // Fetch unique categories
      db
        .selectDistinct({ category: lectures.category })
        .from(lectures)
        .where(sql`${lectures.category} IS NOT NULL AND ${lectures.category} != ''`)
        .orderBy(lectures.category)
        .limit(200),

      // Fetch unique places
      db
        .selectDistinct({ place: lectures.place })
        .from(lectures)
        .where(sql`${lectures.place} IS NOT NULL AND ${lectures.place} != ''`)
        .orderBy(lectures.place)
        .limit(200),
    ])

    const [speakersResult, categoriesResult, placesResult] = await Promise.race([
      fetchPromise,
      timeoutPromise,
    ]) as any

    const speakers = speakersResult.map((r: any) => r.speaker).filter(Boolean)
    const categories = categoriesResult.map((r: any) => r.category).filter(Boolean)
    const places = placesResult.map((r: any) => r.place).filter(Boolean)

    // Cache for 1 hour
    return NextResponse.json(
      {
        speakers,
        categories,
        places,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch (error) {
    console.error('Failed to fetch filters:', error)
    // Return empty arrays gracefully - form works without suggestions
    return NextResponse.json(
      {
        speakers: [],
        categories: [],
        places: [],
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60', // Cache error response for 1 min
        },
      }
    )
  }
}
