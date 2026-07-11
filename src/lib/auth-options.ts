import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

/**
 * NextAuth configuration for AR2-DDCQG.
 *
 * Providers:
 *  - Google (gated on GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET env vars —
 *    the provider is only registered when both are present, so the app
 *    keeps working in environments without OAuth configured).
 *  - Credentials (email + password verified against the `User` table via
 *    bcrypt). This mirrors the behaviour of the bespoke `/api/auth/login`
 *    route so the existing login form keeps working unchanged.
 *
 * Strategy: JWT (stateless, no session table needed).
 *
 * On the very first Google sign-in, the `signIn` callback auto-creates a
 * `User` row with an empty `passwordHash` (so a credentials login will
 * always fail for OAuth-only users until they reset a password).
 */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

const SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.JWT_SECRET ||
  'ar2-ddcqg-dev-secret-change-in-production'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  secret: SECRET,
  pages: { signIn: '/login' },
  providers: [
    ...(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase()
        const password = credentials?.password
        if (!email || !password) return null

        const user = await db.user.findUnique({ where: { email } })
        if (!user || !user.passwordHash) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name ?? undefined }
      },
    }),
  ],
  callbacks: {
    /**
     * Auto-create a User row the first time someone signs in via Google.
     * For credentials login this is a no-op (the user must already exist).
     */
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user?.email) {
        const email = user.email.toLowerCase()
        const existing = await db.user.findUnique({ where: { email } })
        if (!existing) {
          await db.user.create({
            data: {
              email,
              name: user.name ?? null,
              // OAuth users have no password — they must use Google (or
              // reset a password to enable credentials login later).
              passwordHash: '',
            },
          })
        }
      }
      return true
    },
    /** Persist the DB user id on the JWT so `session()` can surface it. */
    async jwt({ token, user, account }) {
      // First sign-in (user object is populated): resolve our DB user id.
      if (user?.email || account?.provider === 'google') {
        const email = (user?.email ?? token.email ?? '').toLowerCase()
        if (email) {
          const dbUser = await db.user.findUnique({
            where: { email },
            select: { id: true, email: true, name: true },
          })
          if (dbUser) {
            token.sub = dbUser.id
            token.email = dbUser.email
            token.name = dbUser.name
          }
        }
      }
      return token
    },
    /** Expose the user id on `session.user.id`. */
    async session({ session, token }) {
      if (session.user && token.sub) {
        // NextAuth's SessionUser doesn't include `id` by default; attach it.
        ;(session.user as { id?: string }).id = token.sub
      }
      return session
    },
  },
}
