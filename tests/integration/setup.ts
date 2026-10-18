import 'dotenv/config'
import { afterAll, beforeEach } from 'vitest'
import { testDatabaseUrl } from './env'

process.env.DATABASE_URL = testDatabaseUrl()
process.env.RATE_LIMIT_SALT = 'integration-test-salt'
// Email is unconfigured unless a test injects a mailer.
delete process.env.RESEND_API_KEY

const { db } = await import('@/lib/db')

const TABLES = [
  'NewsletterDelivery', 'NewsletterIssue', 'NewsletterSubscriber',
  'DonationEvent', 'Donation', 'EventInterest', 'Event', 'SponsorInquiry', 'ContactInquiry', 'ProjectUpdate',
  'ProjectMilestone', 'MediaAsset', 'Project', 'BeneficiaryOrganization', 'AuditLog', 'Session', 'User', 'Role',
  'RateLimit', 'SiteSetting',
]

beforeEach(async () => {
  await db.$executeRawUnsafe(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`)
})

afterAll(async () => {
  await db.$disconnect()
})
