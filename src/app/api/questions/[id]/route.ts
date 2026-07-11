import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const question = await db.question.findUnique({
    where: { id },
    include: { run: true },
  })

  if (!question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  return NextResponse.json({
    ...question,
    options: question.options ? JSON.parse(question.options) : null,
  })
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const question = await db.question.findUnique({
    where: { id },
    include: { run: true },
  })

  if (!question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const { text, options, answer, explanation, isApproved, bloomLevel, type } = body

  const updated = await db.question.update({
    where: { id },
    data: {
      ...(text !== undefined && { text }),
      ...(options !== undefined && { options: options ? JSON.stringify(options) : null }),
      ...(answer !== undefined && { answer }),
      ...(explanation !== undefined && { explanation }),
      ...(isApproved !== undefined && { isApproved }),
      ...(bloomLevel !== undefined && { bloomLevel }),
      ...(type !== undefined && { type }),
    },
  })

  // Sync back to Run.finalQA JSON string to maintain backward compatibility
  await syncRunFinalQA(question.runId)

  return NextResponse.json({
    ...updated,
    options: updated.options ? JSON.parse(updated.options) : null,
  })
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const question = await db.question.findUnique({
    where: { id },
  })

  if (!question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  await db.question.delete({ where: { id } })
  await syncRunFinalQA(question.runId)

  return NextResponse.json({ ok: true })
}

/** Helper to synchronize normalized Question updates back to the Run's legacy finalQA JSON string. */
async function syncRunFinalQA(runId: string) {
  const questions = await db.question.findMany({
    where: { runId },
    orderBy: { createdAt: 'asc' },
  })

  const finalQA = questions.map((q) => ({
    id: q.id,
    question: q.text,
    answer: q.answer,
    bloomLevel: q.bloomLevel,
    verification: q.isApproved ? (q.verificationVerdict?.toLowerCase() || 'pass') : 'reject',
    score: q.verificationScore || 1.0,
    questionType: q.type.toLowerCase(),
    options: q.options ? JSON.parse(q.options) : undefined,
    explanation: q.explanation || undefined,
  }))

  await db.run.update({
    where: { id: runId },
    data: {
      finalQA: JSON.stringify(finalQA),
    },
  })
}
