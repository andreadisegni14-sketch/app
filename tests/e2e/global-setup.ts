import 'dotenv/config'
import { execSync } from 'node:child_process'

export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL
  if (!url || !/test/i.test(new URL(url).pathname)) {
    throw new Error('Set TEST_DATABASE_URL to a database whose name contains "test".')
  }
  const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url, SEED_ADMIN_EMAIL: '', SEED_ADMIN_PASSWORD: '' }
  // Apply migrations, empty the guarded test database, then seed it.
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env })
  execSync('npx tsx tests/e2e/prepare-db.ts truncate', { stdio: 'inherit', env })
  execSync('npx prisma db seed', { stdio: 'inherit', env })
  execSync('npx tsx tests/e2e/prepare-db.ts accounts', { stdio: 'inherit', env })
}
