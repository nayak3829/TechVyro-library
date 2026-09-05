import { MetadataRoute } from 'next'
import { canonicalUrl, getCanonicalOrigin } from '@/lib/site-url'
import { ROBOTS_DISALLOW } from '@/lib/seo-routes'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/quiz/leaderboard'],
        disallow: [...ROBOTS_DISALLOW],
      },
    ],
    sitemap: canonicalUrl('/sitemap.xml'),
    host: getCanonicalOrigin(),
  }
}
