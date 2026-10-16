import { afterEach, describe, expect, it, vi } from 'vitest'
import { getHashSalt } from '@/lib/env'
import { databaseUrl, directDatabaseUrl, siteUrl } from '@/lib/runtime-config'

const KEYS = [
  'DATABASE_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL', 'DIRECT_URL', 'DATABASE_URL_UNPOOLED', 'POSTGRES_URL_NON_POOLING',
  'NEXT_PUBLIC_SITE_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_URL', 'RATE_LIMIT_SALT',
]

function stub(env: Record<string, string>) {
  for (const key of KEYS) vi.stubEnv(key, env[key] ?? '')
}

afterEach(() => vi.unstubAllEnvs())

describe('database connection resolution', () => {
  it('prefers explicit variables', () => {
    stub({ DATABASE_URL: 'postgres://app', DIRECT_URL: 'postgres://direct', DATABASE_URL_UNPOOLED: 'postgres://unpooled' })
    expect(databaseUrl()).toBe('postgres://app')
    expect(directDatabaseUrl()).toBe('postgres://direct')
  })

  it('uses the variables injected by a Vercel-connected database', () => {
    stub({ DATABASE_URL: 'postgres://pooled', DATABASE_URL_UNPOOLED: 'postgres://unpooled' })
    expect(directDatabaseUrl()).toBe('postgres://unpooled')
    stub({ POSTGRES_PRISMA_URL: 'postgres://prisma', POSTGRES_URL_NON_POOLING: 'postgres://nonpool' })
    expect(databaseUrl()).toBe('postgres://prisma')
    expect(directDatabaseUrl()).toBe('postgres://nonpool')
  })

  it('falls back to the app connection for migrations and is undefined when nothing is set', () => {
    stub({ DATABASE_URL: 'postgres://only' })
    expect(directDatabaseUrl()).toBe('postgres://only')
    stub({})
    expect(databaseUrl()).toBeUndefined()
  })
})

describe('site URL resolution', () => {
  it('uses the explicit URL without a trailing slash', () => {
    stub({ NEXT_PUBLIC_SITE_URL: 'https://www.example.org/', VERCEL_PROJECT_PRODUCTION_URL: 'x.vercel.app' })
    expect(siteUrl()).toBe('https://www.example.org')
  })

  it('falls back to the Vercel production domain, then localhost', () => {
    stub({ VERCEL_PROJECT_PRODUCTION_URL: 'blue-legacy.vercel.app' })
    expect(siteUrl()).toBe('https://blue-legacy.vercel.app')
    stub({})
    expect(siteUrl()).toBe('http://localhost:3000')
  })
})

describe('rate-limit salt', () => {
  it('uses RATE_LIMIT_SALT when set, else a stable value derived from the database credentials', () => {
    stub({ RATE_LIMIT_SALT: 'explicit', DATABASE_URL: 'postgres://u:secret@h/db' })
    expect(getHashSalt()).toBe('explicit')
    stub({ DATABASE_URL: 'postgres://u:secret@h/db' })
    const derived = getHashSalt()
    expect(derived).toMatch(/^[0-9a-f]{64}$/)
    expect(derived).not.toContain('secret')
    expect(getHashSalt()).toBe(derived)
    stub({ DATABASE_URL: 'postgres://u:other@h/db' })
    expect(getHashSalt()).not.toBe(derived)
  })
})
