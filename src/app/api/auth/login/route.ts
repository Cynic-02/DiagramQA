import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { createSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) as {
      email: string
      password: string
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    })
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    await createSession({ id: user.id, email: user.email, name: user.name })

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    })
  } catch (err) {
    console.error('[login]', err)
    return NextResponse.json(
      { error: 'Failed to sign in' },
      { status: 500 }
    )
  }
}
