import { eq } from 'drizzle-orm'
import { db } from '@server/database'
import { categories } from '@server/database/schema'
import { updateCategorySchema, validateBody } from '@server/utils/validation'
import { getCategoryOrThrow } from '@server/utils/db-helpers'

defineRouteMeta({
  openAPI: {
    tags: ['Categories'],
    summary: 'Update a category',
    description: 'Updates an existing category.',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
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
      200: { description: 'Updated category' },
      401: { description: 'Unauthorized' },
      404: { description: 'Category not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const existing = await getCategoryOrThrow(event, id)
  const body = await validateBody(event, updateCategorySchema)

  const result = await db.update(categories)
    .set({
      name: body.name ?? existing.name,
      icon: body.icon ?? existing.icon,
      color: body.color ?? existing.color,
      sortOrder: body.sort_order ?? existing.sortOrder
    })
    .where(eq(categories.id, existing.id))
    .returning()

  const updated = result[0]
  if (!updated) {
    throw createError({
      statusCode: 500,
      message: 'Failed to update category'
    })
  }

  return {
    id: updated.id,
    name: updated.name,
    icon: updated.icon,
    color: updated.color,
    sort_order: updated.sortOrder,
    created_at: updated.createdAt
  }
})
