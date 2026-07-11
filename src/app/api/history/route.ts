import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import type { BloomLevel, FinalQAItem, RunRecord } from '@/lib/types'

function parse<T>(s: string | null | undefined): T | undefined {
  if (!s) return undefined
  try {
    return JSON.parse(s) as T
  } catch {
    return undefined
  }
}

/**
 * GET /api/history — lightweight list of past runs for the history rail.
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 40)))
  const cursor = url.searchParams.get('cursor')
  const status = url.searchParams.get('status')
  const q = url.searchParams.get('q')?.trim()

  const where = {
    userId: session.id,
    ...(status && ['running', 'completed', 'failed'].includes(status) ? { status } : {}),
    ...(q
      ? {
          diagram: {
            filename: {
              contains: q,
            },
          },
        }
      : {}),
  }

  const runs = await db.run.findMany({
    where,
    include: { diagram: true },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const page = runs.slice(0, limit)
  const nextCursor = runs.length > limit ? runs[limit].id : null

  const items: Array<{
    id: string
    filename: string
    dataUrl: string
    bloomLevel: BloomLevel
    status: 'running' | 'completed' | 'failed'
    diagramType?: string
    qaCount: number
    provider?: string
    createdAt: string
    durationMs?: number
    completedAt?: string
  }> = page.map((r) => {
    const finalQA = parse<FinalQAItem[]>(r.finalQA) ?? []
    return {
      id: r.id,
      filename: r.diagram.filename,
      dataUrl: r.diagram.dataUrl,
      bloomLevel: r.bloomLevel as BloomLevel,
      status: r.status as 'running' | 'completed' | 'failed',
      diagramType: r.diagramType ?? undefined,
      qaCount: finalQA.length,
      provider: r.provider ?? undefined,
      durationMs: r.durationMs ?? undefined,
      completedAt: r.completedAt?.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }
  })

  return NextResponse.json({ items, nextCursor })
}

export type HistoryItem = Awaited<ReturnType<typeof GET>> extends never
  ? never
  : RunRecord
