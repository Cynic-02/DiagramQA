import type { MetadataRoute } from 'next'

/**
 * Canonical origin. Vercel injects VERCEL_PROJECT_PRODUCTION_URL, so preview
 * deploys don't advertise themselves as the production domain.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel}`
  return 'https://diagrammind.app'
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  const now = new Date()

  // Only genuinely public pages. /app/* is auth-gated by proxy.ts, and the
  // password-reset routes are single-use links that must never be indexed.
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ]
}
