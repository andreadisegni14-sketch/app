import 'server-only'
import { db } from '@/lib/db'
import { toCsv } from '@/lib/csv'

type Dataset = { label: string; description: string; personalData: boolean; build: () => Promise<string> }

export const EXPORT_DATASETS: Record<string, Dataset> = {
  'contact-inquiries': {
    label: 'Contact & support-interest enquiries',
    description: 'Includes names and email addresses (personal data).',
    personalData: true,
    build: async () => {
      const rows = await db.contactInquiry.findMany({ orderBy: { createdAt: 'asc' } })
      return toCsv(
        ['id', 'createdAt', 'source', 'topic', 'supportType', 'name', 'email', 'message', 'locale', 'status', 'emailStatus', 'consentAt', 'privacyVersion'],
        rows.map((r) => [r.id, r.createdAt, r.source, r.topic, r.supportType, r.name, r.email, r.message, r.locale, r.status, r.emailStatus, r.consentAt, r.privacyVersion]),
      )
    },
  },
  'sponsor-inquiries': {
    label: 'Partnership enquiries',
    description: 'Includes contact details (personal data).',
    personalData: true,
    build: async () => {
      const rows = await db.sponsorInquiry.findMany({ orderBy: { createdAt: 'asc' } })
      return toCsv(
        ['id', 'createdAt', 'organizationName', 'contactName', 'email', 'phone', 'website', 'packageInterest', 'message', 'status', 'emailStatus', 'consentAt'],
        rows.map((r) => [r.id, r.createdAt, r.organizationName, r.contactName, r.email, r.phone, r.website, r.packageInterest, r.message, r.status, r.emailStatus, r.consentAt]),
      )
    },
  },
  'event-interests': {
    label: 'Event interest registrations',
    description: 'Includes names and email addresses (personal data).',
    personalData: true,
    build: async () => {
      const rows = await db.eventInterest.findMany({ orderBy: { createdAt: 'asc' }, include: { event: { select: { slug: true } } } })
      return toCsv(
        ['id', 'createdAt', 'event', 'name', 'email', 'organization', 'partySize', 'message', 'status', 'emailStatus', 'consentAt'],
        rows.map((r) => [r.id, r.createdAt, r.event.slug, r.name, r.email, r.organization, r.partySize, r.message, r.status, r.emailStatus, r.consentAt]),
      )
    },
  },
  'newsletter-subscribers': {
    label: 'Newsletter subscribers',
    description: 'Email addresses with consent records (personal data). Tokens are never exported.',
    personalData: true,
    build: async () => {
      const rows = await db.newsletterSubscriber.findMany({ orderBy: { createdAt: 'asc' } })
      return toCsv(
        ['id', 'createdAt', 'email', 'locale', 'status', 'source', 'consentAt', 'consentText', 'privacyVersion', 'confirmedAt', 'unsubscribedAt', 'confirmEmailStatus'],
        rows.map((r) => [r.id, r.createdAt, r.email, r.locale, r.status, r.source, r.consentAt, r.consentText, r.privacyVersion, r.confirmedAt, r.unsubscribedAt, r.confirmEmailStatus]),
      )
    },
  },
  donations: {
    label: 'Donation ledger',
    description: 'For reconciliation with Stripe payouts and the bank statement. Includes donor emails.',
    personalData: true,
    build: async () => {
      const rows = await db.donation.findMany({ orderBy: { createdAt: 'asc' }, include: { project: { select: { slug: true } } } })
      return toCsv(
        ['id', 'createdAt', 'completedAt', 'status', 'provider', 'livemode', 'currency', 'amountRequested', 'amountReceived', 'project', 'donorEmail', 'checkoutSession', 'paymentIntent', 'reconciliationStatus', 'reconciledAt', 'reconciliationNote'],
        rows.map((r) => [r.id, r.createdAt, r.completedAt, r.status, r.provider, r.livemode, r.currency, (r.amountCents / 100).toFixed(2), r.amountReceivedCents === null ? '' : (r.amountReceivedCents / 100).toFixed(2), r.project?.slug, r.donorEmail, r.stripeCheckoutSessionId, r.stripePaymentIntentId, r.reconciliationStatus, r.reconciledAt, r.reconciliationNote]),
      )
    },
  },
  projects: {
    label: 'Projects and budgets',
    description: 'Programme data only — no personal data.',
    personalData: false,
    build: async () => {
      const rows = await db.project.findMany({ orderBy: { sortOrder: 'asc' } })
      return toCsv(
        ['id', 'slug', 'titleEn', 'pillar', 'status', 'isPublished', 'isDemo', 'budget', 'budgetIsIllustrative', 'pledged', 'spent', 'updatedAt'],
        rows.map((r) => [r.id, r.slug, r.titleEn, r.pillar, r.status, r.isPublished, r.isDemo, (r.budgetCents / 100).toFixed(2), r.budgetIsIllustrative, (r.pledgedCents / 100).toFixed(2), (r.spentCents / 100).toFixed(2), r.updatedAt]),
      )
    },
  },
  'audit-log': {
    label: 'Audit log',
    description: 'All recorded administrative and security events.',
    personalData: false,
    build: async () => {
      const rows = await db.auditLog.findMany({ orderBy: { createdAt: 'asc' }, include: { actor: { select: { email: true } } } })
      return toCsv(
        ['createdAt', 'actor', 'action', 'entityType', 'entityId', 'metadata'],
        rows.map((r) => [r.createdAt, r.actor?.email ?? 'system', r.action, r.entityType, r.entityId, r.metadata ? JSON.stringify(r.metadata) : '']),
      )
    },
  },
}
