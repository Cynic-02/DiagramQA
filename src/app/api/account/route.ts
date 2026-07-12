import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { createSession, getSession } from '@/lib/auth'
import { cleanString, normalizeEmail, readJson } from '@/lib/api'

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: body, response } = await readJson<Partial<{
      email: string
      name: string
      currentPassword: string
      newPassword: string
    }>>(req)
    if (response) return response

    const email = body?.email !== undefined ? normalizeEmail(body.email) : undefined
    const name = body?.name !== undefined ? cleanString(body.name, 120) : undefined
    const currentPassword =
      typeof body?.currentPassword === 'string' ? body.currentPassword : undefined
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : undefined

    if (body?.email !== undefined && !email) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }
    if (body?.name !== undefined && body.name.trim() && !name) {
      return NextResponse.json({ error: 'Name is too long' }, { status: 400 })
    }
    if (newPassword !== undefined && newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: session.id } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (email && email !== user.email) {
      const existing = await db.user.findUnique({ where: { email } })
      if (existing) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
      }
    }

    let passwordHash: string | undefined
    if (newPassword !== undefined) {
      if (user.passwordHash) {
        if (!currentPassword) {
          return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
        }
        const valid = await bcrypt.compare(currentPassword, user.passwordHash)
        if (!valid) {
          return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
        }
      }
      passwordHash = await bcrypt.hash(newPassword, 10)
    }

    const data: Prisma.UserUpdateInput = {}
    if (email) data.email = email
    if (body?.name !== undefined) data.name = name ?? null
    if (passwordHash !== undefined) data.passwordHash = passwordHash

    const updated = await db.user.update({
      where: { id: session.id },
      data,
      select: { id: true, email: true, name: true },
    })

    await createSession(updated)

    return NextResponse.json({ user: updated })
  } catch (err) {
    console.error('[PATCH /api/account]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update account' },
      { status: 500 }
    )
  }
}
