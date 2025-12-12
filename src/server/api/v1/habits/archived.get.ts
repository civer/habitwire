import { eq, and } from 'drizzle-orm'
import { db } from '@server/database'
import { habits } from '@server/database/schema'

defineRouteMeta({
  openAPI: {
    tags: ['Habits'],
    summary: 'Get archived habits',
    description: 'Returns only archived habits.',
    responses: {
      200: { description: 'List of archived habits' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const userId = event.context.userId

  const result = await db.query.habits.findMany({
    where: and(eq(habits.userId, userId), eq(habits.archived, true)),
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
