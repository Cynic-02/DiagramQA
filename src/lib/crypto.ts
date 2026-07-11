import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const PREFIX = 'enc:v1:'

function keyMaterial() {
  const secret =
    process.env.API_KEY_ENCRYPTION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET ||
    'ar2-ddcqg-dev-secret-change-in-production'
  return createHash('sha256').update(secret).digest()
}

export function encryptSecret(value: string): string {
  if (value.startsWith(PREFIX)) return value
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyMaterial(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${Buffer.concat([iv, tag, encrypted]).toString('base64url')}`
}

export function decryptSecret(value: string): string {
  if (!value.startsWith(PREFIX)) return value
  const payload = Buffer.from(value.slice(PREFIX.length), 'base64url')
  const iv = payload.subarray(0, 12)
  const tag = payload.subarray(12, 28)
  const encrypted = payload.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', keyMaterial(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null
  const raw = value.startsWith(PREFIX) ? 'encrypted' : value
  if (raw === 'encrypted') return raw
  if (raw.length <= 8) return '*'.repeat(raw.length)
  return `${raw.slice(0, 4)}...${raw.slice(-4)}`
}
