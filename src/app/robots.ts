import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/donate/success', '/donate/cancel', '/it/donate/success', '/it/donate/cancel'] }],
    sitemap: `${site}/sitemap.xml`,
  }
}
