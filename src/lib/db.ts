import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

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
        log: ['query'],
      })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
