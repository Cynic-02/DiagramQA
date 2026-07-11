import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSessionFromToken, SESSION_COOKIE } from '@/lib/auth'

const NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.JWT_SECRET ||
  'ar2-ddcqg-dev-secret-change-in-production'

/**
 * Edge middleware.
 *
 * Authenticated = EITHER the bespoke `ar2-session` JWT cookie is present
 * and valid, OR the NextAuth session cookie (Google / Credentials via
 * NextAuth) is present and signed with `NEXTAUTH_SECRET`.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protect /app routes — redirect to /login if not authenticated
  if (pathname.startsWith('/app')) {
    const token = req.cookies.get(SESSION_COOKIE)?.value
    const customSession = getSessionFromToken(token)
    const nextAuthSession = await getToken({
      req,
      secret: NEXTAUTH_SECRET,
    })
    if (!customSession && !nextAuthSession) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Redirect authenticated users away from /login
  if (pathname === '/login') {
    const token = req.cookies.get(SESSION_COOKIE)?.value
    const customSession = getSessionFromToken(token)
    const nextAuthSession = await getToken({
      req,
      secret: NEXTAUTH_SECRET,
    })
    if (customSession || nextAuthSession) {
      return NextResponse.redirect(new URL('/app', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/app/:path*', '/login'],
}
