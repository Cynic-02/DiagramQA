import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { cleanString, normalizeProviderBaseUrl, readJson, validateHttpUrl } from '@/lib/api'
import { encryptSecret } from '@/lib/crypto'

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

  const { data: body, response } = await readJson<Partial<{
    label: string
    apiKey: string
    baseURL: string
    model: string
  }>>(req)
  if (response) return response

  const label = body?.label !== undefined ? cleanString(body.label, 120) : undefined
  const apiKey = body?.apiKey !== undefined ? cleanString(body.apiKey, 8000) : undefined
  const baseURL = body?.baseURL !== undefined ? cleanString(body.baseURL, 500) : undefined
  const model = body?.model !== undefined ? cleanString(body.model, 160) : undefined

  if (body?.apiKey !== undefined && !apiKey) {
    return NextResponse.json({ error: 'apiKey cannot be empty' }, { status: 400 })
  }
  if (row.isCustom && body?.label !== undefined && !label) {
    return NextResponse.json({ error: 'A provider name (label) is required' }, { status: 400 })
  }
  if (row.isCustom && body?.baseURL !== undefined) {
    if (!baseURL || !validateHttpUrl(baseURL)) {
      return NextResponse.json({ error: 'baseURL must be a valid HTTP(S) URL' }, { status: 400 })
    }
  }

  const data: Prisma.UserApiKeyUpdateInput = {}
  if (label !== undefined) data.label = label
  if (apiKey) data.apiKey = encryptSecret(apiKey)
  if (baseURL) data.baseURL = normalizeProviderBaseUrl(baseURL)
  if (model !== undefined) data.model = model

  const updated = await db.userApiKey.update({
    where: { id },
    data,
  })

  return NextResponse.json({
    provider: {
      id: updated.isCustom ? `custom:${updated.id}` : updated.providerId,
      keyId: updated.id,
      label: updated.label,
      baseURL: updated.baseURL,
      defaultModel: updated.model || '',
      isCustom: updated.isCustom,
      lastUsedAt: updated.lastUsedAt?.toISOString() ?? null,
    },
  })
}

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
