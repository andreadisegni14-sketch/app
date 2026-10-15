import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { localizedPath } from '@/lib/seo'

export const dynamic = 'force-dynamic'

const STATIC_PATHS = ['/', '/mission', '/projects', '/sailing', '/gala', '/partners', '/donate', '/transparency', '/contact', '/privacy', '/cookies', '/terms', '/accessibility']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')
  let projects: { slug: string; updatedAt: Date }[] = []
  try {
    projects = await db.project.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } })
  } catch (error) {
    console.error('[sitemap] could not load projects', error)
  }
  const entry = (path: string, lastModified?: Date): MetadataRoute.Sitemap[number] => ({
    url: `${site}${localizedPath('en', path)}`,
    lastModified,
    alternates: { languages: { en: `${site}${localizedPath('en', path)}`, it: `${site}${localizedPath('it', path)}` } },
  })
  return [...STATIC_PATHS.map((p) => entry(p)), ...projects.map((p) => entry(`/projects/${p.slug}`, p.updatedAt))]
}
