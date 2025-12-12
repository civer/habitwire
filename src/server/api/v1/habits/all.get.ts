import { eq, and } from 'drizzle-orm'
import { db } from '@server/database'
import { habits } from '@server/database/schema'
import { validateQuery, habitsQuerySchema } from '@server/utils/validation'

defineRouteMeta({
  openAPI: {
    tags: ['Habits'],
    summary: 'Get all habits (including archived)',
    description: 'Returns all habits including archived ones.',
    parameters: [
      { name: 'category', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } }
    ],
    responses: {
      200: { description: 'List of all habits' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const { category: categoryId } = validateQuery(event, habitsQuerySchema)

  let whereClause = eq(habits.userId, userId)
  if (categoryId) {
    whereClause = and(whereClause, eq(habits.categoryId, categoryId))!
  }

  const result = await db.query.habits.findMany({
    where: whereClause,
    orderBy: habits.sortOrder
  })

  return result.map(h => ({
    id: h.id,
    category_id: h.categoryId,
    title: h.title,
    description: h.description,
    habit_type: h.habitType,
    frequency_type: h.frequencyType,
    frequency_value: h.frequencyValue,
    active_days: h.activeDays,
    time_of_day: h.timeOfDay,
    target_value: h.targetValue,
    default_increment: h.defaultIncrement,
    unit: h.unit,
    color: h.color,
    icon: h.icon,
    sort_order: h.sortOrder,
    archived: h.archived,
    created_at: h.createdAt,
    updated_at: h.updatedAt
  }))
})
