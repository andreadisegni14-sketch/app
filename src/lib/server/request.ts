import 'server-only'
import { createHmac } from 'node:crypto'
import { headers } from 'next/headers'
import { getHashSalt } from '@/lib/env'

/** Keyed hash for identifiers such as IP addresses: lets us rate-limit without storing raw IPs. */
export function hashIdentifier(value: string): string {
  return createHmac('sha256', getHashSalt()).update(value).digest('hex').slice(0, 32)
}

export function clientIpFromHeaders(h: Headers): string {
  const forwarded = h.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return h.get('x-real-ip')?.trim() || 'unknown'
}

export type RequestContext = { ipHash: string; userAgent: string | null }

export async function getRequestContext(): Promise<RequestContext> {
  const h = await headers()
  return {
    ipHash: hashIdentifier(clientIpFromHeaders(h)),
    userAgent: h.get('user-agent')?.slice(0, 300) ?? null,
  }
}
