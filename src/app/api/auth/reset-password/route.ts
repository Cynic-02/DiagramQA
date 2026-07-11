import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { readJson } from '@/lib/api'

/**
 * POST /api/auth/reset-password
 * Body: { token, password }
 *
 * Validates the reset token, updates the user's password, marks the token used.
 */
export async function POST(req: NextRequest) {
  try {
    const { data: body, response } = await readJson<{
      token: string
      password: string
    }>(req)
    if (response) return response

    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!token || !password || password.length < 6) {
      return NextResponse.json(
        { error: 'Token and a password of at least 6 characters are required' },
        { status: 400 }
      )
    }

    const reset = await db.passwordReset.findUnique({
      where: { token },
    })

    if (!reset || reset.used || reset.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)
    await db.$transaction([
      db.user.update({
        where: { id: reset.userId },
        data: { passwordHash },
      }),
      db.passwordReset.update({
        where: { id: reset.id },
        data: { used: true },
      }),
    ])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[reset-password]', err)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
