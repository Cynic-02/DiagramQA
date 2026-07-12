import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [totalRuns, completedRuns, failedRuns, runningRuns, agents, providers, recentRuns] =
      await Promise.all([
        db.run.count({ where: { userId: session.id } }),
        db.run.count({ where: { userId: session.id, status: 'completed' } }),
        db.run.count({ where: { userId: session.id, status: 'failed' } }),
        db.run.count({ where: { userId: session.id, status: 'running' } }),
        db.customAgent.count({ where: { userId: session.id } }),
        db.userApiKey.count({ where: { userId: session.id } }),
        db.run.findMany({
          where: { userId: session.id },
          select: { durationMs: true, bloomLevel: true, status: true },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
      ])

    const durations = recentRuns
      .map((run) => run.durationMs)
      .filter((value): value is number => typeof value === 'number' && value >= 0)
    const averageDurationMs =
      durations.length > 0
        ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
        : null

    const byBloomLevel = recentRuns.reduce<Record<string, number>>((acc, run) => {
      acc[run.bloomLevel] = (acc[run.bloomLevel] ?? 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      runs: {
        total: totalRuns,
        completed: completedRuns,
        failed: failedRuns,
        running: runningRuns,
        successRate: totalRuns > 0 ? completedRuns / totalRuns : 0,
        averageDurationMs,
        byBloomLevel,
      },
      agents,
      providers,
    })
  } catch (err) {
    console.error('[GET /api/stats]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load stats' },
      { status: 500 }
    )
  }
}
