import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { stage } = body // "extraction" | "generation" | "answering" | "verification" | "results"

  const run = await db.run.findUnique({
    where: { id },
  })

  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  // Clear downstream fields depending on the stage we want to reset from
  const data: any = {
    status: 'running',
    errorMessage: null,
    completedAt: null,
  }

  if (stage === 'extraction') {
    data.extraction = null
    data.questions = null
    data.answers = null
    data.verification = null
    data.finalQA = null
  } else if (stage === 'generation') {
    data.questions = null
    data.answers = null
    data.verification = null
    data.finalQA = null
  } else if (stage === 'answering') {
    data.answers = null
    data.verification = null
    data.finalQA = null
  } else if (stage === 'verification') {
    data.verification = null
    data.finalQA = null
  } else if (stage === 'results') {
    data.finalQA = null
  }

  await db.run.update({
    where: { id },
    data,
  })

  // Delete individual Question entries if reset is upstream of results
  if (stage === 'extraction' || stage === 'generation') {
    await db.question.deleteMany({ where: { runId: id } }).catch(() => undefined)
  }

  return NextResponse.json({ ok: true })
}
