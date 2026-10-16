import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/runtime-config'

export default function robots(): MetadataRoute.Robots {
  const site = siteUrl()
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/donate/success', '/donate/cancel', '/it/donate/success', '/it/donate/cancel'] }],
    sitemap: `${site}/sitemap.xml`,
  }
}
