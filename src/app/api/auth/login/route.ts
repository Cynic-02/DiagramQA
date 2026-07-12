import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { normalizeEmail, readJson } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const { data: body, response } = await readJson<{
      email: string
      password: string
    }>(req)
    if (response) return response

    const email = normalizeEmail(body?.email)
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!email || !password) {
      return NextResponse.json(
        { error: 'A valid email and password are required' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { email },
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

    const token = await createSession({ id: user.id, email: user.email, name: user.name })

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      token, // returned for mobile clients (Bearer auth)
    })
  } catch (err) {
    console.error('[login]', err)
    return NextResponse.json(
      { error: 'Failed to sign in' },
      { status: 500 }
    )
  }
}
