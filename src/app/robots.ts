import type { MetadataRoute } from 'next'
import { siteUrl } from './sitemap'

/**
 * Replaces the old static public/robots.txt, which allowed crawling of
 * everything — including the auth-gated /app console and every /api route.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/app/', '/api/', '/forgot-password', '/reset-password'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
