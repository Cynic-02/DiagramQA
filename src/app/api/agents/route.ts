import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { PROVIDERS, CUSTOM_PROVIDER_PREFIX, type ProviderId } from '@/lib/ai/providers'

/** GET /api/agents — list the user's custom agents + public agents */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const agents = await db.customAgent.findMany({
    where: {
      OR: [{ userId: session.id }, { isPublic: true }],
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      prompt: a.prompt,
      provider: a.provider,
      model: a.model,
      isPublic: a.isPublic,
      isOwner: a.userId === session.id,
      createdAt: a.createdAt.toISOString(),
    })),
  })
}

/** POST /api/agents — create a custom agent */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, role, prompt, provider, model, isPublic } = (await req.json()) as {
    name: string
    role: string
    prompt: string
    provider?: string
    model?: string
    isPublic?: boolean
  }

  if (!name?.trim() || !role?.trim() || !prompt?.trim()) {
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

  const agent = await db.customAgent.create({
    data: {
      userId: session.id,
      name: name.trim(),
      role: role.trim(),
      prompt: prompt.trim(),
      provider: providerValue,
      model: model?.trim() || null,
      isPublic: !!isPublic,
    },
  })

  return NextResponse.json({ agent })
}
