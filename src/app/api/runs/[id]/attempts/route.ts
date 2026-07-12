import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { assertRunAccess } from '@/lib/api'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: runId } = await ctx.params
    const session = await getSession()
    const { response } = await assertRunAccess(runId, session)
    if (response) return response

    const attempts = await db.studentAttempt.findMany({
      where: { runId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ attempts })
  } catch (err) {
    console.error('[GET /api/runs/[id]/attempts]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load attempts' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: runId } = await ctx.params
    const session = await getSession()
    const { response } = await assertRunAccess(runId, session)
    if (response) return response

    const body = await req.json().catch(() => ({}))
    const { score, total, answers } = body

    if (score === undefined || total === undefined || !answers) {
      return NextResponse.json({ error: 'Missing attempt parameters' }, { status: 400 })
    }

    const attempt = await db.studentAttempt.create({
      data: {
        runId,
        score: parseInt(score) || 0,
        total: parseInt(total) || 0,
        answers: JSON.stringify(answers),
      }
    })

    return NextResponse.json({ attempt })
  } catch (err) {
    console.error('[POST /api/runs/[id]/attempts]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save attempt' },
      { status: 500 }
    )
  }
}
