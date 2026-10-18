import { NextResponse, type NextRequest } from 'next/server'
import { unsubscribeByToken } from '@/lib/server/newsletter'

export const dynamic = 'force-dynamic'

/**
 * RFC 8058 one-click unsubscribe. Mail clients POST `List-Unsubscribe=One-Click` to the URL in the
 * List-Unsubscribe header. Only POST is accepted (GET answers 405), so link scanners that merely
 * fetch URLs cannot unsubscribe anyone.
 */
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  const result = await unsubscribeByToken(token)
  if (result === 'invalid') return NextResponse.json({ error: 'Unknown token' }, { status: 404 })
  return NextResponse.json({ status: 'unsubscribed' }, { headers: { 'Cache-Control': 'no-store' } })
}
