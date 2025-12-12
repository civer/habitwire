import { eq, and } from 'drizzle-orm'
import { db } from '@server/database'
import { checkins } from '@server/database/schema'
import { uncheckSchema, validateBody } from '@server/utils/validation'
import { getTodayLocal } from '@server/utils/date'
import { getHabitOrThrow } from '@server/utils/db-helpers'

defineRouteMeta({
  openAPI: {
    tags: ['Check-ins'],
    summary: 'Uncheck a habit',
    description: 'Removes a check-in for a specific date.',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              date: { type: 'string', format: 'date' }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Check-in removed' },
      401: { description: 'Unauthorized' },
      404: { description: 'Habit not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const habitId = getRouterParam(event, 'id')!
  const habit = await getHabitOrThrow(event, habitId)

  const body = await validateBody(event, uncheckSchema)
  const date = body.date || getTodayLocal()

  // Delete checkin for this date
  const deleted = await db.delete(checkins)
    .where(and(
      eq(checkins.habitId, habitId),
      eq(checkins.date, date)
    ))
    .returning()

  return {
    success: true,
    deleted: deleted.length > 0,
    habit_id: habitId,
    date
  }
})
