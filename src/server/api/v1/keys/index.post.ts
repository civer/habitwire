import { db } from '@server/database'
import { apiKeys } from '@server/database/schema'
import { generateApiKey, hashApiKey } from '@server/utils/auth'
import { createApiKeySchema, validateBody } from '@server/utils/validation'

defineRouteMeta({
  openAPI: {
    tags: ['API Keys'],
    summary: 'Create an API key',
    description: 'Creates a new API key. The key is only shown once in the response.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string', description: 'A name to identify this key' }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Created API key (includes the raw key - save it now!)' },
      400: { description: 'Invalid request' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const body = await validateBody(event, createApiKeySchema)

  // Generate new API key
  const rawKey = `hw_${generateApiKey()}`
  const keyHash = hashApiKey(rawKey)

  const result = await db.insert(apiKeys).values({
    userId,
    name: body.name,
    keyHash
  }).returning()

  const created = result[0]
  if (!created) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create API key'
    })
  }

  // Return the raw key only once - it cannot be retrieved later
  setResponseStatus(event, 201)
  return {
    id: created.id,
    name: created.name,
    key: rawKey,
    created_at: created.createdAt
  }
})
