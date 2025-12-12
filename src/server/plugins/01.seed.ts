import { eq } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import { db } from '@server/database'
import { users, config } from '@server/database/schema'

const CONFIG_KEY_INITIALIZED = 'system.initialized'

/**
 * Generate a secure random password
 */
function generateSecurePassword(length = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*'
  const bytes = randomBytes(length)
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length]
  }
  return password
}

export default defineNitroPlugin(async () => {
  // Check if system was already initialized
  const initialized = await db.query.config.findFirst({
    where: eq(config.key, CONFIG_KEY_INITIALIZED)
  })

  if (initialized) {
    console.log('[seed] System already initialized, skipping')
    return
  }

  // System not initialized - create initial admin user
  const initialUser = process.env.INITIAL_USER || 'admin'
  let initialPassword = process.env.INITIAL_PASSWORD
  let passwordWasGenerated = false

  // Generate password if not provided
  if (!initialPassword) {
    initialPassword = generateSecurePassword(20)
    passwordWasGenerated = true
  }

  const passwordHash = await hashPassword(initialPassword)

  await db.insert(users).values({
    username: initialUser,
    passwordHash,
    displayName: initialUser
  })

  // Mark system as initialized - this can never be undone via .env manipulation
  await db.insert(config).values({
    key: CONFIG_KEY_INITIALIZED,
    value: 'true'
  })

  // Log credentials - prominently if password was auto-generated
  if (passwordWasGenerated) {
    console.log('')
    console.log('╔════════════════════════════════════════════════════════════════╗')
    console.log('║                    INITIAL ADMIN CREDENTIALS                   ║')
    console.log('╠════════════════════════════════════════════════════════════════╣')
    console.log(`║  Username: ${initialUser.padEnd(52)}║`)
    console.log(`║  Password: ${initialPassword.padEnd(52)}║`)
    console.log('╠════════════════════════════════════════════════════════════════╣')
    console.log('║  ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!  ⚠️   ║')
    console.log('║  This password will NOT be shown again.                        ║')
    console.log('╚════════════════════════════════════════════════════════════════╝')
    console.log('')
  } else {
    console.log(`[seed] Initial user "${initialUser}" created`)
    console.log('[seed] Please change the password after first login!')
  }

  console.log('[seed] System marked as initialized')
})
