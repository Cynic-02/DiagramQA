import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { cleanString, readJson } from '@/lib/api'
import { BLOOM_LEVELS } from '@/lib/types'
import {
  CUSTOM_PROVIDER_PREFIX,
  PROVIDERS,
  getAvailableProvidersForUser,
  type ProviderId,
} from '@/lib/ai/providers'

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
    const { data: body, response } = await readJson<{
      filename: string
      mimeType: string
      dataUrl: string
      bloomLevel: string
      provider?: string
      questionCount?: number
      mcqOnly?: boolean
    }>(req)
    if (response) return response

    const { filename, mimeType, dataUrl, bloomLevel, provider, questionCount, mcqOnly } = body as {
      filename: string
      mimeType: string
      dataUrl: string
      bloomLevel: string
      provider?: string
      questionCount?: number
      mcqOnly?: boolean
    }

    const safeFilename = cleanString(filename, 255)
    const safeMimeType = cleanString(mimeType, 100) || 'image/png'
    const safeDataUrl = typeof dataUrl === 'string' ? dataUrl.trim() : ''
    const safeBloomLevel = BLOOM_LEVELS.includes(bloomLevel as never) ? bloomLevel : null

    if (!safeFilename || !safeDataUrl || !safeBloomLevel) {
      return NextResponse.json(
        { error: 'filename, dataUrl and a valid bloomLevel are required' },
        { status: 400 }
      )
    }
    if (!safeDataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'dataUrl must be an image data URL' }, { status: 400 })
    }

    const normalizedProvider = provider?.trim() || null
    if (normalizedProvider?.startsWith(CUSTOM_PROVIDER_PREFIX)) {
      if (!session) {
        return NextResponse.json({ error: 'Custom providers require sign in' }, { status: 401 })
      }
      const customId = normalizedProvider.slice(CUSTOM_PROVIDER_PREFIX.length)
      const owned = await db.userApiKey.findFirst({
        where: { id: customId, userId: session.id, isCustom: true },
        select: { id: true },
      })
      if (!owned) {
        return NextResponse.json({ error: 'Unknown custom provider' }, { status: 400 })
      }
    } else if (normalizedProvider) {
      if (!PROVIDERS[normalizedProvider as ProviderId]) {
        return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
      }
      if (!PROVIDERS[normalizedProvider as ProviderId].supportsVision) {
        return NextResponse.json(
          {
            error:
              'The diagram pipeline requires a vision-capable provider for extraction. Use Gemini, OpenAI, Claude, GLM, Qwen, or a custom vision-capable OpenAI-compatible endpoint.',
          },
          { status: 400 }
        )
      }
      if (!session) {
        return NextResponse.json({ error: 'Selecting a provider requires sign in' }, { status: 401 })
      }
      const available = await getAvailableProvidersForUser(session.id)
      if (!available.some((p) => p.id === normalizedProvider)) {
        return NextResponse.json(
          { error: 'This provider is not usable yet. Add your own API key in Settings -> API Keys.' },
          { status: 400 }
        )
      }
    }

    if (!normalizedProvider && session) {
      const available = await getAvailableProvidersForUser(session.id)
      if (!available.some((p) => p.supportsVision)) {
        return NextResponse.json(
          {
            error:
              'No vision-capable provider is configured. Add a Gemini, OpenAI, Claude, GLM, Qwen, or custom vision-capable API key before running the diagram pipeline.',
          },
          { status: 400 }
        )
      }
    }

    const normalizedCount =
      typeof questionCount === 'number' && Number.isFinite(questionCount)
        ? Math.max(1, Math.min(20, Math.round(questionCount)))
        : null

    const diagram = await db.diagram.create({
      data: { filename: safeFilename, mimeType: safeMimeType, dataUrl: safeDataUrl },
    })

    const run = await db.run.create({
      data: {
        diagramId: diagram.id,
        bloomLevel: safeBloomLevel,
        status: 'running',
        startedAt: new Date(),
        provider: normalizedProvider,
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
