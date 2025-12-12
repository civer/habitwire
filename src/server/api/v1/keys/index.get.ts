import { eq } from 'drizzle-orm'
import { db } from '@server/database'
import { apiKeys } from '@server/database/schema'

defineRouteMeta({
  openAPI: {
    tags: ['API Keys'],
    summary: 'List API keys',
    description: 'Returns all API keys for the authenticated user (without the actual key values).',
    responses: {
      200: { description: 'List of API keys' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const userId = event.context.userId

  const result = await db.query.apiKeys.findMany({
    where: eq(apiKeys.userId, userId),
    orderBy: apiKeys.createdAt
  })

  return result.map(k => ({
    id: k.id,
    name: k.name,
    last_used: k.lastUsed,
    created_at: k.createdAt
  }))
})
