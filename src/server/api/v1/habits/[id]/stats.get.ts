import { eq, desc } from 'drizzle-orm'
import { db } from '@server/database'
import { checkins, users } from '@server/database/schema'
import { calculateStreakStats } from '@server/utils/streaks'
import { getHabitOrThrow } from '@server/utils/db-helpers'

defineRouteMeta({
  openAPI: {
    tags: ['Habits'],
    summary: 'Get habit statistics',
    description: 'Returns statistics for a habit including current streak, longest streak, and completion rate.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        description: 'Habit ID',
        required: true,
        schema: { type: 'string', format: 'uuid' }
      }
    ],
    responses: {
      200: { description: 'Habit statistics' },
      401: { description: 'Unauthorized' },
      404: { description: 'Habit not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const id = getRouterParam(event, 'id')!
  const habit = await getHabitOrThrow(event, id)

  // Get user settings
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  })

  const skippedBreaksStreak = user?.settings?.skippedBreaksStreak ?? false

  // Get all checkins for this habit
  const allCheckins = await db.select({
    date: checkins.date,
    skipped: checkins.skipped,
    value: checkins.value,
    notes: checkins.notes
  })
    .from(checkins)
    .where(eq(checkins.habitId, id))
    .orderBy(desc(checkins.date))

  const stats = calculateStreakStats(
    allCheckins.map(c => ({
      date: c.date,
      skipped: c.skipped ?? false,
      value: c.value
    })),
    {
      frequencyType: habit.frequencyType,
      frequencyValue: habit.frequencyValue,
      activeDays: habit.activeDays,
      habitType: habit.habitType,
      targetValue: habit.targetValue,
      createdAt: habit.createdAt
    },
    skippedBreaksStreak
  )

  return {
    habit_id: id,
    current_streak: stats.currentStreak,
    longest_streak: stats.longestStreak,
    completion_rate: stats.completionRate,
    total_checkins: stats.totalCheckins,
    total_expected_days: stats.totalExpectedDays,
    checkins: allCheckins.map(c => ({
      date: c.date,
      value: c.value,
      skipped: c.skipped ?? false,
      notes: c.notes
    }))
  }
})
