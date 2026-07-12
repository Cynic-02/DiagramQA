import { cookies, headers as nextHeaders } from 'next/headers'
import jwt from 'jsonwebtoken'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth-options'

export const SESSION_COOKIE = 'ar2-session'
const SECRET =
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  'ar2-ddcqg-dev-secret-change-in-production'

export interface SessionUser {
  id: string
  email: string
  name: string | null
}

/** Sign a JWT and return the token string (does NOT set a cookie). */
export function signToken(user: SessionUser): string {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    SECRET,
    { expiresIn: '7d' }
  )
}

/** Create a signed JWT, set it in an httpOnly cookie, and return the raw token. */
export async function createSession(user: SessionUser): Promise<string> {
  const token = signToken(user)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
  return token
}

/** Clear the session cookie. */
export async function destroySession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

/**
 * Verify a raw JWT string. Returns the payload or null if invalid/expired.
 * Used internally and by mobile Bearer-token auth.
 */
export function verifyJwt(token: string): { sub: string; email: string; name: string | null } | null {
  try {
    return jwt.verify(token, SECRET) as { sub: string; email: string; name: string | null }
  } catch {
    return null
  }
}

/**
 * Read + verify the session from (in priority order):
 *  1. `Authorization: Bearer <token>` header — used by the React Native
 *     mobile app, which cannot access HttpOnly cookies.
 *  2. The custom JWT cookie `ar2-session` — used by the web app.
 *  3. The NextAuth session cookie — used by Google OAuth logins.
 *
 * Pass the incoming `Request` object to enable Bearer-token auth for mobile.
 * All existing callers that pass no argument continue to work unchanged.
 */
export async function getSession(req?: Request | { headers: { get(name: string): string | null } }): Promise<SessionUser | null> {
  // ── 1. Bearer token (React Native mobile client) ──────────────────────
  const authHeader = req
    ? (req.headers.get?.('authorization') ?? req.headers.get?.('Authorization'))
    : null

  if (authHeader?.startsWith('Bearer ')) {
    const raw = authHeader.slice(7).trim()
    const payload = verifyJwt(raw)
    if (payload) {
      const user = await db.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true },
      })
      if (user) return { id: user.id, email: user.email, name: user.name }
    }
  }

  // ── 2. Try Bearer via Next.js request headers store (server components) ──
  // This covers API routes that call getSession() without forwarding req.
  try {
    const store = await nextHeaders()
    const h = store.get('authorization') ?? store.get('Authorization') ?? ''
    if (h.startsWith('Bearer ')) {
      const raw = h.slice(7).trim()
      const payload = verifyJwt(raw)
      if (payload) {
        const user = await db.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true, name: true },
        })
        if (user) return { id: user.id, email: user.email, name: user.name }
      }
    }
  } catch {
    // headers() may throw outside of a request context — safe to ignore
  }

  // ── 3. Custom JWT cookie (web browser) ───────────────────────────────
  try {
    const store = await cookies()
    const token = store.get(SESSION_COOKIE)?.value
    if (token) {
      const payload = verifyJwt(token)
      if (payload) {
        const user = await db.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true, name: true },
        })
        if (user) return { id: user.id, email: user.email, name: user.name }
      }
    }
  } catch {
    // ignore — fall through to NextAuth
  }

  // ── 4. NextAuth session cookie (Google / OAuth) ───────────────────────
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email
    if (email) {
      const user = await db.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, email: true, name: true },
      })
      if (user) return { id: user.id, email: user.email, name: user.name }
    }
  } catch {
    // ignore
  }

  return null
}

/**
 * For middleware (edge) — only verifies the JWT, no DB lookup.
 * Checks BOTH the custom JWT cookie and the NextAuth JWT cookie.
 */
export function getSessionFromToken(token: string | undefined): SessionUser | null {
  if (!token) return null
  return verifyJwt(token) ? { id: (verifyJwt(token) as any).sub, email: (verifyJwt(token) as any).email, name: (verifyJwt(token) as any).name } : null
}
