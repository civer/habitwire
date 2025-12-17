import { eq, and, inArray } from 'drizzle-orm'
import { db } from '@server/database'
import { categories } from '@server/database/schema'
import { validateBody, reorderSchema } from '@server/utils/validation'

defineRouteMeta({
  openAPI: {
    tags: ['Categories'],
    summary: 'Reorder categories',
    description: 'Update the sort order of multiple categories at once. The order of IDs in the array determines the new sort order.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['ids'],
            properties: {
              ids: {
                type: 'array',
                items: { type: 'string', format: 'uuid' },
                description: 'Array of category IDs in desired order'
              }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Categories reordered successfully' },
      400: { description: 'Invalid request' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const body = await validateBody(event, reorderSchema)

  // Verify all categories belong to user
  const userCategories = await db.select({ id: categories.id })
    .from(categories)
    .where(and(
      eq(categories.userId, userId),
      inArray(categories.id, body.ids)
    ))

  const userCategoryIds = new Set(userCategories.map(c => c.id))
  const invalidIds = body.ids.filter(id => !userCategoryIds.has(id))

  if (invalidIds.length > 0) {
    throw createError({
      statusCode: 400,
      message: `Invalid category IDs: ${invalidIds.join(', ')}`
    })
  }

  // Update sort order for each category
  await Promise.all(
    body.ids.map((id, index) =>
      db.update(categories)
        .set({ sortOrder: index })
        .where(eq(categories.id, id))
    )
  )

  return { success: true }
})
