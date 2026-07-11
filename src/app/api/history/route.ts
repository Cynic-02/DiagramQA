import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
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
export async function GET() {
  const runs = await db.run.findMany({
    include: { diagram: true },
    orderBy: { createdAt: 'desc' },
    take: 40,
  })

  const items: Array<{
    id: string
    filename: string
    bloomLevel: BloomLevel
    status: 'running' | 'completed' | 'failed'
    diagramType?: string
    qaCount: number
    provider?: string
    createdAt: string
  }> = runs.map((r) => {
    const finalQA = parse<FinalQAItem[]>(r.finalQA) ?? []
    return {
      id: r.id,
      filename: r.diagram.filename,
      bloomLevel: r.bloomLevel as BloomLevel,
      status: r.status as 'running' | 'completed' | 'failed',
      diagramType: r.diagramType ?? undefined,
      qaCount: finalQA.length,
      provider: r.provider ?? undefined,
      createdAt: r.createdAt.toISOString(),
    }
  })

  return NextResponse.json({ items })
}

export type HistoryItem = Awaited<ReturnType<typeof GET>> extends never
  ? never
  : RunRecord
