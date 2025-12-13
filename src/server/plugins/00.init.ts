import { sql, eq } from 'drizzle-orm'
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

/**
 * Run database migrations
 */
async function runMigrations(): Promise<void> {
  // Skip migrations if explicitly disabled
  if (process.env.RUN_MIGRATIONS === 'false') {
    console.log('[init] Migrations disabled via RUN_MIGRATIONS=false')
    return
  }

  console.log('[init] Checking database migrations...')

  // Ensure drizzle migrations table exists
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL,
      created_at BIGINT
    )
  `)

  // Get list of applied migrations
  const applied = await db.execute(sql`SELECT hash FROM "__drizzle_migrations"`)
  const appliedHashes = new Set((applied.rows as { hash: string }[]).map(r => r.hash))

  // Get migration files from server assets (standard location: server/assets/)
  const storage = useStorage('assets:server')
  const keys = await storage.getKeys('migrations')

  // Filter and sort SQL migration files (keys have 'migrations:' prefix)
  const migrationFiles = keys
    .filter(key => key.endsWith('.sql') && !key.includes(':meta:'))
    .sort()

  if (migrationFiles.length === 0) {
    console.log('[init] No migration files found in assets')
    return
  }

  let migrationsApplied = 0

  for (const file of migrationFiles) {
    // Create hash from filename (drizzle uses the filename as identifier)
    // Keys are like 'migrations:0000_damp_white_tiger.sql', extract just the filename
    const filename = file.split(':').pop() || file
    const hash = filename.replace('.sql', '')

    if (appliedHashes.has(hash)) {
      continue // Already applied
    }

    console.log(`[init] Applying migration: ${filename}`)

    const sqlContent = await storage.getItem(file) as string
    if (!sqlContent) {
      console.warn(`[init] Warning: Empty migration file ${file}`)
      continue
    }

    // Split by statement breakpoint marker and execute each statement
    const statements = sqlContent
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    for (const statement of statements) {
      await db.execute(sql.raw(statement))
    }

    // Record migration as applied
    await db.execute(sql`
      INSERT INTO "__drizzle_migrations" (hash, created_at)
      VALUES (${hash}, ${Date.now()})
    `)

    migrationsApplied++
  }

  if (migrationsApplied > 0) {
    console.log(`[init] Applied ${migrationsApplied} migration(s)`)
  } else {
    console.log('[init] Database is up to date')
  }
}

/**
 * Seed initial admin user if not already initialized
 */
async function seedInitialUser(): Promise<void> {
  // Check if system was already initialized
  const initialized = await db.query.config.findFirst({
    where: eq(config.key, CONFIG_KEY_INITIALIZED)
  })

  if (initialized) {
    console.log('[init] System already initialized, skipping seed')
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
    console.log(`[init] Initial user "${initialUser}" created`)
    console.log('[init] Please change the password after first login!')
  }

  console.log('[init] System marked as initialized')
}

/**
 * Database initialization plugin
 * Runs migrations first, then seeds initial user if needed
 */
export default defineNitroPlugin(async () => {
  // Skip during build/prerender phase
  if (process.env.NUXT_BUILD_PHASE === 'true' || import.meta.prerender) {
    return
  }

  try {
    // Step 1: Run migrations
    await runMigrations()

    // Step 2: Seed initial user (only after migrations complete)
    await seedInitialUser()
  } catch (error) {
    console.error('[init] Database initialization failed:', error)
    process.exit(1)
  }
})
