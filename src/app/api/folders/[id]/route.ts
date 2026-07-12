import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Deleting a folder unassigns the runs (they stay in history but lose folder link)
    await db.$transaction([
      db.run.updateMany({
        where: { folderId: id },
        data: { folderId: null },
      }),
      db.folder.delete({
        where: { id },
      })
    ])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/folders/[id]]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete folder' },
      { status: 500 }
    )
  }
}
