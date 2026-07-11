import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { createSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = (await req.json()) as {
      email: string
      password: string
      name?: string
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
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
        name: name || null,
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
