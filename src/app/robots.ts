import type { MetadataRoute } from 'next'
import { isSiteOffline, siteUrl } from '@/lib/runtime-config'

export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  const site = siteUrl()
  if (isSiteOffline()) return { rules: [{ userAgent: '*', disallow: '/' }] }
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/donate/success', '/donate/cancel', '/it/donate/success', '/it/donate/cancel'] }],
    sitemap: `${site}/sitemap.xml`,
  }
}
