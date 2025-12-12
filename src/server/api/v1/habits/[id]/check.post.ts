import { eq, and } from 'drizzle-orm'
import { db } from '@server/database'
import { checkins } from '@server/database/schema'
import { checkinSchema, validateBody } from '@server/utils/validation'
import { getTodayLocal } from '@server/utils/date'
import { getHabitOrThrow } from '@server/utils/db-helpers'

defineRouteMeta({
  openAPI: {
    tags: ['Check-ins'],
    summary: 'Check in a habit',
    description: 'Records a check-in for a habit on a specific date. For TARGET habits, pass a value.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        description: 'Habit ID',
        required: true,
        schema: { type: 'string', format: 'uuid' }
      }
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              date: { type: 'string', format: 'date', description: 'Check-in date (defaults to today)' },
              value: { type: 'number', description: 'Value for TARGET habits' },
              notes: { type: 'string', description: 'Optional notes' }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Check-in recorded' },
      401: { description: 'Unauthorized' },
      404: { description: 'Habit not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const _habit = await getHabitOrThrow(event, id)

  const body = await validateBody(event, checkinSchema)
  const checkDate = body.date || getTodayLocal()

  // Use transaction to prevent race conditions
  const result = await db.transaction(async (tx) => {
    // Check if already checked in for this date
    const existing = await tx.query.checkins.findFirst({
      where: and(eq(checkins.habitId, id), eq(checkins.date, checkDate))
    })

    if (existing) {
      // Update existing checkin
      const updateResult = await tx.update(checkins)
        .set({
          value: body.value ?? existing.value,
          notes: body.notes ?? existing.notes,
          skipped: false,
          skipReason: null,
          metadata: body.metadata ?? existing.metadata
        })
        .where(eq(checkins.id, existing.id))
        .returning()

      return updateResult[0]
    }

    // Create new checkin
    const createResult = await tx.insert(checkins).values({
      habitId: id,
      date: checkDate,
      value: body.value ?? null,
      notes: body.notes ?? null,
      metadata: body.metadata ?? null,
      skipped: false
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
