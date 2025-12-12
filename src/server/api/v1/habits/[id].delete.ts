import { eq } from 'drizzle-orm'
import { db } from '@server/database'
import { habits } from '@server/database/schema'
import { getHabitOrThrow } from '@server/utils/db-helpers'

defineRouteMeta({
  openAPI: {
    tags: ['Habits'],
    summary: 'Delete a habit',
    description: 'Soft-deletes a habit by archiving it.',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
    ],
    responses: {
      200: { description: 'Habit archived' },
      401: { description: 'Unauthorized' },
      404: { description: 'Habit not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const habit = await getHabitOrThrow(event, id)

  // Soft delete - just archive
  await db.update(habits)
    .set({ archived: true, updatedAt: new Date() })
    .where(eq(habits.id, habit.id))

  return { success: true }
})
