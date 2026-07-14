/**
 * AI Provider Abstraction Layer
 *
 * A unified interface that supports multiple AI providers (DeepSeek, OpenAI,
 * Anthropic Claude, Google Gemini, Grok, Groq, Qwen, Kimi, GLM) with:
 *  - Streaming responses (for live "stream of thought" display)
 *  - Chain-of-thought / reasoning extraction (provider-agnostic)
 *  - Vision support (for diagram understanding)
 *  - Fallback chaining (if one provider fails, try the next)
 *  - Per-account credentials: every user can plug in their own API key for
 *    any built-in provider (overriding the platform's env-based key), and
 *    can register fully custom OpenAI-compatible providers under their own
 *    name/base URL/model (see UserApiKey in prisma/schema.prisma).
 *
 * Built-in providers fall back to environment variables when a user hasn't
 * configured their own key, so the system keeps degrading gracefully.
 */

import { db } from '@/lib/db'
import { decryptSecret } from '@/lib/crypto'

export type ProviderId =
  | 'glm'
  | 'openai'
  | 'deepseek'
  | 'claude'
  | 'gemini'
  | 'grok'
  | 'groq'
  | 'qwen'
  | 'kimi'
  | 'openrouter'

/** Prefix used to address a user's custom provider, e.g. "custom:ck123". */
export const CUSTOM_PROVIDER_PREFIX = 'custom:'

export interface ProviderConfig {
  id: ProviderId
  label: string
  /** env var name that holds the API key; if unset, provider is disabled */
  apiKeyEnv: string
  /** base URL for OpenAI-compatible providers */
  baseURL?: string
  /** default model id */
  defaultModel: string
  /** whether this provider supports vision (image input) */
  supportsVision: boolean
  /** whether this provider exposes a dedicated reasoning/thinking field */
  supportsReasoning: boolean
}

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  glm: {
    id: 'glm',
    label: 'GLM (Z.ai)',
    apiKeyEnv: 'ZAI_API_KEY',
    baseURL: 'https://api.z.ai/api/paas/v4',
    defaultModel: 'glm-4.6v',
    supportsVision: true,
    supportsReasoning: true,
  },
  openai: {
    id: 'openai',
    label: 'OpenAI (ChatGPT)',
    apiKeyEnv: 'OPENAI_API_KEY',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    supportsVision: true,
    // gpt-4o has no chain-of-thought trace via /chat/completions — OpenAI's
    // actual reasoning models (o-series, gpt-5-thinking) only expose a
    // reasoning summary through the separate Responses API, a different
    // request/response shape this integration doesn't implement yet.
    supportsReasoning: false,
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    baseURL: 'https://api.deepseek.com/v1',
    // Chat calls use deepseek-chat; when reasoning is requested the call
    // layer swaps to deepseek-reasoner instead, since deepseek-chat never
    // returns reasoning_content regardless of any flag.
    defaultModel: 'deepseek-chat',
    supportsVision: false,
    supportsReasoning: true,
  },
  claude: {
    id: 'claude',
    label: 'Anthropic Claude',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    baseURL: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-20250514',
    supportsVision: true,
    supportsReasoning: true,
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    apiKeyEnv: 'GEMINI_API_KEY',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.5-flash',
    supportsVision: true,
    supportsReasoning: true,
  },
  grok: {
    id: 'grok',
    label: 'xAI Grok',
    apiKeyEnv: 'XAI_API_KEY',
    baseURL: 'https://api.x.ai/v1',
    // grok-2-latest doesn't reason out loud; xAI's reasoning-capable models
    // (grok-3-mini, grok-4) would need to be the model here for this to
    // return anything.
    defaultModel: 'grok-2-latest',
    supportsVision: false,
    supportsReasoning: false,
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    apiKeyEnv: 'GROQ_API_KEY',
    baseURL: 'https://api.groq.com/openai/v1',
    // llama-3.3-70b-versatile doesn't reason out loud; Groq does host
    // reasoning models (e.g. deepseek-r1-distill-*) but not as the default.
    defaultModel: 'llama-3.3-70b-versatile',
    supportsVision: false,
    supportsReasoning: false,
  },
  qwen: {
    id: 'qwen',
    label: 'Qwen (Alibaba)',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
    baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    // Must be a "-vl-" (vision-language) model, NOT plain "qwen-plus" —
    // qwen-plus is text-only and silently can't see the diagram image
    // despite this provider being marked supportsVision below. qwen-vl-plus
    // handles both text-only and vision requests fine, so it's safe to use
    // for every pipeline stage, not just extraction.
    defaultModel: 'qwen-vl-plus',
    supportsVision: true,
    supportsReasoning: true,
  },
  kimi: {
    id: 'kimi',
    label: 'Kimi (Moonshot)',
    apiKeyEnv: 'MOONSHOT_API_KEY',
    baseURL: 'https://api.moonshot.cn/v1',
    // moonshot-v1-32k doesn't reason out loud; Moonshot's thinking-capable
    // models aren't the default here.
    defaultModel: 'moonshot-v1-32k',
    supportsVision: false,
    supportsReasoning: false,
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    baseURL: 'https://openrouter.ai/api/v1',
    // OpenRouter's unified `reasoning` request param + response field works
    // across many of the models it routes to, including the default here.
    defaultModel: 'google/gemini-2.5-flash',
    supportsVision: true,
    supportsReasoning: true,
  },
}

/** Returns the list of built-in providers that have API keys configured via env vars. */
export function getAvailableProviders(): ProviderConfig[] {
  return Object.values(PROVIDERS).filter(
    (p) => !!process.env[p.apiKeyEnv]
  )
}

/**
 * Returns the list of built-in providers usable by a given user:
 *  - if the user is the allow-listed built-in-key account, this is the
 *    platform's env-configured providers UNION any provider they've
 *    personally added a key for;
 *  - for every other user, this is ONLY the providers they've personally
 *    added a key for — the platform's env keys never appear in their
 *    available list, so the fallback chain in chat()/streamChat() doesn't
 *    waste time (or leak provider availability) trying keys they can't use.
 */
export async function getAvailableProvidersForUser(
  userId?: string
): Promise<ProviderConfig[]> {
  const mayUseBuiltIn = await userMayUseBuiltInKeys(userId)
  const envAvailable = mayUseBuiltIn ? getAvailableProviders() : []

  if (!userId) return envAvailable
  try {
    const rows = await db.userApiKey.findMany({
      where: { userId, isCustom: false },
      select: { providerId: true },
    })
    const userIds = new Set(rows.map((r) => r.providerId))
    const envIds = new Set(envAvailable.map((p) => p.id))
    const ownKeyed = Object.values(PROVIDERS).filter((p) => userIds.has(p.id))
    const extra = ownKeyed.filter((p) => !envIds.has(p.id))
    return [...envAvailable, ...extra]
  } catch {
    return envAvailable
  }
}

/** Returns the default/primary provider (Gemini preferred, then GLM, then first available). */
export function getDefaultProvider(): ProviderConfig | null {
  const available = getAvailableProviders()
  if (available.length === 0) return null
  const gemini = available.find((p) => p.id === 'gemini')
  if (gemini) return gemini
  const glm = available.find((p) => p.id === 'glm')
  return glm || available[0]
}

/**
 * Returns the list of API keys configured for a provider via env vars.
 * Most providers hold a single key, but e.g. GEMINI_API_KEY may contain
 * multiple comma-separated keys for automatic rotation.
 */
function getEnvKeysForProvider(provider: ProviderConfig): string[] {
  const raw = process.env[provider.apiKeyEnv]
  if (!raw) return []
  return splitKeys(raw)
}

function splitKeys(value: string): string[] {
  return value
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
}

/**
 * Cleans up a user-supplied model id before it's used in a request.
 * Handles the most common paste mistakes so a user never has to get the
 * exact format right by hand:
 *  - surrounding whitespace or quotes
 *  - a leading "models/" or "tunedModels/" resource prefix copied from
 *    Google's docs (our own Gemini calls already prepend "/models/" to the
 *    URL, so a caller-supplied prefix would double up into
 *    ".../models/models/gemini-..." and trigger Google's
 *    "unexpected model name format" error)
 * Returns undefined for empty input so `sanitizeModelId(x) || fallback`
 * cleanly falls through to the provider's default model.
 */
function sanitizeModelId(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined
  let m = raw.trim()
  if (!m) return undefined
  if ((m.startsWith('"') && m.endsWith('"')) || (m.startsWith("'") && m.endsWith("'"))) {
    m = m.slice(1, -1).trim()
  }
  m = m.replace(/^(models|tunedModels)\//i, '').trim()
  return m || undefined
}

function chatCompletionsUrl(baseURL: string): string {
  const url = new URL(baseURL.trim().replace(/\/+$/, ''))
  const path = url.pathname.replace(/\/+$/, '')
  if (path.endsWith('/chat/completions')) {
    return url.toString()
  }
  url.pathname = `${path}/chat/completions`.replace(/\/{2,}/g, '/')
  return url.toString()
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && 'text' in part) {
          const text = (part as { text?: unknown }).text
          return typeof text === 'string' ? text : ''
        }
        return ''
      })
      .join('')
  }
  return ''
}

/**
 * Only this account may fall back to the platform's built-in (env-var)
 * API keys when it hasn't configured its own. Every other signed-in user
 * must add their own key for a provider before they can use it — no free
 * ride on the platform's keys. Comparison is case-insensitive since email
 * lookups elsewhere in this codebase are normalized to lowercase too.
 */
const BUILT_IN_KEY_ALLOWED_EMAIL = 'tousifizaz02@gmail.com'

/** True if this user is allowed to fall back to the platform's env keys. */
async function userMayUseBuiltInKeys(userId: string | undefined): Promise<boolean> {
  if (!userId) return false // no signed-in user — never falls back
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })
    return !!user && user.email.toLowerCase() === BUILT_IN_KEY_ALLOWED_EMAIL
  } catch {
    // DB unreachable — safest default is to NOT grant the built-in fallback.
    return false
  }
}

/**
 * Resolves which key(s) + model to use for a built-in provider: a user's
 * own key (from UserApiKey) always takes priority. If they haven't added
 * one, only the allow-listed account may fall back to the platform's env
 * key — everyone else gets a clear "add your own key" error instead of
 * silently using the platform's built-in credentials.
 */
async function resolveProviderKeys(
  provider: ProviderConfig,
  options: ChatOptions
): Promise<{ keys: string[]; model: string }> {
  if (options.apiKeyOverride) {
    const keys = splitKeys(options.apiKeyOverride)
    if (keys.length > 0) {
      return { keys, model: sanitizeModelId(options.model) || provider.defaultModel }
    }
  }

  if (options.userId) {
    try {
      const row = await db.userApiKey.findUnique({
        where: {
          userId_providerId: { userId: options.userId, providerId: provider.id },
        },
      })
      if (row && !row.isCustom && row.apiKey) {
        await db.userApiKey.update({
          where: { id: row.id },
          data: { lastUsedAt: new Date() },
        }).catch(() => undefined)
        const keys = splitKeys(decryptSecret(row.apiKey))
        if (keys.length > 0) {
          return {
            keys,
            model:
              sanitizeModelId(options.model) ||
              sanitizeModelId(row.model) ||
              provider.defaultModel,
          }
        }
      }
    } catch {
      // DB unreachable / lookup failed — fall through to the allow-list check.
    }
  }

  if (await userMayUseBuiltInKeys(options.userId)) {
    return {
      keys: getEnvKeysForProvider(provider),
      model: sanitizeModelId(options.model) || provider.defaultModel,
    }
  }

  throw new Error(
    `${provider.label} requires your own API key. Add one in Settings → API Keys to use this provider.`
  )
}

/** Loads + validates a user's custom (fully user-defined) provider row. */
async function loadCustomProvider(userId: string | undefined, customId: string) {
  if (!userId) {
    throw new Error('Custom providers require you to be signed in')
  }
  const row = await db.userApiKey.findFirst({
    where: { id: customId, userId, isCustom: true },
  })
  if (!row) {
    throw new Error('Custom provider not found (it may have been deleted)')
  }
  if (!row.baseURL) {
    throw new Error(`Custom provider "${row.label || customId}" has no base URL configured`)
  }
  if (!row.apiKey) {
    throw new Error(`Custom provider "${row.label || customId}" has no API key configured`)
  }
  await db.userApiKey.update({
    where: { id: row.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => undefined)
  return row
}

/** True if an error looks like a quota/rate-limit exhaustion (safe to retry with a different key). */
function isQuotaExhaustedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    msg.includes('429') ||
    /RESOURCE_EXHAUSTED/i.test(msg) ||
    /quota/i.test(msg) ||
    /rate.?limit/i.test(msg)
  )
}

/** One failed attempt in a provider fallback chain, for reporting to the caller. */
export interface FallbackAttempt {
  providerId: string
  label: string
  /** true if this attempt failed specifically due to quota/rate-limit exhaustion */
  quotaExhausted: boolean
  message: string
}

/**
 * Builds a clear, human-readable summary when every provider in the
 * fallback chain has failed — distinguishing "everything is just quota-
 * exhausted right now" (a transient, well-understood state) from a mix of
 * failures, instead of surfacing a raw concatenated technical error.
 */
function buildAllProvidersFailedMessage(attempts: FallbackAttempt[]): string {
  if (attempts.length === 0) {
    return 'No AI providers were available to try.'
  }
  const allQuota = attempts.every((a) => a.quotaExhausted)
  const detail = attempts
    .map((a) => `${a.label} — ${a.quotaExhausted ? 'quota/rate limit exceeded' : a.message}`)
    .join('; ')
  if (allQuota) {
    return `All configured AI providers have hit their quota or rate limit right now. Try again in a bit, or add another provider's API key in Settings → API Keys. (${detail})`
  }
  return `All configured AI providers failed. (${detail})`
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  /** optional image (data URL) for vision-capable providers */
  image?: string
}

export interface ChatOptions {
  /** A built-in ProviderId, or `custom:<UserApiKey id>` for a user-defined provider. */
  provider?: string
  model?: string
  temperature?: number
  maxTokens?: number
  /** if true, request chain-of-thought reasoning */
  reasoning?: boolean
  /**
   * The signed-in user's id. Required to resolve personal API-key overrides
   * and custom providers; omit for platform-key-only (env) behavior.
   */
  userId?: string
  /** Internal: test an unsaved/supplied key without reading env or DB. */
  apiKeyOverride?: string
  /**
   * Called each time a provider in the fallback chain fails and the call
   * is about to move on to the next one — lets the caller (e.g. the
   * pipeline's log stream) surface "X is rate-limited, trying Y" live
   * instead of only learning about it if every provider ends up failing.
   */
  onFallback?: (attempt: FallbackAttempt) => void
}

export interface ChatResult {
  content: string
  /** extracted reasoning / chain-of-thought steps */
  reasoning: string[]
  /** built-in ProviderId, or `custom:<id>` for a custom provider */
  provider: string
  model: string
}

export interface StreamChunk {
  /** incremental content text */
  delta?: string
  /** incremental reasoning text (chain-of-thought) */
  reasoningDelta?: string
  /** true when the stream is complete */
  done?: boolean
  /** built-in ProviderId, or `custom:<id>` for a custom provider */
  provider?: string
  model?: string
}

/**
 * Unified chat completion call. Tries the specified provider, then falls back
 * to other available providers on failure (custom providers are tried alone,
 * with no cross-provider fallback, since there is exactly one to try).
 */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<ChatResult> {
  if (options.provider?.startsWith(CUSTOM_PROVIDER_PREFIX)) {
    const customId = options.provider.slice(CUSTOM_PROVIDER_PREFIX.length)
    return callCustomProvider(customId, messages, options)
  }

  const available = await getAvailableProvidersForUser(options.userId)
  // A message with an image (diagram extraction) can only be served by a
  // vision-capable provider — including a non-vision one in the pool means
  // it either gets picked and fails outright, or wastes a fallback attempt.
  const hasImage = messages.some((m) => m.image)
  const candidates = hasImage ? available.filter((p) => p.supportsVision) : available

  let preferred: ProviderConfig | null
  if (options.provider) {
    preferred = PROVIDERS[options.provider as ProviderId] ?? null
    if (!preferred) throw new Error(`Unknown AI provider "${options.provider}"`)
  } else {
    // Pick from THIS user's actual available list, not the global env
    // default — otherwise a non-allow-listed user with no explicit choice
    // would be handed an env-only provider they can't actually use.
    preferred =
      candidates.find((p) => p.id === 'gemini') ??
      candidates.find((p) => p.id === 'glm') ??
      candidates[0] ??
      null
  }
  if (!preferred) {
    if (hasImage && available.length > 0) {
      throw new Error(
        'This step needs a vision-capable provider to read the diagram. Add a key for OpenAI, Anthropic Claude, Gemini, GLM, Qwen, or OpenRouter in Settings → API Keys.'
      )
    }
    throw new Error(
      'No AI providers configured for your account. Add your own API key in Settings → API Keys.'
    )
  }

  const chain = [preferred, ...candidates.filter((p) => p.id !== preferred!.id)]

  const attempts: FallbackAttempt[] = []
  for (const provider of chain) {
    try {
      return await callProvider(provider, messages, options)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const attempt: FallbackAttempt = {
        providerId: provider.id,
        label: provider.label,
        quotaExhausted: isQuotaExhaustedError(err),
        message,
      }
      attempts.push(attempt)
      options.onFallback?.(attempt)
    }
  }
  throw new Error(buildAllProvidersFailedMessage(attempts))
}

/**
 * Streaming chat completion. Yields chunks as they arrive, including
 * chain-of-thought reasoning where supported.
 */
export async function* streamChat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): AsyncGenerator<StreamChunk> {
  if (options.provider?.startsWith(CUSTOM_PROVIDER_PREFIX)) {
    const customId = options.provider.slice(CUSTOM_PROVIDER_PREFIX.length)
    try {
      const row = await db.userApiKey.findFirst({
        where: { id: customId, userId: options.userId, isCustom: true },
      })
      if (row) {
        yield {
          provider: `custom:${row.label || customId}`,
          model: sanitizeModelId(options.model) || sanitizeModelId(row.model) || 'custom',
        }
      }
    } catch {
      yield { provider: options.provider, model: options.model || 'custom' }
    }
    yield* streamCustomProvider(customId, messages, options)
    return
  }

  const available = await getAvailableProvidersForUser(options.userId)
  const hasImage = messages.some((m) => m.image)
  const candidates = hasImage ? available.filter((p) => p.supportsVision) : available

  let preferred: ProviderConfig | null
  if (options.provider) {
    preferred = PROVIDERS[options.provider as ProviderId] ?? null
    if (!preferred) throw new Error(`Unknown AI provider "${options.provider}"`)
  } else {
    preferred =
      candidates.find((p) => p.id === 'gemini') ??
      candidates.find((p) => p.id === 'glm') ??
      candidates[0] ??
      null
  }
  if (!preferred) {
    if (hasImage && available.length > 0) {
      throw new Error(
        'This step needs a vision-capable provider to read the diagram. Add a key for OpenAI, Anthropic Claude, Gemini, GLM, Qwen, or OpenRouter in Settings → API Keys.'
      )
    }
    throw new Error(
      'No AI providers configured for your account. Add your own API key in Settings → API Keys.'
    )
  }

  const chain = [preferred, ...candidates.filter((p) => p.id !== preferred!.id)]

  const attempts: FallbackAttempt[] = []
  for (const provider of chain) {
    try {
      yield { provider: provider.id, model: sanitizeModelId(options.model) || provider.defaultModel }
      yield* streamProvider(provider, messages, options)
      return
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const attempt: FallbackAttempt = {
        providerId: provider.id,
        label: provider.label,
        quotaExhausted: isQuotaExhaustedError(err),
        message,
      }
      attempts.push(attempt)
      options.onFallback?.(attempt)
    }
  }
  throw new Error(buildAllProvidersFailedMessage(attempts))
}

export async function testProviderConnection(options: {
  providerId?: ProviderId
  custom?: {
    label?: string | null
    baseURL: string
    apiKey: string
    model?: string | null
  }
  apiKey?: string
  model?: string | null
}): Promise<ChatResult> {
  const messages: ChatMessage[] = [
    { role: 'user', content: 'Connection test. Reply with exactly: ok' },
  ]

  if (options.custom) {
    const model =
      sanitizeModelId(options.custom.model) || sanitizeModelId(options.model) || 'gpt-3.5-turbo'
    return postChatCompletions(
      options.custom.label || 'Custom provider',
      options.custom.baseURL,
      splitKeys(options.custom.apiKey),
      model,
      messages,
      { reasoning: false },
      {
        supportsVision: false,
        resultProviderId: 'custom:test',
      }
    )
  }

  const provider = options.providerId ? PROVIDERS[options.providerId] : null
  if (!provider) {
    throw new Error('A valid providerId is required')
  }
  if (!options.apiKey) {
    throw new Error('apiKey is required')
  }
  return callProvider(provider, messages, {
    apiKeyOverride: options.apiKey,
    model: options.model || undefined,
    reasoning: false,
  })
}

/* ------------------------------------------------------------------ */
/* Provider implementations                                            */
/* ------------------------------------------------------------------ */

async function callProvider(
  provider: ProviderConfig,
  messages: ChatMessage[],
  options: ChatOptions
): Promise<ChatResult> {
  if (provider.id === 'glm') {
    return callGLM(messages, options)
  }
  if (provider.id === 'claude') {
    return callClaude(provider, messages, options)
  }
  if (provider.id === 'gemini') {
    return callGemini(provider, messages, options)
  }
  return callOpenAICompatible(provider, messages, options)
}

async function* streamProvider(
  provider: ProviderConfig,
  messages: ChatMessage[],
  options: ChatOptions
): AsyncGenerator<StreamChunk> {
  if (provider.id === 'glm') {
    yield* streamGLM(messages, options)
    return
  }
  if (provider.id === 'claude') {
    yield* streamClaude(provider, messages, options)
    return
  }
  if (provider.id === 'gemini') {
    yield* streamGemini(provider, messages, options)
    return
  }
  yield* streamOpenAICompatible(provider, messages, options)
}

/* ---- GLM via direct HTTP (Z.ai public paas/v4 API) ---- */

/**
 * GLM (Z.ai) via direct HTTP to the public paas/v4 API — OpenAI-compatible
 * chat completions. Rotates across all configured keys on 429 / quota-
 * exhausted responses. Keys resolve to the user's own key first, then the
 * platform's ZAI_API_KEY (which may itself hold several comma-separated
 * keys for rotation).
 */
async function callGLM(
  messages: ChatMessage[],
  options: ChatOptions
): Promise<ChatResult> {
  const provider = PROVIDERS.glm
  const { keys, model } = await resolveProviderKeys(provider, options)
  if (keys.length === 0) throw new Error(`${provider.label} API key not configured`)

  const hasImage = messages.some((m) => m.image)
  const apiMessages = messages.map((m) => {
    if (m.image && hasImage) {
      return {
        role: m.role,
        content: [
          { type: 'text' as const, text: m.content },
          { type: 'image_url' as const, image_url: { url: m.image } },
        ],
      }
    }
    return { role: m.role, content: m.content }
  })

  const body = {
    model,
    messages: apiMessages,
    thinking: options.reasoning ? { type: 'enabled' } : { type: 'disabled' },
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens,
  }

  let lastError: unknown
  for (let i = 0; i < keys.length; i++) {
    try {
      const res = await fetch(`${provider.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${keys[i]}`,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errText = await res.text()
        const err = new Error(`${provider.label} API error ${res.status}: ${errText.slice(0, 200)}`)
        if ((res.status === 429 || isQuotaExhaustedError(err)) && i < keys.length - 1) {
          lastError = err
          continue
        }
        throw err
      }
      const data = await res.json()
      return extractGLMResult(data, 'glm', model)
    } catch (err) {
      lastError = err
      if (i === keys.length - 1) throw err
      if (!isQuotaExhaustedError(err)) throw err
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${provider.label} failed with all configured keys`)
}

function extractGLMResult(res: unknown, provider: string, model: string): ChatResult {
  const r = res as {
    choices?: Array<{
      message?: {
        content?: string
        reasoning_content?: string
        thinking?: string
      }
    }>
  }
  const msg = r.choices?.[0]?.message
  const content = msg?.content ?? ''
  const reasoningRaw = msg?.reasoning_content || msg?.thinking || ''
  const reasoning = reasoningRaw
    ? reasoningRaw.split('\n').filter((l) => l.trim())
    : []
  return { content, reasoning, provider, model }
}

async function* streamGLM(
  messages: ChatMessage[],
  options: ChatOptions
): AsyncGenerator<StreamChunk> {
  const result = await callGLM(messages, options)
  for (const step of result.reasoning) {
    yield { reasoningDelta: step + '\n' }
  }
  const words = result.content.split(' ')
  for (let i = 0; i < words.length; i++) {
    yield { delta: (i > 0 ? ' ' : '') + words[i] }
  }
  yield { delta: '', done: true }
}

/* ---- OpenAI-compatible providers (DeepSeek, OpenAI, Grok, Groq, Qwen, Kimi, custom) ---- */

/**
 * "reasoning: true" means something different per provider/model — this
 * resolves it to the actual model override + extra request-body fields
 * needed, instead of a single generic flag that only ever worked for one
 * provider. Providers not listed here get no extra fields (matching their
 * `supportsReasoning: false`, so requesting reasoning is a harmless no-op
 * rather than sending a param the API doesn't understand).
 */
function reasoningRequestExtras(
  provider: ProviderConfig,
  options: ChatOptions
): { model?: string; extra: Record<string, unknown> } {
  if (!options.reasoning) return { extra: {} }
  switch (provider.id) {
    case 'deepseek':
      // deepseek-chat never returns reasoning_content, no matter what flag
      // is sent; deepseek-reasoner always does, with no extra flag needed.
      // Only override if the caller didn't already pin an explicit model.
      return options.model ? { extra: {} } : { model: 'deepseek-reasoner', extra: {} }
    case 'qwen':
      return { extra: { enable_thinking: true } }
    case 'openrouter':
      return { extra: { reasoning: { max_tokens: 1024 } } }
    default:
      return { extra: {} }
  }
}

/**
 * Low-level OpenAI-compatible `/chat/completions` call, parameterised by
 * label/baseURL/keys/model so it can serve both built-in providers and
 * fully custom user-defined ones.
 */
async function postChatCompletions(
  label: string,
  baseURL: string,
  keys: string[],
  model: string,
  messages: ChatMessage[],
  options: ChatOptions,
  opts: { supportsVision: boolean; extraBody?: Record<string, unknown>; resultProviderId: string }
): Promise<ChatResult> {
  const hasImage = messages.some((m) => m.image)

  const body: Record<string, unknown> = {
    model,
    messages: messages.map((m) => {
      if (m.image && hasImage && opts.supportsVision) {
        return {
          role: m.role,
          content: [
            { type: 'text', text: m.content },
            { type: 'image_url', image_url: { url: m.image } },
          ],
        }
      }
      return { role: m.role, content: m.content }
    }),
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens,
    ...opts.extraBody,
  }

  let lastError: unknown
  for (let i = 0; i < keys.length; i++) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${keys[i]}`,
      }
      if (baseURL.includes('openrouter.ai')) {
        headers['HTTP-Referer'] = 'https://github.com/google-deepmind/antigravity'
        headers['X-Title'] = 'AR2-DDCQG'
      }

      const res = await fetch(chatCompletionsUrl(baseURL), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errText = await res.text()
        const err = new Error(`${label} API error ${res.status}: ${errText.slice(0, 200)}`)
        if ((res.status === 429 || isQuotaExhaustedError(err)) && i < keys.length - 1) {
          lastError = err
          continue
        }
        throw err
      }
      const data = await res.json()
      const msg = data.choices?.[0]?.message
      const content = extractTextContent(msg?.content)
      const reasoningRaw =
        msg?.reasoning_content || msg?.reasoning || msg?.thinking || ''
      const reasoning = reasoningRaw
        ? reasoningRaw.split('\n').filter((l: string) => l.trim())
        : []
      return { content, reasoning, provider: opts.resultProviderId, model }
    } catch (err) {
      lastError = err
      if (i === keys.length - 1) throw err
      if (!isQuotaExhaustedError(err)) throw err
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${label} failed with all configured keys`)
}

async function callOpenAICompatible(
  provider: ProviderConfig,
  messages: ChatMessage[],
  options: ChatOptions
): Promise<ChatResult> {
  const { keys, model } = await resolveProviderKeys(provider, options)
  if (keys.length === 0) throw new Error(`${provider.label} API key not configured`)
  const { model: reasoningModel, extra } = reasoningRequestExtras(provider, options)
  return postChatCompletions(
    provider.label,
    provider.baseURL!,
    keys,
    reasoningModel || model,
    messages,
    options,
    { supportsVision: provider.supportsVision, extraBody: extra, resultProviderId: provider.id }
  )
}

async function callCustomProvider(
  customId: string,
  messages: ChatMessage[],
  options: ChatOptions
): Promise<ChatResult> {
  const row = await loadCustomProvider(options.userId, customId)
  const model = sanitizeModelId(options.model) || sanitizeModelId(row.model) || 'gpt-3.5-turbo'
  const keys = splitKeys(decryptSecret(row.apiKey))
  return postChatCompletions(
    row.label || 'Custom provider',
    row.baseURL!,
    keys,
    model,
    messages,
    options,
    { supportsVision: true, resultProviderId: `${CUSTOM_PROVIDER_PREFIX}${customId}` }
  )
}

async function* streamOpenAICompatible(
  provider: ProviderConfig,
  messages: ChatMessage[],
  options: ChatOptions
): AsyncGenerator<StreamChunk> {
  const { keys, model } = await resolveProviderKeys(provider, options)
  if (keys.length === 0) throw new Error(`${provider.label} API key not configured`)
  const { model: reasoningModel, extra } = reasoningRequestExtras(provider, options)
  yield* streamChatCompletions(
    provider.label,
    provider.baseURL!,
    keys,
    reasoningModel || model,
    messages,
    options,
    { supportsVision: provider.supportsVision, extraBody: extra }
  )
}

async function* streamCustomProvider(
  customId: string,
  messages: ChatMessage[],
  options: ChatOptions
): AsyncGenerator<StreamChunk> {
  const row = await loadCustomProvider(options.userId, customId)
  const model = sanitizeModelId(options.model) || sanitizeModelId(row.model) || 'gpt-3.5-turbo'
  const keys = splitKeys(decryptSecret(row.apiKey))
  yield* streamChatCompletions(row.label || 'Custom provider', row.baseURL!, keys, model, messages, options, {
    supportsVision: true,
  })
}

async function* streamChatCompletions(
  label: string,
  baseURL: string,
  keys: string[],
  model: string,
  messages: ChatMessage[],
  options: ChatOptions,
  opts: { supportsVision: boolean; extraBody?: Record<string, unknown> }
): AsyncGenerator<StreamChunk> {
  const hasImage = messages.some((m) => m.image)

  const body: Record<string, unknown> = {
    model,
    stream: true,
    messages: messages.map((m) => {
      if (m.image && hasImage && opts.supportsVision) {
        return {
          role: m.role,
          content: [
            { type: 'text', text: m.content },
            { type: 'image_url', image_url: { url: m.image } },
          ],
        }
      }
      return { role: m.role, content: m.content }
    }),
    temperature: options.temperature ?? 0.7,
    ...opts.extraBody,
  }

  // Rotate keys only on the initial connection — once bytes start streaming
  // to the caller we can't cleanly restart with a different key.
  let res: Response | undefined
  let lastError: unknown
  for (let i = 0; i < keys.length; i++) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${keys[i]}`,
      }
      if (baseURL.includes('openrouter.ai')) {
        headers['HTTP-Referer'] = 'https://github.com/google-deepmind/antigravity'
        headers['X-Title'] = 'AR2-DDCQG'
      }

      const attempt = await fetch(chatCompletionsUrl(baseURL), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      if (!attempt.ok) {
        const errText = await attempt.text()
        const err = new Error(`${label} stream error ${attempt.status}: ${errText.slice(0, 200)}`)
        if ((attempt.status === 429 || isQuotaExhaustedError(err)) && i < keys.length - 1) {
          lastError = err
          continue
        }
        throw err
      }
      res = attempt
      break
    } catch (err) {
      lastError = err
      if (i === keys.length - 1) throw err
      if (!isQuotaExhaustedError(err)) throw err
    }
  }
  if (!res || !res.body) {
    throw lastError instanceof Error ? lastError : new Error(`${label} stream failed with all configured keys`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue
      const json = trimmed.slice(6)
      if (json === '[DONE]') {
        yield { delta: '', done: true }
        return
      }
      try {
        const chunk = JSON.parse(json)
        const delta = chunk.choices?.[0]?.delta
        if (delta?.content) {
          yield { delta: delta.content }
        }
        if (delta?.reasoning_content || delta?.reasoning) {
          yield { reasoningDelta: delta.reasoning_content || delta.reasoning }
        }
      } catch {
        // skip malformed chunks
      }
    }
  }
  yield { delta: '', done: true }
}

/* ---- Claude (Anthropic Messages API) ---- */

/** Splits a `data:<mime>;base64,<payload>` string into Anthropic's shape. */
function parseDataUrlImage(dataUrl: string): { mediaType: string; data: string } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl)
  return match ? { mediaType: match[1], data: match[2] } : { mediaType: 'image/png', data: dataUrl }
}

/**
 * Anthropic's Messages API takes image + text as separate content blocks,
 * not a plain string — a message with an attached image MUST be converted
 * to this shape or Claude never receives the image at all and silently
 * answers as if it were text-only (this was the actual bug behind the
 * diagram-extraction agent producing garbage/hallucinated output whenever
 * Claude was the active provider: the image was being dropped on the floor
 * before the request ever left the server).
 */
function toClaudeMessage(m: ChatMessage): { role: string; content: unknown } {
  if (m.image) {
    const { mediaType, data } = parseDataUrlImage(m.image)
    return {
      role: m.role,
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
        { type: 'text', text: m.content },
      ],
    }
  }
  return { role: m.role, content: m.content }
}

async function callClaude(
  provider: ProviderConfig,
  messages: ChatMessage[],
  options: ChatOptions
): Promise<ChatResult> {
  const { keys, model } = await resolveProviderKeys(provider, options)
  if (keys.length === 0) throw new Error(`${provider.label} API key not configured`)
  const apiKey = keys[0]

  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n')
  const conv = messages
    .filter((m) => m.role !== 'system')
    .map(toClaudeMessage)

  const body: Record<string, unknown> = {
    model,
    max_tokens: options.maxTokens ?? 4096,
    messages: conv,
  }
  if (system) body.system = system
  if (options.reasoning) {
    body.thinking = { type: 'enabled', budget_tokens: 2000 }
  }

  const res = await fetch(`${provider.baseURL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`${provider.label} error ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }
  const data = await res.json()
  const blocks = data.content || []
  const content = blocks.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('')
  const reasoning = blocks
    .filter((b: { type: string }) => b.type === 'thinking')
    .map((b: { thinking: string }) => b.thinking)
  return { content, reasoning, provider: 'claude', model }
}

/**
 * Claude streaming via the Messages API's native SSE (`stream: true`).
 * Anthropic interleaves distinct content blocks by index — text and
 * thinking blocks are both streamed as `content_block_delta` events, so
 * `delta.type` (`thinking_delta` vs `text_delta`) is what routes each
 * chunk to reasoningDelta vs delta, not which block index it belongs to.
 */
async function* streamClaude(
  provider: ProviderConfig,
  messages: ChatMessage[],
  options: ChatOptions
): AsyncGenerator<StreamChunk> {
  const { keys, model } = await resolveProviderKeys(provider, options)
  if (keys.length === 0) throw new Error(`${provider.label} API key not configured`)
  const apiKey = keys[0]

  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n')
  const conv = messages
    .filter((m) => m.role !== 'system')
    .map(toClaudeMessage)

  const body: Record<string, unknown> = {
    model,
    max_tokens: options.maxTokens ?? 4096,
    messages: conv,
    stream: true,
  }
  if (system) body.system = system
  if (options.reasoning) {
    body.thinking = { type: 'enabled', budget_tokens: 2000 }
  }

  const res = await fetch(`${provider.baseURL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok || !res.body) {
    // Always read the actual response body for the real error text (this
    // was previously backwards — `res.body ? '' : ...` meant the text was
    // read ONLY when there was NO body, i.e. essentially never, since a
    // real HTTP error response almost always has one. Every provider
    // failure surfaced as a blank "stream error 400: " with nothing
    // after the colon, no matter what actually went wrong — wrong API
    // key, disabled API, wrong model, quota, anything. res.text() safely
    // resolves to '' on a genuinely empty/absent body, so there's no
    // downside to always attempting it.)
    const errText = await res.text().catch(() => '')
    throw new Error(`${provider.label} stream error ${res.status}: ${errText.slice(0, 300)}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      const json = trimmed.slice(6)
      if (!json) continue
      let evt: Record<string, unknown>
      try {
        evt = JSON.parse(json)
      } catch {
        continue
      }
      if (evt.type === 'content_block_delta') {
        const delta = evt.delta as { type?: string; text?: string; thinking?: string }
        if (delta?.type === 'thinking_delta' && delta.thinking) {
          yield { reasoningDelta: delta.thinking }
        } else if (delta?.type === 'text_delta' && delta.text) {
          yield { delta: delta.text }
        }
      } else if (evt.type === 'message_stop') {
        yield { delta: '', done: true }
        return
      }
    }
  }
  yield { delta: '', done: true }
}

/* ---- Gemini (Google Generative Language API) ---- */

async function callGemini(
  provider: ProviderConfig,
  messages: ChatMessage[],
  options: ChatOptions
): Promise<ChatResult> {
  const { keys, model } = await resolveProviderKeys(provider, options)
  if (keys.length === 0) throw new Error(`${provider.label} API key not configured`)

  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n')
  const conv = messages.filter((m) => m.role !== 'system')
  const contents = conv.map((m) => {
    const parts: Record<string, unknown>[] = [{ text: m.content }]
    if (m.image) {
      const match = /^data:([^;]+);base64,(.+)$/.exec(m.image)
      if (match) {
        parts.push({ inlineData: { mimeType: match[1], data: match[2] } })
      } else {
        // Not a data: URL — assume it's already a bare base64 payload.
        parts.push({ inlineData: { mimeType: 'image/png', data: m.image } })
      }
    }
    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts,
    }
  })

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 4096,
      ...(options.reasoning ? { thinkingConfig: { includeThoughts: true } } : {}),
    },
  }
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] }
  }

  // Try each configured Gemini key in order. If a key is rate-limited or its
  // quota is exhausted, move to the next one automatically.
  let lastError: unknown
  for (let i = 0; i < keys.length; i++) {
    const apiKey = keys[i]
    const url = `${provider.baseURL}/models/${model}:generateContent?key=${apiKey}`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errText = await res.text()
        const err = new Error(`${provider.label} error ${res.status}: ${errText.slice(0, 200)}`)
        if ((res.status === 429 || isQuotaExhaustedError(err)) && i < keys.length - 1) {
          lastError = err
          continue // try next key
        }
        throw err
      }
      const data = await res.json()
      const candidates = data.candidates || []
      const allParts = candidates.flatMap(
        (c: { content?: { parts?: { text?: string; thought?: boolean }[] } }) =>
          c.content?.parts || []
      )
      const content = allParts
        .filter((p: { thought?: boolean }) => !p.thought)
        .map((p: { text?: string }) => p.text || '')
        .join('')
      const reasoningText = allParts
        .filter((p: { thought?: boolean }) => p.thought)
        .map((p: { text?: string }) => p.text || '')
        .join('\n')
      const reasoning = reasoningText
        ? reasoningText.split('\n').filter((l: string) => l.trim())
        : []
      return { content, reasoning, provider: 'gemini', model }
    } catch (err) {
      lastError = err
      if (i === keys.length - 1) throw err
      if (!isQuotaExhaustedError(err)) throw err
      // otherwise fall through to try the next key
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${provider.label} failed with all configured keys`)
}

/**
 * Gemini streaming via `:streamGenerateContent?alt=sse` — Google's native
 * SSE streaming endpoint. Each event is a partial GenerateContentResponse
 * with the same `parts[].thought` shape as the non-streaming call, so a
 * part is routed to reasoningDelta vs delta purely on that flag.
 */
async function* streamGemini(
  provider: ProviderConfig,
  messages: ChatMessage[],
  options: ChatOptions
): AsyncGenerator<StreamChunk> {
  const { keys, model } = await resolveProviderKeys(provider, options)
  if (keys.length === 0) throw new Error(`${provider.label} API key not configured`)

  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n')
  const conv = messages.filter((m) => m.role !== 'system')
  const contents = conv.map((m) => {
    const parts: Record<string, unknown>[] = [{ text: m.content }]
    if (m.image) {
      const match = /^data:([^;]+);base64,(.+)$/.exec(m.image)
      if (match) {
        parts.push({ inlineData: { mimeType: match[1], data: match[2] } })
      } else {
        parts.push({ inlineData: { mimeType: 'image/png', data: m.image } })
      }
    }
    return { role: m.role === 'assistant' ? 'model' : 'user', parts }
  })

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 4096,
      ...(options.reasoning ? { thinkingConfig: { includeThoughts: true } } : {}),
    },
  }
  if (system) body.systemInstruction = { parts: [{ text: system }] }

  let lastError: unknown
  for (let i = 0; i < keys.length; i++) {
    const apiKey = keys[i]
    const url = `${provider.baseURL}/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch (err) {
      lastError = err
      if (i === keys.length - 1) throw err
      continue
    }
    if (!res.ok || !res.body) {
      // Same fix as streamClaude above — always actually read the body
      // for the real error text instead of the inverted `res.body ? '' : ...`
      // that discarded it whenever a body was present (i.e. almost always).
      const errText = await res.text().catch(() => '')
      const err = new Error(`${provider.label} stream error ${res.status}: ${errText.slice(0, 300)}`)
      if ((res.status === 429 || isQuotaExhaustedError(err)) && i < keys.length - 1) {
        lastError = err
        continue
      }
      throw err
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue
        const json = trimmed.slice(6)
        if (!json) continue
        try {
          const chunk = JSON.parse(json)
          const candidates = chunk.candidates || []
          const parts = candidates.flatMap(
            (c: { content?: { parts?: { text?: string; thought?: boolean }[] } }) =>
              c.content?.parts || []
          )
          for (const p of parts as { text?: string; thought?: boolean }[]) {
            if (!p.text) continue
            if (p.thought) yield { reasoningDelta: p.text }
            else yield { delta: p.text }
          }
        } catch {
          // skip malformed chunk
        }
      }
    }
    yield { delta: '', done: true }
    return
  }
  throw lastError instanceof Error ? lastError : new Error(`${provider.label} stream failed with all configured keys`)
}
