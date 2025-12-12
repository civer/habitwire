import { eq, and, gte, lte } from 'drizzle-orm'
import { db } from '@server/database'
import { checkins } from '@server/database/schema'
import { validateQuery, checkinsQuerySchema } from '@server/utils/validation'
import { getHabitOrThrow } from '@server/utils/db-helpers'

defineRouteMeta({
  openAPI: {
    tags: ['Check-ins'],
    summary: 'Get check-ins for a habit',
    description: 'Returns all check-ins for a habit within a date range.',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'from', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
      { name: 'to', in: 'query', required: false, schema: { type: 'string', format: 'date' } }
    ],
    responses: {
      200: { description: 'List of check-ins' },
      401: { description: 'Unauthorized' },
      404: { description: 'Habit not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const { from, to } = validateQuery(event, checkinsQuerySchema)
  const habit = await getHabitOrThrow(event, id)

  let whereClause = eq(checkins.habitId, habit.id)

  if (from) {
    whereClause = and(whereClause, gte(checkins.date, from))!
  }

  if (to) {
    whereClause = and(whereClause, lte(checkins.date, to))!
  }

  const result = await db.query.checkins.findMany({
    where: whereClause,
    orderBy: checkins.date
  })

  return result.map(c => ({
    id: c.id,
    habit_id: c.habitId,
    date: c.date,
    value: c.value,
    skipped: c.skipped,
    skip_reason: c.skipReason,
    notes: c.notes,
    metadata: c.metadata,
    created_at: c.createdAt
  }))
})
