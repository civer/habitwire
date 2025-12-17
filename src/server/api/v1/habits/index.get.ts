import { eq, and, gte, lte, inArray, desc } from 'drizzle-orm'
import { db } from '@server/database'
import { habits, checkins, users } from '@server/database/schema'
import { calculateCurrentStreak } from '@server/utils/streaks'
import { validateQuery, habitsQuerySchema } from '@server/utils/validation'
import { formatDateLocal, parseLocalDate } from '@server/utils/date'

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
      },
      {
        name: 'today',
        in: 'query',
        description: 'Client\'s current date (YYYY-MM-DD) for timezone-aware streak calculation',
        required: false,
        schema: { type: 'string', format: 'date' }
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
  const { category: categoryId, today: clientToday } = validateQuery(event, habitsQuerySchema)

  // Get user settings for streak calculation and display
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  })
  const skippedBreaksStreak = user?.settings?.skippedBreaksStreak ?? false
  const desktopDaysToShow = user?.settings?.desktopDaysToShow ?? 14

  let whereClause = and(eq(habits.userId, userId), eq(habits.archived, false))!
  if (categoryId) {
    whereClause = and(whereClause, eq(habits.categoryId, categoryId))!
  }

  const result = await db.query.habits.findMany({
    where: whereClause,
    orderBy: habits.sortOrder,
    with: {
      category: true
    }
  })

  // Use client's "today" if provided (for timezone handling), otherwise server's local time
  const today = clientToday ? parseLocalDate(clientToday) : new Date()
  today.setHours(12, 0, 0, 0)
  const toDate = formatDateLocal(today)
  const fromDateObj = new Date(today)
  fromDateObj.setDate(fromDateObj.getDate() - (desktopDaysToShow - 1))
  const fromDate = formatDateLocal(fromDateObj)

  // Fetch checkins for all habits (for display)
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

  // Fetch checkins for streak calculation (120 days for monthly habits)
  // 120 days covers ~4 months for monthly custom habits
  const streakDaysBack = new Date()
  streakDaysBack.setDate(streakDaysBack.getDate() - 120)
  const streakFromDate = formatDateLocal(streakDaysBack)

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
        frequencyValue: h.frequencyValue,
        frequencyPeriod: h.frequencyPeriod,
        activeDays: h.activeDays,
        habitType: h.habitType,
        targetValue: h.targetValue,
        createdAt: h.createdAt
      },
      skippedBreaksStreak,
      clientToday
    )

    return {
      id: h.id,
      category_id: h.categoryId,
      title: h.title,
      description: h.description,
      habit_type: h.habitType,
      frequency_type: h.frequencyType,
      frequency_value: h.frequencyValue,
      frequency_period: h.frequencyPeriod,
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
      prompt_for_notes: h.promptForNotes,
      recent_checkins: (checkinsByHabit.get(h.id) || []).map(c => ({
        id: c.id,
        date: c.date,
        value: c.value,
        skipped: c.skipped,
        notes: c.notes
      }))
    }
  })
})
