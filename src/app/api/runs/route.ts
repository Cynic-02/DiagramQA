import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

/**
 * POST /api/runs
 * Creates a Diagram + Run record and returns the ids.
 * The diagram is stored as a base64 data URL (small, in-process SQLite).
 *
 * `provider` (optional) is the AI provider the user picked for this run —
 * either a built-in ProviderId ("openai", "claude", …) or `custom:<id>`
 * for one of their own custom providers. It's stored on the Run row and
 * read back by /api/runs/[id]/stream, which actually drives the pipeline.
 * Leaving it out keeps the previous auto-pick-a-default behavior.
 *
 * `questionCount` (optional, 1-20) and `mcqOnly` (optional) control the
 * Generation stage: how many questions to produce, and whether they must
 * all be 4-option multiple-choice questions instead of short-answer.
 * Omitting both preserves the prior default (4 short-answer questions).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    const body = await req.json()
    const { filename, mimeType, dataUrl, bloomLevel, provider, questionCount, mcqOnly } = body as {
      filename: string
      mimeType: string
      dataUrl: string
      bloomLevel: string
      provider?: string
      questionCount?: number
      mcqOnly?: boolean
    }

    if (!filename || !dataUrl || !bloomLevel) {
      return NextResponse.json(
        { error: 'filename, dataUrl and bloomLevel are required' },
        { status: 400 }
      )
    }

    const normalizedCount =
      typeof questionCount === 'number' && Number.isFinite(questionCount)
        ? Math.max(1, Math.min(20, Math.round(questionCount)))
        : null

    const diagram = await db.diagram.create({
      data: { filename, mimeType: mimeType || 'image/png', dataUrl },
    })

    const run = await db.run.create({
      data: {
        diagramId: diagram.id,
        bloomLevel,
        status: 'running',
        provider: provider?.trim() || null,
        questionCount: normalizedCount,
        mcqOnly: mcqOnly === true,
        userId: session?.id,
      },
    })

    return NextResponse.json({ runId: run.id, diagramId: diagram.id })
  } catch (err) {
    console.error('[POST /api/runs]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create run' },
      { status: 500 }
    )
  }
}
