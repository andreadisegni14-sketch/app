import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import proxy, { config } from '@/proxy'
import { isOfflineExempt } from '@/lib/offline-page'

function request(path: string) {
  return new NextRequest(new URL(path, 'https://example.org'))
}

describe('SITE_OFFLINE', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('serves the holding page with 503 and noindex on public pages', async () => {
    vi.stubEnv('SITE_OFFLINE', 'true')
    for (const path of ['/', '/it/sailing', '/projects/school-renewal-pilot-africa']) {
      const response = proxy(request(path))
      expect(response.status).toBe(503)
      expect(response.headers.get('X-Robots-Tag')).toContain('noindex')
      expect(await response.text()).toContain('Il sito è in preparazione')
    }
  })

  it('keeps the admin area reachable', () => {
    vi.stubEnv('SITE_OFFLINE', 'true')
    expect(proxy(request('/admin/login')).status).toBe(200)
  })

  it('serves the site normally when unset', () => {
    vi.stubEnv('SITE_OFFLINE', '')
    expect(proxy(request('/it/sailing')).status).not.toBe(503)
  })

  it('keeps the newsletter confirmation and unsubscribe pages reachable in both languages', async () => {
    vi.stubEnv('SITE_OFFLINE', 'true')
    for (const path of ['/newsletter/confirm?token=abc', '/newsletter/unsubscribe?token=abc', '/it/newsletter/confirm?token=abc', '/it/newsletter/unsubscribe?token=abc']) {
      const response = proxy(request(path))
      expect(response.status, path).not.toBe(503)
      expect(response.headers.get('X-Robots-Tag') ?? '', path).not.toContain('noindex')
    }
  })

  it('exempts exactly those paths and the one-click API route', () => {
    vi.stubEnv('SITE_OFFLINE', 'true')
    for (const path of ['/newsletter', '/it/newsletter', '/newsletter/confirm/extra', '/newsletter/confirmx', '/it/newsletter/unsubscribe-all', '/newsletters/unsubscribe']) {
      expect(isOfflineExempt(path), path).toBe(false)
      expect(proxy(request(path)).status, path).toBe(503)
    }
    expect(isOfflineExempt('/api/newsletter/unsubscribe')).toBe(true)
    expect(isOfflineExempt('/newsletter/unsubscribe/')).toBe(true)
    expect(proxy(request('/api/newsletter/unsubscribe?token=abc')).status).toBe(200)
    // The proxy is not even invoked for API routes.
    const matcher = new RegExp(`^${config.matcher[0]}$`)
    expect(matcher.test('/api/newsletter/unsubscribe')).toBe(false)
    expect(matcher.test('/it/newsletter/unsubscribe')).toBe(true)
  })
})
