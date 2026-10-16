import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import proxy from '@/proxy'

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
})
