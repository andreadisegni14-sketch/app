import 'server-only'
import { db } from '@/lib/db'
import type { Pillar, ProjectStatus } from '@/generated/prisma/enums'

/** Read models for public pages. Only published records; never personal data. */

export function pick<T extends Record<string, unknown>>(record: T, base: string, locale: string): string {
  const key = `${base}${locale === 'it' ? 'It' : 'En'}`
  const fallback = `${base}En`
  return String(record[key] ?? record[fallback] ?? '')
}

export function pickList(record: { goalsEn: string[]; goalsIt: string[] }, locale: string): string[] {
  return locale === 'it' && record.goalsIt.length ? record.goalsIt : record.goalsEn
}

export async function listPublishedProjects(filters: { status?: ProjectStatus; pillar?: Pillar } = {}) {
  return db.project.findMany({
    where: { isPublished: true, ...(filters.status ? { status: filters.status } : {}), ...(filters.pillar ? { pillar: filters.pillar } : {}) },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      slug: true,
      pillar: true,
      status: true,
      isDemo: true,
      titleEn: true,
      titleIt: true,
      summaryEn: true,
      summaryIt: true,
      locationEn: true,
      locationIt: true,
      budgetCents: true,
      budgetIsIllustrative: true,
      currency: true,
    },
  })
}

export async function getFeaturedProject() {
  return db.project.findFirst({
    where: { isPublished: true, isFeatured: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      slug: true,
      pillar: true,
      status: true,
      isDemo: true,
      titleEn: true,
      titleIt: true,
      summaryEn: true,
      summaryIt: true,
      locationEn: true,
      locationIt: true,
      budgetCents: true,
      currency: true,
    },
  })
}

export async function getPublishedProject(slug: string) {
  return db.project.findFirst({
    where: { slug, isPublished: true },
    include: {
      milestones: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      updates: { where: { isPublished: true }, orderBy: { publishedAt: 'desc' } },
      coverMedia: { select: { id: true, isPublic: true, depictsMinors: true, guardianConsentConfirmed: true, altEn: true, altIt: true, credit: true, license: true, kind: true, width: true, height: true } },
      media: {
        where: { isPublic: true, OR: [{ depictsMinors: false }, { guardianConsentConfirmed: true }] },
        orderBy: { createdAt: 'desc' },
        select: { id: true, kind: true, fileName: true, altEn: true, altIt: true, credit: true, license: true, sizeBytes: true, mimeType: true },
      },
    },
  })
}

export async function listPublishedEvents(type?: 'REGATTA' | 'GALA' | 'PARTNERSHIP' | 'OTHER') {
  return db.event.findMany({
    where: { isPublished: true, ...(type ? { type } : {}) },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
}

export async function getSetting<T>(key: string): Promise<T | null> {
  const row = await db.siteSetting.findUnique({ where: { key } })
  return (row?.value as T) ?? null
}

/** Media is publishable only if public and, when it depicts minors, guardian consent is confirmed. */
export function isPublishableMedia(m: { isPublic: boolean; depictsMinors: boolean; guardianConsentConfirmed: boolean } | null | undefined): boolean {
  return Boolean(m && m.isPublic && (!m.depictsMinors || m.guardianConsentConfirmed))
}
