import {
  ContactTopic,
  EventStatus,
  InquiryStatus,
  Pillar,
  ProjectStatus,
  SponsorPackage,
  SupportType,
} from '@/generated/prisma/enums'

/** Bump whenever the privacy notice changes materially; stored alongside each consent. */
export const PRIVACY_NOTICE_VERSION = '2026-10-draft-2'

export const LOCALES = ['en', 'it'] as const
export type Locale = (typeof LOCALES)[number]

export const PROJECT_STATUSES = Object.values(ProjectStatus)
/** Display order: the school programmes first, then the fundraising pillars that pay for them. */
export const PILLARS: Pillar[] = [
  Pillar.COASTAL_SCHOOL_RENEWAL,
  Pillar.BLUE_HORIZONS_SCHOLARSHIPS,
  Pillar.SAILING_FOR_IMPACT,
  Pillar.ANNUAL_GALA,
]
export const CONTACT_TOPICS = Object.values(ContactTopic).filter((t) => t !== 'SUPPORT_INTEREST')
export const SUPPORT_TYPES = Object.values(SupportType)
export const SPONSOR_PACKAGES = Object.values(SponsorPackage)
export const INQUIRY_STATUSES = Object.values(InquiryStatus)
export const EVENT_STATUSES = Object.values(EventStatus)

export const PILLAR_SLUGS: Record<Pillar, string> = {
  SAILING_FOR_IMPACT: 'sailing-for-impact',
  COASTAL_SCHOOL_RENEWAL: 'coastal-school-renewal',
  BLUE_HORIZONS_SCHOLARSHIPS: 'blue-horizons-scholarships',
  ANNUAL_GALA: 'annual-gala',
}

export const DONATION_LIMITS = {
  currency: 'EUR',
  minCents: 500,
  maxCents: 1_000_000,
  presetsCents: [2_500, 5_000, 10_000, 25_000],
} as const

export const MEDIA_LIMITS = {
  maxBytes: 4 * 1024 * 1024,
  imageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  documentTypes: ['application/pdf'],
} as const

export const ADMIN_PAGE_SIZE = 20
