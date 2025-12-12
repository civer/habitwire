import { eq, and, gte, lte, inArray, asc, desc } from 'drizzle-orm'
import { db } from '@server/database'
import { habits, checkins, users } from '@server/database/schema'
import { calculateCurrentStreak } from '@server/utils/streaks'
import { validateQuery, habitsQuerySchema } from '@server/utils/validation'
import { formatDateLocal } from '@server/utils/date'

defineRouteMeta({
  openAPI: {
    tags: ['Habits'],
    summary: 'Get all active habits',
    description: 'Returns all non-archived habits for the authenticated user with last 7 days of checkins. Optionally filter by category.',
    parameters: [
      {
        name: 'category',
        in: 'query',
        description: 'Filter by category ID',
        required: false,
        schema: { type: 'string', format: 'uuid' }
      }
    ],
    responses: {
      200: { description: 'List of habits with recent checkins' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const { category: categoryId } = validateQuery(event, habitsQuerySchema)

  // Get user settings for streak calculation
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  })
  const skippedBreaksStreak = user?.settings?.skippedBreaksStreak ?? false

  let whereClause = and(eq(habits.userId, userId), eq(habits.archived, false))!
  if (categoryId) {
    whereClause = and(whereClause, eq(habits.categoryId, categoryId))!
  }

  const result = await db.query.habits.findMany({
    where: whereClause,
    orderBy: asc(habits.title),
    with: {
      category: true
    }
  })

  // Calculate date range for last 7 days
  const today = new Date()
  const toDate = formatDateLocal(today)
  const fromDateObj = new Date(today)
  fromDateObj.setDate(fromDateObj.getDate() - 6)
  const fromDate = formatDateLocal(fromDateObj)

  // Fetch checkins for all habits in the last 7 days (for display)
  const habitIds = result.map(h => h.id)
  let recentCheckins: typeof checkins.$inferSelect[] = []

  if (habitIds.length > 0) {
    recentCheckins = await db.select()
      .from(checkins)
      .where(and(
        inArray(checkins.habitId, habitIds),
        gte(checkins.date, fromDate),
        lte(checkins.date, toDate)
      ))
  }

  // Fetch checkins for streak calculation (limited to 30 days for performance)
  // 30 days is sufficient for current streak - if broken for 30+ days, streak is 0
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const streakFromDate = formatDateLocal(thirtyDaysAgo)

  let streakCheckins: { habitId: string, date: string, skipped: boolean | null, value: number | null }[] = []
  if (habitIds.length > 0) {
    streakCheckins = await db.select({
      habitId: checkins.habitId,
      date: checkins.date,
      skipped: checkins.skipped,
      value: checkins.value
    })
      .from(checkins)
      .where(and(
        inArray(checkins.habitId, habitIds),
        gte(checkins.date, streakFromDate)
      ))
      .orderBy(desc(checkins.date))
  }

  // Group checkins by habit ID
  const checkinsByHabit = new Map<string, typeof recentCheckins>()
  for (const checkin of recentCheckins) {
    if (!checkinsByHabit.has(checkin.habitId)) {
      checkinsByHabit.set(checkin.habitId, [])
    }
    checkinsByHabit.get(checkin.habitId)!.push(checkin)
  }

  // Group streak checkins by habit ID for streak calculation
  const streakCheckinsByHabit = new Map<string, { date: string, skipped: boolean, value: number | null }[]>()
  for (const checkin of streakCheckins) {
    if (!streakCheckinsByHabit.has(checkin.habitId)) {
      streakCheckinsByHabit.set(checkin.habitId, [])
    }
    streakCheckinsByHabit.get(checkin.habitId)!.push({
      date: checkin.date,
      skipped: checkin.skipped ?? false,
      value: checkin.value
    })
  }

  return result.map((h) => {
    const habitCheckins = streakCheckinsByHabit.get(h.id) || []
    const currentStreak = calculateCurrentStreak(
      habitCheckins,
      {
        frequencyType: h.frequencyType,
        activeDays: h.activeDays as number[] | null,
        habitType: h.habitType,
        targetValue: h.targetValue,
        createdAt: h.createdAt
      },
      skippedBreaksStreak
    )

    return {
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
      updated_at: h.updatedAt,
      current_streak: currentStreak,
      category: h.category
        ? {
            id: h.category.id,
            name: h.category.name,
            color: h.category.color,
            icon: h.category.icon
          }
        : null,
      recent_checkins: (checkinsByHabit.get(h.id) || []).map(c => ({
        id: c.id,
        date: c.date,
        value: c.value,
        skipped: c.skipped
      }))
    }
  })
})
