import { eq, and } from 'drizzle-orm'
import { db } from '@server/database'
import { habits } from '@server/database/schema'
import { updateHabitSchema, validateBody } from '@server/utils/validation'
import { getHabitOrThrow, validateCategoryOwnership } from '@server/utils/db-helpers'
import { mapHabitToResponse } from '@server/utils/response-mappers'

defineRouteMeta({
  openAPI: {
    tags: ['Habits'],
    summary: 'Update a habit',
    description: 'Updates an existing habit.',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
    ],
    responses: {
      200: { description: 'Updated habit' },
      401: { description: 'Unauthorized' },
      404: { description: 'Habit not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const id = getRouterParam(event, 'id')!

  const existing = await getHabitOrThrow(event, id)
  const body = await validateBody(event, updateHabitSchema)

  // Validate category ownership if changing category
  if (body.category_id !== undefined) {
    await validateCategoryOwnership(event, body.category_id)
  }

  const result = await db.update(habits)
    .set({
      categoryId: body.category_id ?? existing.categoryId,
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      habitType: body.habit_type ?? existing.habitType,
      frequencyType: body.frequency_type ?? existing.frequencyType,
      frequencyValue: body.frequency_value ?? existing.frequencyValue,
      frequencyPeriod: body.frequency_period ?? existing.frequencyPeriod,
      activeDays: body.active_days ?? existing.activeDays,
      timeOfDay: body.time_of_day ?? existing.timeOfDay,
      targetValue: body.target_value ?? existing.targetValue,
      defaultIncrement: body.default_increment ?? existing.defaultIncrement,
      unit: body.unit ?? existing.unit,
      color: body.color ?? existing.color,
      icon: body.icon ?? existing.icon,
      sortOrder: body.sort_order ?? existing.sortOrder,
      archived: body.archived ?? existing.archived,
      promptForNotes: body.prompt_for_notes ?? existing.promptForNotes,
      updatedAt: new Date()
    })
    .where(and(eq(habits.id, id), eq(habits.userId, userId)))
    .returning()

  const updated = result[0]
  if (!updated) {
    throw createError({
      statusCode: 500,
      message: 'Failed to update habit'
    })
  }

  return mapHabitToResponse(updated)
})
