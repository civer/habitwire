import { sql } from 'drizzle-orm'
import { db } from '@server/database'

defineRouteMeta({
  openAPI: {
    tags: ['System'],
    summary: 'Health check',
    description: 'Returns the health status of the application. Used by load balancers and container orchestration.',
    responses: {
      200: { description: 'Service is healthy' },
      503: { description: 'Service is unhealthy' }
    }
  }
})

export default defineEventHandler(async () => {
  try {
    // Verify database connection
    await db.execute(sql`SELECT 1`)

    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    }
  } catch {
    throw createError({
      statusCode: 503,
      message: 'Service unavailable'
    })
  }
})
