import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
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
  const run = await db.run.findUnique({
    where: { id },
    include: { diagram: true },
  })
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
  const body = await req.json()

  await db.run.update({
    where: { id },
    data: {
      status: body.status ?? 'completed',
      diagramType: body.diagramType ?? null,
      extraction: body.extraction ? JSON.stringify(body.extraction) : null,
      questions: body.questions ? JSON.stringify(body.questions) : null,
      answers: body.answers ? JSON.stringify(body.answers) : null,
      verification: body.verification ? JSON.stringify(body.verification) : null,
      finalQA: body.finalQA ? JSON.stringify(body.finalQA) : null,
      errorMessage: body.errorMessage ?? null,
    },
  })

  return NextResponse.json({ ok: true })
}
