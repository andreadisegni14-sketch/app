/** Run by global-setup.ts through tsx (the Prisma client is ESM-only). Expects DATABASE_URL = test DB. */
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../src/generated/prisma/client'
import { E2E_ADMIN, E2E_VIEWER } from './credentials'

const url = process.env.DATABASE_URL ?? ''
if (!/test/i.test(new URL(url).pathname)) throw new Error('Refusing to touch a database whose name does not contain "test".')
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })

async function truncate() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  if (tables.length) {
    await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`)
  }
}

async function accounts() {
  for (const [account, role, name] of [
    [E2E_ADMIN, 'ADMIN', 'E2E Admin'],
    [E2E_VIEWER, 'VIEWER', 'E2E Viewer'],
  ] as const) {
    const roleRow = await db.role.findUniqueOrThrow({ where: { name: role } })
    await db.user.create({ data: { email: account.email, name, roleId: roleRow.id, passwordHash: await bcrypt.hash(account.password, 10) } })
  }
  // A test-only evening event (type OTHER) so the home page "Next event" teaser renders.
  await db.event.create({
    data: {
      slug: 'e2e-inauguration-evening',
      type: 'OTHER',
      sortOrder: 3,
      titleEn: 'E2E inauguration evening (proposed)',
      titleIt: 'Serata inaugurale E2E (proposta)',
      summaryEn: 'A test-only proposed evening used by the end-to-end tests.',
      summaryIt: 'Una serata proposta usata solo dai test end-to-end.',
      locationEn: 'Venue to be confirmed',
      locationIt: 'Luogo da confermare',
      dateLabelEn: 'Proposed for 2027',
      dateLabelIt: 'Proposta per il 2027',
    },
  })
  // An enquiry whose notification email failed: the admin must still see it.
  await db.contactInquiry.create({
    data: {
      name: 'Seeded Enquirer',
      email: 'seeded@example.test',
      message: 'Seeded enquiry for the admin dashboard test.',
      consentAt: new Date(),
      privacyVersion: 'e2e',
      emailStatus: 'FAILED',
      emailError: 'HTTP 503: simulated outage',
    },
  })
}

const task = process.argv[2] === 'truncate' ? truncate : accounts
task().finally(() => db.$disconnect())
