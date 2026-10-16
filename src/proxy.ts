import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from './i18n/routing'

const intl = createMiddleware(routing)

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    // Optimistic check only: every admin page, action and route re-verifies the session and role
    // on the server. This just avoids rendering admin shells for visitors without a session cookie.
    const isPublicAdminPage = pathname === '/admin/login'
    if (!isPublicAdminPage && !request.cookies.has('blf_session')) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return NextResponse.next()
  }

  return intl(request)
}

export const config = {
  // Skip API routes, Next internals and files with an extension (icons, robots.txt, sitemap.xml…).
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
