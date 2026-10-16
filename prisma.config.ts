import 'dotenv/config'
import { defineConfig } from 'prisma/config'
import { directDatabaseUrl } from './src/lib/runtime-config'

// Prisma CLI configuration (migrations, seed, studio).
// A direct (non-pooled) connection is preferred for migrations; see src/lib/runtime-config.ts.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: directDatabaseUrl() ?? '',
  },
})
