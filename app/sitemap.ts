import { MetadataRoute } from 'next'
import { sql, eq, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { lectures } from '@/lib/db/schema'
import { getBaseUrl } from '@/lib/utils'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/community`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ]

  // Dynamic lecture pages
  try {
    const allLectures = await db
      .select({
        slug: lectures.slug,
        updatedAt: lectures.updatedAt,
      })
      .from(lectures)
      .where(or(eq(lectures.status, 'published'), eq(lectures.isPublic, true)))

    const lecturePages: MetadataRoute.Sitemap = allLectures.map((lecture) => ({
      url: `${baseUrl}/lecture/${lecture.slug}`,
      lastModified: lecture.updatedAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    return [...staticPages, ...lecturePages]
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return staticPages
  }
}
