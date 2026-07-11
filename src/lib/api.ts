import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import type { SessionUser } from '@/lib/auth'

export async function readJson<T>(
  req: NextRequest
): Promise<{ data: T | null; response: NextResponse | null }> {
  try {
    return { data: (await req.json()) as T, response: null }
  } catch {
    return {
      data: null,
      response: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
    }
  }
}

export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null
  const value = email.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null
}

export function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value.trim()
  if (!cleaned) return null
  return cleaned.slice(0, maxLength)
}

export function validateHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function normalizeProviderBaseUrl(value: string): string {
  const url = new URL(value.trim())
  url.pathname = url.pathname.replace(/\/+$/, '')
  return url.toString().replace(/\/+$/, '')
}

type RunWithDiagram = Prisma.RunGetPayload<{ include: { diagram: true } }>

export async function assertRunAccess(
  runId: string,
  session: SessionUser | null,
  includeDiagram: true
): Promise<{ run: RunWithDiagram | null; response: NextResponse | null }>
export async function assertRunAccess(
  runId: string,
  session: SessionUser | null,
  includeDiagram?: false
): Promise<{ run: Prisma.RunGetPayload<object> | null; response: NextResponse | null }>
export async function assertRunAccess(
  runId: string,
  session: SessionUser | null,
  includeDiagram = false
): Promise<{
  run: Prisma.RunGetPayload<object> | RunWithDiagram | null
  response: NextResponse | null
}> {
  const run = await db.run.findUnique({
    where: { id: runId },
    include: includeDiagram ? { diagram: true } : undefined,
  })

  if (!run) {
    return {
      run: null,
      response: NextResponse.json({ error: 'Run not found' }, { status: 404 }),
    }
  }

  if (run.userId && run.userId !== session?.id) {
    return {
      run: null,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { run, response: null }
}
