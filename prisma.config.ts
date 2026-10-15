import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// Prisma CLI configuration (migrations, seed, studio).
// DIRECT_URL is preferred for migrations when DATABASE_URL points at a connection pooler.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  },
})
