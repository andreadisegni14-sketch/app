/**
 * Seed data. Idempotent and create-only (safe to run on every deploy; never overwrites admin edits).
 *
 * - Roles are always created.
 * - Projects and events describe the PROPOSED first-year pilot and are flagged isDemo=true,
 *   which labels them "Demo content" on the public site. Untick "Demo" in the admin once the
 *   founding team has reviewed and adopted the wording.
 * - No users are created unless SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are provided.
 *   Credentials are never hard-coded.
 * - No beneficiaries, donations or enquiries are seeded: none exist.
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { databaseUrl } from '../src/lib/runtime-config'
import { DEMO_EVENTS as EVENTS, DEMO_PROJECTS as PROJECTS } from './demo-content'

const connectionString = databaseUrl()
if (!connectionString) throw new Error('DATABASE_URL is not set')
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

async function main() {
  const roles = [
    { name: 'ADMIN' as const, description: 'Full access, including personal-data exports, donations, users and settings.' },
    { name: 'EDITOR' as const, description: 'Programme content (projects, events, media) and enquiry handling.' },
    { name: 'VIEWER' as const, description: 'Read-only access to programme content and aggregate figures.' },
  ]
  for (const role of roles) {
    await db.role.upsert({ where: { name: role.name }, create: role, update: { description: role.description } })
  }

  // Demo content is created exactly once per database. A marker records it, so later runs
  // (for example on every deploy) never overwrite admin edits or bring back deleted records.
  const marker = await db.siteSetting.findUnique({ where: { key: 'seed.demoContentCreatedAt' } })
  if (marker) {
    console.log('Demo content was already created on this database; leaving content untouched.')
  } else {
    const created = await db.$transaction(async (tx) => {
      let count = 0
      for (const { milestones, previousSlugs, ...project } of PROJECTS) {
        void previousSlugs // only used when updating existing databases
        const budgetCents = project.budgetLines.reduce((sum, l) => sum + l.amountCents, 0)
        const data = { ...project, status: 'IDEA' as const, isDemo: true, isPublished: true, isFeatured: project.isFeatured ?? false, budgetCents, budgetIsIllustrative: true }
        if (await tx.project.findUnique({ where: { slug: project.slug }, select: { id: true } })) continue
        const saved = await tx.project.create({ data })
        count++
        if (milestones.length) {
          await tx.projectMilestone.createMany({ data: milestones.map((m, i) => ({ ...m, projectId: saved.id, sortOrder: i })) })
        }
      }

      for (const event of EVENTS) {
        const data = { ...event, status: 'PROPOSED' as const, isDemo: true, isPublished: true, interestOpen: true }
        await tx.event.upsert({ where: { slug: event.slug }, create: data, update: {} })
      }

      await tx.siteSetting.upsert({
        where: { key: 'launchStatusNote' },
        create: {
          key: 'launchStatusNote',
          value: {
            en: 'DEMO: the founding team is preparing the legal form and statute with Italian advisers.',
            it: "DEMO: il gruppo promotore sta preparando forma giuridica e statuto con consulenti italiani.",
          },
          description: 'Optional note shown in the launch-status section of the homepage.',
        },
        update: {},
      })

      await tx.siteSetting.create({
        data: { key: 'seed.demoContentCreatedAt', value: new Date().toISOString(), description: 'Set by the seed script; prevents demo content from being recreated.' },
      })
      return count
    })
    console.log(`Created ${created} DEMO projects; ensured ${EVENTS.length} DEMO events.`)
  }

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD
  if (email && password) {
    if (password.length < 12) throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters')
    const role = await db.role.findUniqueOrThrow({ where: { name: 'ADMIN' } })
    await db.user.upsert({
      where: { email },
      create: { email, name: process.env.SEED_ADMIN_NAME?.trim() || 'Administrator', roleId: role.id, passwordHash: await bcrypt.hash(password, 12) },
      update: {},
    })
    console.log(`Admin user ensured for ${email} (existing passwords are never overwritten).`)
  } else {
    console.log('No SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD provided: no user created. Run `npm run admin:create` to add one.')
  }

  console.log(`Ensured ${roles.length} roles.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
