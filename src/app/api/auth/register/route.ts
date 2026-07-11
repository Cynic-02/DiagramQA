import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { cleanString, normalizeEmail, readJson } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const { data: body, response } = await readJson<{
      email: string
      password: string
      name?: string
    }>(req)
    if (response) return response

    const email = normalizeEmail(body?.email)
    const password = typeof body?.password === 'string' ? body.password : ''
    const name = cleanString(body?.name, 120)

    if (!email || !password) {
      return NextResponse.json(
        { error: 'A valid email and password are required' },
        { status: 400 }
      )
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash,
      },
    })

    await createSession({ id: user.id, email: user.email, name: user.name })

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    })
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
