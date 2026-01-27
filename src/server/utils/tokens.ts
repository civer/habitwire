import { randomBytes, createHash } from 'crypto'

/**
 * Generate a secure random token
 * Returns a URL-safe base64 encoded string
 */
export function generateToken(bytes: number = 32): string {
  return randomBytes(bytes).toString('base64url')
}

/**
 * Hash a token using SHA-256
 * Tokens are stored hashed in the database for security
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Get expiration date for a token
 * @param minutes - Number of minutes until expiration
 */
export function getTokenExpiry(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000)
}

// Token expiration times (in minutes)
export const TOKEN_EXPIRY = {
  MAGIC_LINK: 15, // 15 minutes
  PASSWORD_RESET: 60 // 1 hour
} as const
