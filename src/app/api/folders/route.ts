import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const folders = await db.folder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        runs: {
          select: {
            id: true,
          }
        }
      }
    })

    return NextResponse.json({ folders })
  } catch (err) {
    console.error('[GET /api/folders]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load folders' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { name } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
    }

    const folder = await db.folder.create({
      data: { name }
    })

    return NextResponse.json({ folder })
  } catch (err) {
    console.error('[POST /api/folders]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create folder' },
      { status: 500 }
    )
  }
}
