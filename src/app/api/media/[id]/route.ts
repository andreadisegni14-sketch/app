import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { SESSION_COOKIE } from '@/lib/auth/session'
import { validateSessionToken } from '@/lib/auth/service'
import { can } from '@/lib/auth/permissions'
import { isPublishableMedia } from '@/lib/server/public-data'

export const dynamic = 'force-dynamic'

/**
 * Serves stored media. Public only if published and safeguarding-cleared; otherwise staff only.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return new NextResponse('Not found', { status: 404 })

  const asset = await db.mediaAsset.findUnique({ where: { id } })
  if (!asset || (!asset.data && !asset.externalUrl)) return new NextResponse('Not found', { status: 404 })

  const isPublic = isPublishableMedia(asset)
  if (!isPublic) {
    const user = await validateSessionToken((await cookies()).get(SESSION_COOKIE)?.value)
    if (!user || !can(user.role, 'media:view')) return new NextResponse('Not found', { status: 404 })
  }

  if (!asset.data && asset.externalUrl) return NextResponse.redirect(asset.externalUrl)

  return new NextResponse(new Uint8Array(asset.data!), {
    headers: {
      'Content-Type': asset.mimeType,
      'Content-Length': String(asset.sizeBytes),
      'Cache-Control': isPublic ? 'public, max-age=3600, stale-while-revalidate=86400' : 'private, no-store',
      'Content-Disposition': `${asset.kind === 'DOCUMENT' ? 'inline' : 'inline'}; filename="${asset.fileName.replace(/[^\w.-]/g, '_')}"`,
      'X-Content-Type-Options': 'nosniff',
      ETag: `"${asset.sha256}"`,
    },
  })
}
