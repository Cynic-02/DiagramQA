import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: runId } = await ctx.params
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const attempts = await db.studentAttempt.findMany({
    where: { runId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ attempts })
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: runId } = await ctx.params
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
}
