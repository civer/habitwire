import { eq, and } from 'drizzle-orm'
import { db } from '@server/database'
import { habits } from '@server/database/schema'
import { validateQuery, habitsQuerySchema } from '@server/utils/validation'
import { mapHabitToResponse } from '@server/utils/response-mappers'

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

  return result.map(mapHabitToResponse)
})
