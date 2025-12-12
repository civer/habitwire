import { beforeAll, afterEach } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '@server/database'
import * as schema from '@server/database/schema'

// Push schema to PGlite before tests
beforeAll(async () => {
  const { createRequire } = await import('node:module')
  const require = createRequire(import.meta.url)
  const { pushSchema } = require('drizzle-kit/api') as typeof import('drizzle-kit/api')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { apply } = await pushSchema(schema, db as any)
  await apply()
})

// Reset database between tests
afterEach(async () => {
  // Truncate all tables (order matters due to foreign keys)
  await db.execute(sql`TRUNCATE TABLE checkins CASCADE`)
  await db.execute(sql`TRUNCATE TABLE habits CASCADE`)
  await db.execute(sql`TRUNCATE TABLE categories CASCADE`)
  await db.execute(sql`TRUNCATE TABLE api_keys CASCADE`)
  await db.execute(sql`TRUNCATE TABLE users CASCADE`)
  await db.execute(sql`TRUNCATE TABLE config CASCADE`)
})

export { db, schema }
