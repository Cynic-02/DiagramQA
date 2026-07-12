import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { cleanString, readJson } from '@/lib/api'
import { PROVIDERS, CUSTOM_PROVIDER_PREFIX, type ProviderId } from '@/lib/ai/providers'
import { DEFAULT_PROMPTS } from '@/lib/pipeline/default-prompts'

/** GET /api/agents — list the user's custom agents + public agents + system agents */
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allAgents = await db.customAgent.findMany({
      where: {
        OR: [{ userId: session.id }, { isPublic: true }],
      },
      orderBy: { createdAt: 'desc' },
    })

    // Filter out system agent overrides from regular list
    const customAgents = allAgents.filter((a) => !a.role.startsWith('system-'))
    const overrides = allAgents.filter((a) => a.role.startsWith('system-') && a.userId === session.id)

    const systemAgentDefaults = [
      { id: 'system-extraction', name: 'Vision Agent (Ingestion)', role: 'system-extraction', prompt: DEFAULT_PROMPTS.extraction },
      { id: 'system-generation', name: 'Generator Agent (Composing)', role: 'system-generation', prompt: DEFAULT_PROMPTS.generation },
      { id: 'system-answering', name: 'Solver Agent (Independent Solver)', role: 'system-answering', prompt: DEFAULT_PROMPTS.answering },
      { id: 'system-verification', name: 'Critic Agent (Grounding Critic)', role: 'system-verification', prompt: DEFAULT_PROMPTS.verification },
    ]

    const systemAgents = systemAgentDefaults.map((def) => {
      const override = overrides.find((o) => o.role === def.role)
      return {
        id: override?.id ?? def.id,
        role: def.role,
        name: def.name,
        prompt: override?.prompt ?? def.prompt,
        provider: override?.provider ?? 'glm',
        model: override?.model ?? null,
        isPublic: false,
        isOwner: true,
        isSystem: true,
        hasOverride: !!override,
        createdAt: override ? override.createdAt.toISOString() : new Date().toISOString(),
      }
    })

    return NextResponse.json({
      agents: customAgents.map((a) => ({
        id: a.id,
        name: a.name,
        role: a.role,
        prompt: a.prompt,
        provider: a.provider,
        model: a.model,
        isPublic: a.isPublic,
        isOwner: a.userId === session.id,
        isSystem: false,
        createdAt: a.createdAt.toISOString(),
      })),
      systemAgents,
    })
  } catch (err) {
    console.error('[GET /api/agents]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load agents' },
      { status: 500 }
    )
  }
}

/** POST /api/agents — create or update a custom/system agent */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: body, response } = await readJson<{
      name: string
      role: string
      prompt: string
      provider?: string
      model?: string
      isPublic?: boolean
    }>(req)
    if (response) return response

    const name = cleanString(body?.name, 120)
    const role = cleanString(body?.role, 120)
    const prompt = cleanString(body?.prompt, 8000)
    const provider = cleanString(body?.provider, 200)
    const model = cleanString(body?.model, 160)

    if (!name || !role || !prompt) {
      return NextResponse.json(
        { error: 'Name, role, and prompt are required' },
        { status: 400 }
      )
    }

    // validate provider if specified — either a built-in ProviderId, or one
    // of the caller's own custom providers (custom:<UserApiKey id>).
    const providerValue = provider || 'glm'
    if (providerValue.startsWith(CUSTOM_PROVIDER_PREFIX)) {
      const customId = providerValue.slice(CUSTOM_PROVIDER_PREFIX.length)
      const owned = await db.userApiKey.findFirst({
        where: { id: customId, userId: session.id, isCustom: true },
        select: { id: true },
      })
      if (!owned) {
        return NextResponse.json({ error: 'Unknown custom provider' }, { status: 400 })
      }
    } else if (!PROVIDERS[providerValue as ProviderId]) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    // If this is a system prompt override, update the existing override if it exists
    if (role.startsWith('system-')) {
      const existing = await db.customAgent.findFirst({
        where: { userId: session.id, role },
      })
      if (existing) {
        const updated = await db.customAgent.update({
          where: { id: existing.id },
          data: { name, prompt, provider: providerValue, model: model || null },
        })
        return NextResponse.json({ agent: updated })
      }
    }

    const agent = await db.customAgent.create({
      data: {
        userId: session.id,
        name,
        role,
        prompt,
        provider: providerValue,
        model,
        isPublic: !!body?.isPublic,
      },
    })

    return NextResponse.json({ agent })
  } catch (err) {
    console.error('[POST /api/agents]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save agent' },
      { status: 500 }
    )
  }
}
