import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { cleanString, normalizeProviderBaseUrl, readJson, validateHttpUrl } from '@/lib/api'
import { encryptSecret } from '@/lib/crypto'
import { PROVIDERS, getAvailableProvidersForUser, type ProviderId } from '@/lib/ai/providers'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Wrapped: a schema/database drift on this table (e.g. a column the
  // Prisma client expects but the DB doesn't have yet) previously crashed
  // this whole route with an unhandled 500, which made every provider
  // look "missing" in the UI even for accounts that should have working
  // built-in access. Degrade to "no personal keys" instead of a hard
  // failure so at least the allow-listed built-in fallback still works.
  let rows: Awaited<ReturnType<typeof db.userApiKey.findMany>> = []
  try {
    rows = await db.userApiKey.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: 'asc' },
    })
  } catch (err) {
    console.error('[GET /api/providers] userApiKey.findMany failed', err)
  }
  const overridesByProvider = new Map(
    rows.filter((r) => !r.isCustom).map((r) => [r.providerId, r])
  )
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
      lastUsedAt: override?.lastUsedAt?.toISOString() ?? null,
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
      lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    }))

  return NextResponse.json({ providers: [...builtIn, ...custom] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: body, response } = await readJson<{
    providerId?: string
    label?: string
    apiKey?: string
    baseURL?: string
    model?: string
    isCustom?: boolean
  }>(req)
  if (response) return response

  const apiKey = cleanString(body?.apiKey, 8000)
  const label = cleanString(body?.label, 120)
  const baseURL = cleanString(body?.baseURL, 500)
  const model = cleanString(body?.model, 160)

  if (!apiKey) {
    return NextResponse.json({ error: 'apiKey is required' }, { status: 400 })
  }

  if (body?.isCustom) {
    if (!label) {
      return NextResponse.json({ error: 'A provider name (label) is required' }, { status: 400 })
    }
    if (!baseURL) {
      return NextResponse.json({ error: 'A base URL is required for a custom provider' }, { status: 400 })
    }
    if (!validateHttpUrl(baseURL)) {
      return NextResponse.json({ error: 'baseURL must be a valid HTTP(S) URL' }, { status: 400 })
    }

    const created = await db.userApiKey.create({
      data: {
        userId: session.id,
        providerId: `custom_${randomUUID()}`,
        label,
        apiKey: encryptSecret(apiKey),
        baseURL: normalizeProviderBaseUrl(baseURL),
        model,
        isCustom: true,
      },
    })

    return NextResponse.json({
      provider: {
        id: `custom:${created.id}`,
        keyId: created.id,
        label: created.label,
        baseURL: created.baseURL,
        defaultModel: created.model || '',
        isCustom: true,
        hasOwnKey: true,
        usable: true,
        lastUsedAt: created.lastUsedAt?.toISOString() ?? null,
      },
    })
  }

  const providerId = body?.providerId as ProviderId | undefined
  if (!providerId || !PROVIDERS[providerId]) {
    return NextResponse.json({ error: 'A valid providerId is required' }, { status: 400 })
  }

  const row = await db.userApiKey.upsert({
    where: { userId_providerId: { userId: session.id, providerId } },
    create: {
      userId: session.id,
      providerId,
      label,
      apiKey: encryptSecret(apiKey),
      model,
      isCustom: false,
    },
    update: {
      apiKey: encryptSecret(apiKey),
      model,
      label,
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
      lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    },
  })
}
