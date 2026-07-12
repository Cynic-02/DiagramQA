import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Serverless functions are short-lived but can run many invocations
 * concurrently. Each one instantiating its own PrismaClient with the
 * default connection pool size can exhaust Neon's connection limit under
 * real concurrent load — a "too many connections" 500 that looks like a
 * random crash, not something that shows up hitting the site alone.
 * connection_limit=1 (each invocation only ever needs one connection at
 * a time) is the standard Prisma-on-serverless-Postgres recommendation.
 * Left untouched for local sqlite dev, where these params are meaningless.
 */
function resolveDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL
  if (!raw) return raw
  if (!raw.startsWith('postgres://') && !raw.startsWith('postgresql://')) return raw
  try {
    const url = new URL(raw)
    if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '1')
    if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', '15')
    return url.toString()
  } catch {
    return raw
  }
}

const resolvedDatabaseUrl = resolveDatabaseUrl()

/**
 * In dev, `globalThis.prisma` is cached across hot reloads so we don't
 * spawn a new PrismaClient on every change. But if the schema has been
 * updated mid-session (e.g. a new model added + `prisma db push` run),
 * the cached client won't know about the new model. Detect that and
 * re-instantiate.
 */
const cached = globalForPrisma.prisma
const hasPasswordReset =
  !!cached &&
  typeof (cached as { passwordReset?: unknown }).passwordReset === 'object'

// Bust the stale cached instance (if any) so we instantiate a fresh one
// from the latest generated Prisma Client.
if (!hasPasswordReset && cached) {
  globalForPrisma.prisma = undefined
}

export const db =
  cached && hasPasswordReset
    ? cached
    : new PrismaClient({
        log: process.env.PRISMA_QUERY_LOG === '1' ? ['query'] : ['warn', 'error'],
        ...(resolvedDatabaseUrl ? { datasources: { db: { url: resolvedDatabaseUrl } } } : {}),
      })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

if (process.env.NODE_ENV !== 'production') {
  db.$connect().catch(() => undefined)
}
