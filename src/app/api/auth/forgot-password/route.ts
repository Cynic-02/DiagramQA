import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { normalizeEmail, readJson } from '@/lib/api'

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 *
 * Creates a PasswordReset token (1-hour expiry) if the user exists.
 * Always returns { ok: true } — never leaks whether the email exists.
 * The reset URL is logged to the console (no email service in sandbox).
 */
export async function POST(req: NextRequest) {
  try {
    const { data: body } = await readJson<{ email: string }>(req)
    const email = normalizeEmail(body?.email)
    if (!email) {
      return NextResponse.json({ ok: true })
    }

    const user = await db.user.findUnique({
      where: { email },
    })

    if (user) {
      const token = crypto.randomBytes(32).toString('base64url')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await db.$transaction(async (tx) => {
        await tx.passwordReset.updateMany({
          where: { userId: user.id, used: false },
          data: { used: true },
        })
        await tx.passwordReset.create({
          data: {
            userId: user.id,
            token,
            expiresAt,
          },
        })
      })

      // In production, send this via email (Resend, SendGrid, etc.)
      const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}`
      console.log('[reset-link]', resetUrl)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[forgot-password]', err)
    return NextResponse.json({ ok: true })
  }
}
