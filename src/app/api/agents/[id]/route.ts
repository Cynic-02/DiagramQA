import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { PROVIDERS, CUSTOM_PROVIDER_PREFIX, type ProviderId } from '@/lib/ai/providers'

/** DELETE /api/agents/[id] — delete a custom agent (owner only) */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params
  const agent = await db.customAgent.findUnique({ where: { id } })
  if (!agent) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (agent.userId !== session.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.customAgent.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

/** PATCH /api/agents/[id] — update a custom agent (owner only) */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params
  const agent = await db.customAgent.findUnique({ where: { id } })
  if (!agent) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (agent.userId !== session.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json()) as Partial<{
    name: string
    role: string
    prompt: string
    provider: string
    model: string
    isPublic: boolean
  }>

  if (body.provider !== undefined) {
    if (body.provider.startsWith(CUSTOM_PROVIDER_PREFIX)) {
      const customId = body.provider.slice(CUSTOM_PROVIDER_PREFIX.length)
      const owned = await db.userApiKey.findFirst({
        where: { id: customId, userId: session.id, isCustom: true },
        select: { id: true },
      })
      if (!owned) {
        return NextResponse.json({ error: 'Unknown custom provider' }, { status: 400 })
      }
    } else if (!PROVIDERS[body.provider as ProviderId]) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }
  }

  const updated = await db.customAgent.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.role !== undefined && { role: body.role }),
      ...(body.prompt !== undefined && { prompt: body.prompt }),
      ...(body.provider !== undefined && { provider: body.provider }),
      ...(body.model !== undefined && { model: body.model }),
      ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
    },
  })

  return NextResponse.json({ agent: updated })
}
