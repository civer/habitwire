import { eq, and } from 'drizzle-orm'
import { db } from '@server/database'
import { checkins } from '@server/database/schema'
import { skipSchema, validateBody } from '@server/utils/validation'
import { getTodayLocal } from '@server/utils/date'
import { getHabitOrThrow } from '@server/utils/db-helpers'

defineRouteMeta({
  openAPI: {
    tags: ['Check-ins'],
    summary: 'Skip a habit',
    description: 'Marks a habit as skipped for a specific date.',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              date: { type: 'string', format: 'date' },
              reason: { type: 'string' }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Habit skipped' },
      401: { description: 'Unauthorized' },
      404: { description: 'Habit not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await getHabitOrThrow(event, id) // Validate habit exists

  const body = await validateBody(event, skipSchema)
  const checkDate = body.date || getTodayLocal()

  // Use transaction to prevent race conditions
  const result = await db.transaction(async (tx) => {
    // Check if already exists for this date
    const existing = await tx.query.checkins.findFirst({
      where: and(eq(checkins.habitId, id), eq(checkins.date, checkDate))
    })

    if (existing) {
      // Update existing to skipped
      const updateResult = await tx.update(checkins)
        .set({
          skipped: true,
          skipReason: body.reason ?? null,
          value: null,
          notes: null
        })
        .where(eq(checkins.id, existing.id))
        .returning()

      return updateResult[0]
    }

    // Create new skipped checkin
    const createResult = await tx.insert(checkins).values({
      habitId: id,
      date: checkDate,
      skipped: true,
      skipReason: body.reason ?? null
    }).returning()

    return createResult[0]
  })

  if (!result) {
    throw createError({
      statusCode: 500,
      message: 'Failed to save checkin'
    })
  }

  return {
    id: result.id,
    habit_id: result.habitId,
    date: result.date,
    value: result.value,
    skipped: result.skipped,
    skip_reason: result.skipReason,
    notes: result.notes,
    metadata: result.metadata,
    created_at: result.createdAt
  }
})
