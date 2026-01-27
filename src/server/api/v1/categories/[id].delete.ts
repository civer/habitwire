import { eq } from 'drizzle-orm'
import { db } from '@server/database'
import { categories } from '@server/database/schema'
import { getCategoryOrThrow } from '@server/utils/db-helpers'
import { validateUuidParam } from '@server/utils/validation'

defineRouteMeta({
  openAPI: {
    tags: ['Categories'],
    summary: 'Delete a category',
    description: 'Deletes a category. Habits in this category will have their category set to null.',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
    ],
    responses: {
      200: { description: 'Category deleted' },
      401: { description: 'Unauthorized' },
      404: { description: 'Category not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const id = validateUuidParam(getRouterParam(event, 'id'), 'category ID')
  const category = await getCategoryOrThrow(event, id)

  await db.delete(categories)
    .where(eq(categories.id, category.id))

  return { success: true }
})
