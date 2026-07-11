import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

/**
 * PATCH /api/providers/[id] — update one of the caller's own credential rows
 * (built-in override or custom provider). `id` is the UserApiKey row id.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params
  const row = await db.userApiKey.findUnique({ where: { id } })
  if (!row || row.userId !== session.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = (await req.json()) as Partial<{
    label: string
    apiKey: string
    baseURL: string
    model: string
  }>

  if (row.isCustom && body.baseURL !== undefined) {
    try {
      new URL(body.baseURL)
    } catch {
      return NextResponse.json({ error: 'baseURL must be a valid URL' }, { status: 400 })
    }
  }

  const updated = await db.userApiKey.update({
    where: { id },
    data: {
      ...(body.label !== undefined && { label: body.label.trim() || null }),
      ...(body.apiKey !== undefined && body.apiKey.trim() && { apiKey: body.apiKey.trim() }),
      ...(body.baseURL !== undefined && { baseURL: body.baseURL.trim().replace(/\/+$/, '') }),
      ...(body.model !== undefined && { model: body.model.trim() || null }),
    },
  })

  return NextResponse.json({
    provider: {
      id: updated.isCustom ? `custom:${updated.id}` : updated.providerId,
      keyId: updated.id,
      label: updated.label,
      baseURL: updated.baseURL,
      defaultModel: updated.model || '',
      isCustom: updated.isCustom,
    },
  })
}

/** DELETE /api/providers/[id] — remove the caller's own credential row. */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params
  const row = await db.userApiKey.findUnique({ where: { id } })
  if (!row) {
    return NextResponse.json({ ok: true })
  }
  if (row.userId !== session.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.userApiKey.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
