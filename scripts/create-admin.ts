/**
 * Creates (or resets the password of) an administrator.
 *
 *   npm run admin:create -- --email you@example.org --name "Your Name" [--role ADMIN|EDITOR|VIEWER]
 *
 * The password is read from the ADMIN_PASSWORD environment variable or prompted for interactively,
 * so it never appears in shell history or in the repository.
 */
import 'dotenv/config'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function main() {
  const email = arg('email')?.trim().toLowerCase()
  const name = arg('name')?.trim() || 'Administrator'
  const role = (arg('role') ?? 'ADMIN').toUpperCase()
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Pass a valid --email')
  if (!['ADMIN', 'EDITOR', 'VIEWER'].includes(role)) throw new Error('--role must be ADMIN, EDITOR or VIEWER')

  let password = process.env.ADMIN_PASSWORD
  if (!password) {
    const rl = createInterface({ input: stdin, output: stdout })
    password = await rl.question('Password (min 12 chars, letters and a number): ')
    rl.close()
  }
  if (password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error('Password must be at least 12 characters and include letters and a number')
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set')
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
  try {
    const roleRow = await db.role.findUnique({ where: { name: role as 'ADMIN' } })
    if (!roleRow) throw new Error('Roles not found — run `npm run db:seed` first')
    const passwordHash = await bcrypt.hash(password, 12)
    await db.user.upsert({
      where: { email },
      create: { email, name, roleId: roleRow.id, passwordHash },
      update: { passwordHash, roleId: roleRow.id, isActive: true, failedLoginCount: 0, lockedUntil: null },
    })
    await db.auditLog.create({ data: { action: 'user.cli_upsert', entityType: 'User', metadata: { email, role } } })
    console.log(`User ${email} is ready with role ${role}.`)
  } finally {
    await db.$disconnect()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
