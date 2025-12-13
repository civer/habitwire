import * as schema from './schema'
import type { PgliteDatabase } from 'drizzle-orm/pglite'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

// Union Type: Integration tests use PGlite (in-memory), prod uses node-postgres
// Both have identical .query API, so TypeScript accepts either
type DbInstance = PgliteDatabase<typeof schema> | NodePgDatabase<typeof schema>

// eslint-disable-next-line import/no-mutable-exports
let db: DbInstance

// Check if we're in build phase
const isBuildPhase = process.env.NUXT_BUILD_PHASE === 'true'
  || process.env.NITRO_PRESET === 'node-server'
  || (process.env.NODE_ENV === 'production' && !process.env.DB_HOST)

if (isBuildPhase) {
  // During build, create a dummy instance that will be properly initialized at runtime
  db = {} as DbInstance
} else if (process.env.NODE_ENV === 'test') {
  // Test environment: in-memory PGlite
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const client = new PGlite()
  db = drizzle(client, { schema })
} else {
  // Production/Development: PostgreSQL
  if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    throw new Error('Missing required database environment variables: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD')
  }

  const pg = await import('pg')
  const { drizzle } = await import('drizzle-orm/node-postgres')

  const pool = new pg.default.Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: false
  })

  db = drizzle(pool, { schema })
}

export { db, schema }
