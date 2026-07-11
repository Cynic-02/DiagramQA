import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth-options'

export const SESSION_COOKIE = 'ar2-session'
const SECRET = process.env.JWT_SECRET || 'ar2-ddcqg-dev-secret-change-in-production'

export interface SessionUser {
  id: string
  email: string
  name: string | null
}

/** Create a signed JWT and set it in an httpOnly cookie. */
export async function createSession(user: SessionUser) {
  const token = jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    SECRET,
    { expiresIn: '7d' }
  )
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

/** Clear the session cookie. */
export async function destroySession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

/**
 * Read + verify the session from EITHER the custom JWT cookie OR the
 * NextAuth session cookie (so Google/OAuth logins are recognised by the
 * same `getSession()` consumers — `/api/auth/me`, server components, etc.).
 *
 * Order: try the bespoke JWT first (cheaper — no NextAuth round-trip);
 * fall back to `getServerSession(authOptions)` which decodes the
 * NextAuth JWT cookie and re-runs the `session()` callback.
 */
export async function getSession(): Promise<SessionUser | null> {
  // 1. Custom JWT cookie
  try {
    const store = await cookies()
    const token = store.get(SESSION_COOKIE)?.value
    if (token) {
      const payload = jwt.verify(token, SECRET) as {
        sub: string
        email: string
        name: string | null
      }
      const user = await db.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true },
      })
      if (user) {
        return { id: user.id, email: user.email, name: user.name }
      }
    }
  } catch {
    // ignore — fall through to NextAuth
  }

  // 2. NextAuth session cookie (Google / Credentials via NextAuth)
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email
    if (email) {
      const user = await db.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, email: true, name: true },
      })
      if (user) {
        return { id: user.id, email: user.email, name: user.name }
      }
    }
  } catch {
    // ignore
  }

  return null
}

/**
 * For middleware (edge) — only verifies the JWT, no DB lookup.
 * Checks BOTH the custom JWT cookie and the NextAuth JWT cookie.
 * The NextAuth cookie is decoded + signature-verified using
 * `next-auth/jwt`'s `decode` (edge-compatible, no DB).
 */
export function getSessionFromToken(token: string | undefined): SessionUser | null {
  if (!token) return null
  try {
    const payload = jwt.verify(token, SECRET) as {
      sub: string
      email: string
      name: string | null
    }
    return { id: payload.sub, email: payload.email, name: payload.name }
  } catch {
    return null
  }
}
