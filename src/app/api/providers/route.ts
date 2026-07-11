import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { PROVIDERS, getAvailableProvidersForUser, type ProviderId } from '@/lib/ai/providers'

/**
 * GET /api/providers
 *
 * Returns the merged list of AI providers this user can select from:
 *  - every built-in provider, flagged with whether it's usable (either the
 *    caller is the platform's allow-listed account with an env key, or
 *    they've added their own) and whether the active key is their own or
 *    the platform's
 *  - the user's own custom (fully user-defined) OpenAI-compatible providers
 *
 * Never returns raw API keys — only a `hasKey` boolean per row.
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await db.userApiKey.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: 'asc' },
  })
  const overridesByProvider = new Map(
    rows.filter((r) => !r.isCustom).map((r) => [r.providerId, r])
  )
  // Gated per-user — only reflects env keys this specific account is
  // allowed to fall back to, not every env key the platform has.
  const availableForThisUser = await getAvailableProvidersForUser(session.id)
  const envAvailable = new Set(availableForThisUser.map((p) => p.id))

  const builtIn = Object.values(PROVIDERS).map((p) => {
    const override = overridesByProvider.get(p.id)
    return {
      id: p.id,
      label: p.label,
      defaultModel: p.defaultModel,
      supportsVision: p.supportsVision,
      supportsReasoning: p.supportsReasoning,
      isCustom: false,
      hasPlatformKey: envAvailable.has(p.id),
      hasOwnKey: !!override,
      usable: envAvailable.has(p.id) || !!override,
      ownModel: override?.model ?? null,
      keyId: override?.id ?? null,
    }
  })

  const custom = rows
    .filter((r) => r.isCustom)
    .map((r) => ({
      id: `custom:${r.id}`,
      keyId: r.id,
      label: r.label || 'Custom provider',
      baseURL: r.baseURL,
      defaultModel: r.model || '',
      isCustom: true,
      hasPlatformKey: false,
      hasOwnKey: true,
      usable: true,
    }))

  return NextResponse.json({ providers: [...builtIn, ...custom] })
}

/**
 * POST /api/providers
 * Body (built-in override):  { providerId: "openai", apiKey, model? }
 * Body (custom provider):    { isCustom: true, label, baseURL, apiKey, model? }
 *
 * Creates or updates the caller's own credential row. Built-in overrides
 * are upserted (one row per user+providerId); custom providers are always
 * created fresh (call PATCH /api/providers/[id] to edit one).
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as {
    providerId?: string
    label?: string
    apiKey?: string
    baseURL?: string
    model?: string
    isCustom?: boolean
  }

  if (!body.apiKey?.trim()) {
    return NextResponse.json({ error: 'apiKey is required' }, { status: 400 })
  }

  if (body.isCustom) {
    if (!body.label?.trim()) {
      return NextResponse.json({ error: 'A provider name (label) is required' }, { status: 400 })
    }
    if (!body.baseURL?.trim()) {
      return NextResponse.json({ error: 'A base URL is required for a custom provider' }, { status: 400 })
    }
    try {
      new URL(body.baseURL.trim())
    } catch {
      return NextResponse.json({ error: 'baseURL must be a valid URL' }, { status: 400 })
    }

    // providerId for a custom row is just a placeholder until we know the
    // row's own id — fill it in right after creation so @@unique holds.
    const created = await db.userApiKey.create({
      data: {
        userId: session.id,
        providerId: 'pending',
        label: body.label.trim(),
        apiKey: body.apiKey.trim(),
        baseURL: body.baseURL.trim().replace(/\/+$/, ''),
        model: body.model?.trim() || null,
        isCustom: true,
      },
    })
    const finalized = await db.userApiKey.update({
      where: { id: created.id },
      data: { providerId: created.id },
    })

    return NextResponse.json({
      provider: {
        id: `custom:${finalized.id}`,
        keyId: finalized.id,
        label: finalized.label,
        baseURL: finalized.baseURL,
        defaultModel: finalized.model || '',
        isCustom: true,
        hasOwnKey: true,
        usable: true,
      },
    })
  }

  const providerId = body.providerId as ProviderId | undefined
  if (!providerId || !PROVIDERS[providerId]) {
    return NextResponse.json({ error: 'A valid providerId is required' }, { status: 400 })
  }

  const row = await db.userApiKey.upsert({
    where: { userId_providerId: { userId: session.id, providerId } },
    create: {
      userId: session.id,
      providerId,
      label: body.label?.trim() || null,
      apiKey: body.apiKey.trim(),
      model: body.model?.trim() || null,
      isCustom: false,
    },
    update: {
      apiKey: body.apiKey.trim(),
      model: body.model?.trim() || null,
      label: body.label?.trim() || null,
    },
  })

  return NextResponse.json({
    provider: {
      id: PROVIDERS[providerId].id,
      keyId: row.id,
      label: PROVIDERS[providerId].label,
      isCustom: false,
      hasOwnKey: true,
      usable: true,
      ownModel: row.model,
    },
  })
}
