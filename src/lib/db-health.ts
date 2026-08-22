import { db } from '@/lib/db'

let initialized = false

/** SQLite locally (file:), Postgres in production — the pragmas below are
    SQLite-only syntax and throw a hard syntax error against Postgres, so
    this MUST branch rather than assume the local dev database engine. */
function isPostgres(): boolean {
  const url = process.env.DATABASE_URL || ''
  return url.startsWith('postgres://') || url.startsWith('postgresql://')
}

async function withRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation()
    } catch (err) {
      lastError = err
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 75))
      }
    }
  }
  throw lastError
}

export async function initializeDatabaseConnection() {
  if (initialized) return
  await withRetry(async () => {
    await db.$connect()
    if (!isPostgres()) {
      // $queryRawUnsafe, not $executeRawUnsafe: `PRAGMA journal_mode = WAL`
      // returns a row ("wal"), and $executeRawUnsafe rejects any statement
      // that produces results — which made /api/health report 503 locally
      // and left `initialized` permanently false.
      await db.$queryRawUnsafe('PRAGMA foreign_keys = ON')
      await db.$queryRawUnsafe('PRAGMA busy_timeout = 5000')
      await db.$queryRawUnsafe('PRAGMA journal_mode = WAL')
    }
  })
  initialized = true
}

export async function checkDatabaseHealth() {
  const started = Date.now()
  const provider = isPostgres() ? 'postgresql' : 'sqlite'
  try {
    await initializeDatabaseConnection()
    await withRetry(() => db.$queryRaw`SELECT 1`)
    return {
      ok: true,
      latencyMs: Date.now() - started,
      provider,
    }
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      provider,
      error: err instanceof Error ? err.message : 'Database check failed',
    }
  }
}
