import { eq, and } from 'drizzle-orm'
import { db } from '@server/database'
import { apiKeys } from '@server/database/schema'
import { validateUuidParam } from '@server/utils/validation'

defineRouteMeta({
  openAPI: {
    tags: ['API Keys'],
    summary: 'Delete an API key',
    description: 'Revokes an API key.',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
    ],
    responses: {
      200: { description: 'API key deleted' },
      401: { description: 'Unauthorized' },
      404: { description: 'API key not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const id = validateUuidParam(getRouterParam(event, 'id'), 'API key ID')

  const existing = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.id, id), eq(apiKeys.userId, userId))
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'API Key not found'
    })
  }

  await db.delete(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))

  return { success: true }
})
