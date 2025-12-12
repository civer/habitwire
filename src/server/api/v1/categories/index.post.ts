import { db } from '@server/database'
import { categories } from '@server/database/schema'
import { createCategorySchema, validateBody } from '@server/utils/validation'

defineRouteMeta({
  openAPI: {
    tags: ['Categories'],
    summary: 'Create a category',
    description: 'Creates a new category for organizing habits.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string' },
              icon: { type: 'string' },
              color: { type: 'string' },
              sort_order: { type: 'integer' }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Created category' },
      400: { description: 'Invalid request' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const body = await validateBody(event, createCategorySchema)

  const result = await db.insert(categories).values({
    userId,
    name: body.name,
    icon: body.icon ?? null,
    color: body.color ?? null,
    sortOrder: body.sort_order
  }).returning()

  const created = result[0]
  if (!created) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create category'
    })
  }

  setResponseStatus(event, 201)
  return {
    id: created.id,
    name: created.name,
    icon: created.icon,
    color: created.color,
    sort_order: created.sortOrder,
    created_at: created.createdAt
  }
})
