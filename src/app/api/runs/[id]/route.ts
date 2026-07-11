import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { assertRunAccess, readJson } from '@/lib/api'
import type {
  BloomLevel,
  ExtractionOutput,
  GeneratedQuestion,
  GeneratedAnswer,
  VerificationVerdict,
  FinalQAItem,
  RunRecord,
} from '@/lib/types'

function parse<T>(s: string | null | undefined): T | undefined {
  if (!s) return undefined
  try {
    return JSON.parse(s) as T
  } catch {
    return undefined
  }
}

/**
 * GET /api/runs/[id] — single run, fully hydrated.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  const { run, response } = await assertRunAccess(id, session, true)
  if (response) return response
  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  // Hydrate questions dynamically if the normalized database is empty but finalQA is present
  let dbQuestions = await db.question.findMany({
    where: { runId: run.id },
    orderBy: { createdAt: 'asc' },
  })

  if (dbQuestions.length === 0 && run.finalQA) {
    const finalQA = parse<FinalQAItem[]>(run.finalQA) || []
    const questions = parse<GeneratedQuestion[]>(run.questions) || []
    for (const item of finalQA) {
      try {
        const q = await db.question.create({
          data: {
            id: item.id,
            runId: run.id,
            bloomLevel: item.bloomLevel || run.bloomLevel,
            type: item.questionType?.toUpperCase() === 'MCQ' ? 'MCQ' : 'SHORT',
            text: item.question,
            options: item.options ? JSON.stringify(item.options) : null,
            answer: item.answer,
            explanation: item.explanation || "",
            verificationScore: item.score ? Math.round(item.score * 100) : 100,
            verificationVerdict: (item.verification || 'pass').toUpperCase(),
            isApproved: item.verification !== 'reject',
          }
        })
        dbQuestions.push(q)
      } catch (err) {
        console.error('Failed to auto-hydrate question:', err)
      }
    }
  }

  const record: RunRecord = {
    id: run.id,
    diagramId: run.diagramId,
    filename: run.diagram.filename,
    dataUrl: run.diagram.dataUrl,
    bloomLevel: run.bloomLevel as BloomLevel,
    status: run.status as 'running' | 'completed' | 'failed',
    provider: run.provider ?? undefined,
    diagramType: run.diagramType ?? undefined,
    extraction: parse<ExtractionOutput>(run.extraction),
    questions: parse<GeneratedQuestion[]>(run.questions),
    answers: parse<GeneratedAnswer[]>(run.answers),
    verification: parse<VerificationVerdict[]>(run.verification),
    finalQA: parse<FinalQAItem[]>(run.finalQA),
    errorMessage: run.errorMessage ?? undefined,
    startedAt: run.startedAt?.toISOString(),
    completedAt: run.completedAt?.toISOString(),
    durationMs: run.durationMs ?? undefined,
    folderId: run.folderId ?? undefined,
    questionsList: dbQuestions.map(q => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : null,
    })),
    createdAt: run.createdAt.toISOString(),
  }
  return NextResponse.json(record)
}

/**
 * POST /api/runs/[id]/complete — persist the final pipeline output.
 * Called by the client when the socket emits a terminal `results` event.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  const { run, response: accessResponse } = await assertRunAccess(id, session)
  if (accessResponse) return accessResponse
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 })

  const { data: body, response } = await readJson<{
    status?: string
    diagramType?: unknown
    extraction?: unknown
    questions?: unknown
    answers?: unknown
    verification?: unknown
    finalQA?: unknown
    errorMessage?: unknown
  }>(req)
  if (response) return response
  const payload = body!

  const status =
    payload.status === 'completed' || payload.status === 'failed' || payload.status === 'running'
      ? payload.status
      : 'completed'
  const completedAt = status === 'completed' || status === 'failed' ? new Date() : null

  await db.run.update({
    where: { id },
    data: {
      status,
      completedAt,
      durationMs: completedAt && run?.startedAt ? completedAt.getTime() - run.startedAt.getTime() : null,
      diagramType: typeof payload.diagramType === 'string' ? payload.diagramType : null,
      extraction: payload.extraction ? JSON.stringify(payload.extraction) : null,
      questions: payload.questions ? JSON.stringify(payload.questions) : null,
      answers: payload.answers ? JSON.stringify(payload.answers) : null,
      verification: payload.verification ? JSON.stringify(payload.verification) : null,
      finalQA: payload.finalQA ? JSON.stringify(payload.finalQA) : null,
      errorMessage: typeof payload.errorMessage === 'string' ? payload.errorMessage : null,
    },
  })

  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  const { run, response: accessResponse } = await assertRunAccess(id, session)
  if (accessResponse) return accessResponse
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const { folderId } = body

  await db.run.update({
    where: { id },
    data: {
      folderId: folderId === null ? null : folderId,
    }
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  const { run, response } = await assertRunAccess(id, session)
  if (response) return response
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 })

  await db.$transaction(async (tx) => {
    await tx.chatMessage.deleteMany({ where: { runId: id } })
    await tx.run.delete({ where: { id } })
    const remaining = await tx.run.count({ where: { diagramId: run.diagramId } })
    if (remaining === 0) {
      await tx.diagram.delete({ where: { id: run.diagramId } }).catch(() => undefined)
    }
  })

  return NextResponse.json({ ok: true })
}
