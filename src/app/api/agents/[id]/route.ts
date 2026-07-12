import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { cleanString, readJson } from '@/lib/api'
import { PROVIDERS, CUSTOM_PROVIDER_PREFIX, type ProviderId } from '@/lib/ai/providers'

/** DELETE /api/agents/[id] — delete a custom agent (owner only) */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
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
  } catch (err) {
    console.error('[DELETE /api/agents/[id]]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete agent' },
      { status: 500 }
    )
  }
}

/** PATCH /api/agents/[id] — update a custom agent (owner only) */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
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

    const { data: body, response } = await readJson<Partial<{
      name: string
      role: string
      prompt: string
      provider: string
      model: string
      isPublic: boolean
    }>>(req)
    if (response) return response

    const name = body?.name !== undefined ? cleanString(body.name, 120) : undefined
    const role = body?.role !== undefined ? cleanString(body.role, 120) : undefined
    const prompt = body?.prompt !== undefined ? cleanString(body.prompt, 8000) : undefined
    const provider = body?.provider !== undefined ? cleanString(body.provider, 200) : undefined
    const model = body?.model !== undefined ? cleanString(body.model, 160) : undefined

    if (body?.name !== undefined && !name) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }
    if (body?.role !== undefined && !role) {
      return NextResponse.json({ error: 'Role cannot be empty' }, { status: 400 })
    }
    if (body?.prompt !== undefined && !prompt) {
      return NextResponse.json({ error: 'Prompt cannot be empty' }, { status: 400 })
    }

    if (body?.provider !== undefined && !provider) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    if (provider) {
      if (provider.startsWith(CUSTOM_PROVIDER_PREFIX)) {
        const customId = provider.slice(CUSTOM_PROVIDER_PREFIX.length)
        const owned = await db.userApiKey.findFirst({
          where: { id: customId, userId: session.id, isCustom: true },
          select: { id: true },
        })
        if (!owned) {
          return NextResponse.json({ error: 'Unknown custom provider' }, { status: 400 })
        }
      } else if (!PROVIDERS[provider as ProviderId]) {
        return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
      }
    }

    const data: Prisma.CustomAgentUpdateInput = {}
    if (name) data.name = name
    if (role) data.role = role
    if (prompt) data.prompt = prompt
    if (provider) data.provider = provider
    if (model !== undefined) data.model = model
    if (body?.isPublic !== undefined) data.isPublic = body.isPublic

    const updated = await db.customAgent.update({
      where: { id },
      data,
    })

    return NextResponse.json({ agent: updated })
  } catch (err) {
    console.error('[PATCH /api/agents/[id]]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update agent' },
      { status: 500 }
    )
  }
}
