import { eq, and, inArray } from 'drizzle-orm'
import { db } from '@server/database'
import { habits } from '@server/database/schema'
import { validateBody, reorderSchema } from '@server/utils/validation'

defineRouteMeta({
  openAPI: {
    tags: ['Habits'],
    summary: 'Reorder habits',
    description: 'Update the sort order of multiple habits at once. The order of IDs in the array determines the new sort order.',
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
                description: 'Array of habit IDs in desired order'
              }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Habits reordered successfully' },
      400: { description: 'Invalid request' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const body = await validateBody(event, reorderSchema)

  // Verify all habits belong to user
  const userHabits = await db.select({ id: habits.id })
    .from(habits)
    .where(and(
      eq(habits.userId, userId),
      inArray(habits.id, body.ids)
    ))

  const userHabitIds = new Set(userHabits.map(h => h.id))
  const invalidIds = body.ids.filter(id => !userHabitIds.has(id))

  if (invalidIds.length > 0) {
    throw createError({
      statusCode: 400,
      message: `Invalid habit IDs: ${invalidIds.join(', ')}`
    })
  }

  // Update sort order for each habit
  await Promise.all(
    body.ids.map((id, index) =>
      db.update(habits)
        .set({ sortOrder: index })
        .where(eq(habits.id, id))
    )
  )

  return { success: true }
})
