import { db } from '@/lib/db'

let initialized = false

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
    await db.$executeRawUnsafe('PRAGMA foreign_keys = ON')
    await db.$executeRawUnsafe('PRAGMA busy_timeout = 5000')
    await db.$executeRawUnsafe('PRAGMA journal_mode = WAL')
  })
  initialized = true
}

export async function checkDatabaseHealth() {
  const started = Date.now()
  try {
    await initializeDatabaseConnection()
    await withRetry(() => db.$queryRaw`SELECT 1`)
    return {
      ok: true,
      latencyMs: Date.now() - started,
      provider: 'sqlite',
    }
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      provider: 'sqlite',
      error: err instanceof Error ? err.message : 'Database check failed',
    }
  }
}
