/**
 * Connection and URL resolution shared by the app, Prisma CLI, seed and scripts.
 *
 * Explicit variables always win. The fallbacks let a Vercel deployment work with zero manual
 * configuration once a Postgres database (e.g. Neon) is connected from Vercel's Storage tab,
 * which injects DATABASE_URL / DATABASE_URL_UNPOOLED (or the POSTGRES_* equivalents). On Render the
 * site address comes from RENDER_EXTERNAL_URL.
 */

function first(...values: (string | undefined)[]): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return undefined
}

/** Connection used by the running app (pooled where available). */
export function databaseUrl(): string | undefined {
  return first(process.env.DATABASE_URL, process.env.POSTGRES_PRISMA_URL, process.env.POSTGRES_URL)
}

/** Direct (non-pooled) connection preferred for migrations. */
export function directDatabaseUrl(): string | undefined {
  return first(
    process.env.DIRECT_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
    databaseUrl(),
  )
}

/** Public base URL: explicit setting, else the hosting platform's own address, else localhost. */
export function siteUrl(): string {
  const explicit = first(process.env.NEXT_PUBLIC_SITE_URL, process.env.RENDER_EXTERNAL_URL)
  if (explicit) return explicit.replace(/\/+$/, '')
  const vercelHost = first(process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL)
  if (vercelHost) return `https://${vercelHost.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
  return 'http://localhost:3000'
}
