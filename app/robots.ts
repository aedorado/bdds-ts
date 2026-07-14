import type { MetadataRoute } from 'next'
import { getBaseUrl } from '@/lib/utils'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl()

  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/api/search',
        '/lecture/',
        '/community',
        '/search',
        '/lecture/*/',
      ],
      disallow: [
        '/admin',
        '/dev-login',
        '/auth-error',
        '/api/admin',
        '/api/auth',
        '/workspace',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
