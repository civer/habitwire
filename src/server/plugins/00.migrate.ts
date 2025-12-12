import { sql } from 'drizzle-orm'
import { db } from '@server/database'

/**
 * Run database migrations on app startup
 * Plugin prefix "00." ensures this runs before seed.ts
 *
 * Note: This uses Drizzle's migration journal to track applied migrations.
 * Migration SQL files are bundled as server assets.
 */
export default defineNitroPlugin(async () => {
  // Skip migrations if explicitly disabled
  if (process.env.RUN_MIGRATIONS === 'false') {
    console.log('[migrate] Migrations disabled via RUN_MIGRATIONS=false')
    return
  }

  console.log('[migrate] Checking database migrations...')

  try {
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

    // Get migration files from server assets
    const storage = useStorage('assets:migrations')
    const keys = await storage.getKeys()

    // Filter and sort SQL migration files
    const migrationFiles = keys
      .filter(key => key.endsWith('.sql') && !key.includes('/meta/'))
      .sort()

    let migrationsApplied = 0

    for (const file of migrationFiles) {
      // Create hash from filename (drizzle uses the filename as identifier)
      const hash = file.replace('.sql', '')

      if (appliedHashes.has(hash)) {
        continue // Already applied
      }

      console.log(`[migrate] Applying migration: ${file}`)

      const sqlContent = await storage.getItem(file) as string
      if (!sqlContent) {
        console.warn(`[migrate] Warning: Empty migration file ${file}`)
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
      console.log(`[migrate] Applied ${migrationsApplied} migration(s)`)
    } else {
      console.log('[migrate] Database is up to date')
    }
  } catch (error) {
    console.error('[migrate] Migration failed:', error)
    process.exit(1)
  }
})
