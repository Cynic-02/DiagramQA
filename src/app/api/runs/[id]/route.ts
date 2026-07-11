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
