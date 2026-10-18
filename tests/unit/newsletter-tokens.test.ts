import { describe, expect, it } from 'vitest'
import { CONFIRM_TOKEN_TTL_MS, confirmTokenExpiry, generateToken, hashToken, isTokenExpired, isWellFormedToken } from '@/lib/newsletter/tokens'
import { maskEmail, newsletterPath } from '@/lib/newsletter/privacy'

describe('newsletter tokens', () => {
  it('generates unique, URL-safe, well-formed tokens', () => {
    const tokens = new Set(Array.from({ length: 50 }, generateToken))
    expect(tokens.size).toBe(50)
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
      expect(isWellFormedToken(token)).toBe(true)
    }
  })

  it('hashes deterministically with SHA-256 and never returns the token itself', () => {
    const token = generateToken()
    expect(hashToken(token)).toBe(hashToken(token))
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/)
    expect(hashToken(token)).not.toContain(token)
    expect(hashToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('expires confirmation links after seven days', () => {
    const now = new Date('2026-10-18T12:00:00Z')
    const expiry = confirmTokenExpiry(now)
    expect(expiry.getTime() - now.getTime()).toBe(CONFIRM_TOKEN_TTL_MS)
    expect(CONFIRM_TOKEN_TTL_MS).toBe(7 * 24 * 3600 * 1000)
    expect(isTokenExpired(expiry, new Date(expiry.getTime() - 1))).toBe(false)
    expect(isTokenExpired(expiry, expiry)).toBe(true)
    expect(isTokenExpired(null, now)).toBe(true)
  })

  it('rejects malformed tokens before any database lookup', () => {
    for (const value of [undefined, null, 42, '', 'short', 'x'.repeat(65), "abc'; DROP TABLE x;--abcdefghijklmnopqrstuvwxyz"]) {
      expect(isWellFormedToken(value)).toBe(false)
    }
  })

  it('masks addresses and builds localized paths', () => {
    expect(maskEmail('giulia@example.it')).toBe('g•••@example.it')
    expect(maskEmail('nope')).toBe('•••')
    expect(newsletterPath('en', '/newsletter/confirm')).toBe('/newsletter/confirm')
    expect(newsletterPath('it', '/newsletter/unsubscribe')).toBe('/it/newsletter/unsubscribe')
  })
})
