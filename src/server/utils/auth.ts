import { randomBytes, createHash } from 'crypto'

// hashPassword and verifyPassword are auto-imported from nuxt-auth-utils
// Use them directly without importing

export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex')
}

export function generateApiKey(): string {
  return randomBytes(32).toString('base64url')
}
