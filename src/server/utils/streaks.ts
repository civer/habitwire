import { formatDateLocal, parseLocalDate } from './date'

/**
 * Safely parse a string to number, returning 0 for invalid values
 */
function safeParseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  const num = typeof value === 'number' ? value : parseFloat(value)
  return isNaN(num) ? 0 : num
}

export interface Checkin {
  date: string
  skipped: boolean
  value: number | null
}

export interface HabitConfig {
  frequencyType: string
  frequencyValue: number | null // For CUSTOM: times per period needed
  frequencyPeriod: string | null // 'week' or 'month' (for CUSTOM type)
  activeDays: number[] | null
  habitType: string
  targetValue: number | null
  createdAt: Date | null
  weekStartsOn?: 0 | 1 // 0 = Sunday, 1 = Monday (default)
}

export interface StreakResult {
  currentStreak: number
  longestStreak: number
  completionRate: number
  totalCheckins: number
  totalExpectedDays: number
}

/**
 * Check if a checkin counts as actually completed (for streak counting)
 * Skips are never counted as completed - they just don't break the streak
 */
function isActuallyCompleted(
  checkin: { skipped: boolean, value: number | null } | undefined,
  habitType: string,
  targetValue: number | null
): boolean {
  if (!checkin) return false
  if (checkin.skipped) return false // Skips don't count as completed

  // Only check target value for TARGET habits
  if (habitType === 'TARGET' && targetValue) {
    const targetVal = safeParseNumber(targetValue)
    const checkinVal = safeParseNumber(checkin.value)
    return checkinVal >= targetVal
  }

  return true
}

/**
 * Check if a skipped checkin should be treated as "not breaking" the streak
 */
function isSkipPreservingStreak(
  checkin: { skipped: boolean, value: number | null } | undefined,
  skippedBreaksStreak: boolean
): boolean {
  if (!checkin) return false
  return checkin.skipped && !skippedBreaksStreak
}

/**
 * Get the start of the month for a given date
 */
function getMonthStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(12, 0, 0, 0)
  d.setDate(1)
  return d
}

/**
 * Get the start of the week (Monday or Sunday) for a given date
 */
function getWeekStart(date: Date, weekStartsOn: 0 | 1 = 1): Date {
  const d = new Date(date)
  d.setHours(12, 0, 0, 0)
  const day = d.getDay()

  if (weekStartsOn === 1) {
    // Monday start: shift Sunday (0) to end of week
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
  } else {
    // Sunday start
    d.setDate(d.getDate() - day)
  }

  return d
}

/**
 * Get all active days within a specific week
 */
function getActiveDaysInWeek(weekStart: Date, activeDays: number[]): Date[] {
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    d.setHours(12, 0, 0, 0)
    if (activeDays.includes(d.getDay())) {
      days.push(d)
    }
  }
  return days
}

type WeekStatus = 'completed' | 'incomplete' | 'grace'

/**
 * Get week status for CUSTOM habits (X times per week, any day)
 */
function getCustomWeekStatus(
  weekStart: Date,
  frequencyValue: number,
  checkinMap: Map<string, { skipped: boolean, value: number | null }>,
  today: Date,
  habitType: string,
  targetValue: number | null
): WeekStatus {
  const todayStr = formatDateLocal(today)
  let completedCount = 0

  // Check all 7 days of the week
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    d.setHours(12, 0, 0, 0)
    const dayStr = formatDateLocal(d)

    // Skip future days
    if (dayStr > todayStr) continue

    const checkin = checkinMap.get(dayStr)
    if (isActuallyCompleted(checkin, habitType, targetValue)) {
      completedCount++
    }
  }

  // Check if we've met the required frequency
  if (completedCount >= frequencyValue) {
    return 'completed'
  }

  // Check if there are still future days in this week (grace period)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekEndStr = formatDateLocal(weekEnd)

  if (todayStr < weekEndStr) {
    // Still have days left this week - grace period
    return 'grace'
  }

  return 'incomplete'
}

/**
 * Get month status for CUSTOM habits (X times per month, any day)
 */
function getCustomMonthStatus(
  monthStart: Date,
  frequencyValue: number,
  checkinMap: Map<string, { skipped: boolean, value: number | null }>,
  today: Date,
  habitType: string,
  targetValue: number | null
): WeekStatus {
  const todayStr = formatDateLocal(today)
  let completedCount = 0

  // Get the last day of this month
  const monthEnd = new Date(monthStart)
  monthEnd.setMonth(monthEnd.getMonth() + 1)
  monthEnd.setDate(0) // Last day of the month
  const daysInMonth = monthEnd.getDate()

  // Check all days of the month
  for (let i = 0; i < daysInMonth; i++) {
    const d = new Date(monthStart)
    d.setDate(d.getDate() + i)
    d.setHours(12, 0, 0, 0)
    const dayStr = formatDateLocal(d)

    // Skip future days
    if (dayStr > todayStr) continue

    const checkin = checkinMap.get(dayStr)
    if (isActuallyCompleted(checkin, habitType, targetValue)) {
      completedCount++
    }
  }

  // Check if we've met the required frequency
  if (completedCount >= frequencyValue) {
    return 'completed'
  }

  // Check if there are still future days in this month (grace period)
  const monthEndStr = formatDateLocal(monthEnd)

  if (todayStr < monthEndStr) {
    // Still have days left this month - grace period
    return 'grace'
  }

  return 'incomplete'
}

/**
 * Check if a week is completed, incomplete, or in grace period (for WEEKLY habits)
 */
function getWeekStatus(
  weekStart: Date,
  activeDays: number[],
  checkinMap: Map<string, { skipped: boolean, value: number | null }>,
  today: Date,
  habitType: string,
  targetValue: number | null,
  skippedBreaksStreak: boolean
): WeekStatus {
  const activeDaysInWeek = getActiveDaysInWeek(weekStart, activeDays)

  if (activeDaysInWeek.length === 0) {
    return 'completed' // No active days in this week = automatically completed
  }

  let allPastDaysOk = true // completed or skip-preserved
  let hasGrace = false

  const todayStr = formatDateLocal(today)

  for (const day of activeDaysInWeek) {
    const dayStr = formatDateLocal(day)
    const checkin = checkinMap.get(dayStr)

    if (dayStr > todayStr) {
      // Day is in the future - grace period
      hasGrace = true
    } else if (dayStr === todayStr) {
      // Today - check if completed or skip-preserved, otherwise grace
      const isOk = isActuallyCompleted(checkin, habitType, targetValue)
        || isSkipPreservingStreak(checkin, skippedBreaksStreak)
      if (!isOk) {
        hasGrace = true
      }
    } else {
      // Past day - must be completed OR skip-preserved
      const isOk = isActuallyCompleted(checkin, habitType, targetValue)
        || isSkipPreservingStreak(checkin, skippedBreaksStreak)
      if (!isOk) {
        allPastDaysOk = false
      }
    }
  }

  if (!allPastDaysOk) return 'incomplete'
  if (hasGrace) return 'grace'
  return 'completed'
}

/**
 * Calculate current streak for a DAILY habit (counts days)
 */
function calculateDailyStreak(
  checkinMap: Map<string, { skipped: boolean, value: number | null }>,
  habit: HabitConfig,
  skippedBreaksStreak: boolean,
  today: Date
): number {
  const todayStr = formatDateLocal(today)
  let currentStreak = 0
  const currentDate = new Date(today)

  for (let i = 0; i < 365; i++) {
    const dateStr = formatDateLocal(currentDate)
    const checkin = checkinMap.get(dateStr)

    // Check if this is a skip that preserves the streak (but doesn't count)
    if (isSkipPreservingStreak(checkin, skippedBreaksStreak)) {
      // Skip preserves streak but doesn't count toward it - continue to previous day
      currentDate.setDate(currentDate.getDate() - 1)
      continue
    }

    if (isActuallyCompleted(checkin, habit.habitType, habit.targetValue)) {
      currentStreak++
    } else {
      // Grace period for today only
      if (dateStr === todayStr) {
        // Today not completed yet - continue checking yesterday
      } else {
        // Past day not completed (or skip that breaks streak) - streak is broken
        break
      }
    }

    currentDate.setDate(currentDate.getDate() - 1)
  }

  return currentStreak
}

/**
 * Calculate current streak for WEEKLY/CUSTOM habits (counts weeks or months)
 */
function calculateWeeklyStreak(
  checkinMap: Map<string, { skipped: boolean, value: number | null }>,
  habit: HabitConfig,
  skippedBreaksStreak: boolean,
  today: Date
): number {
  const weekStartsOn = habit.weekStartsOn ?? 1
  const isCustom = habit.frequencyType === 'CUSTOM'
  const frequencyValue = habit.frequencyValue ?? 1
  const isMonthly = isCustom && habit.frequencyPeriod === 'month'

  // For WEEKLY, we need activeDays
  if (!isCustom) {
    const activeDays = habit.activeDays || []
    if (activeDays.length === 0) {
      return 0
    }
  }

  let currentStreak = 0

  // Monthly CUSTOM: iterate months
  if (isMonthly) {
    const currentMonthStart = getMonthStart(today)

    for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
      const monthStart = new Date(currentMonthStart)
      monthStart.setMonth(monthStart.getMonth() - monthOffset)

      const status = getCustomMonthStatus(
        monthStart,
        frequencyValue,
        checkinMap,
        today,
        habit.habitType,
        habit.targetValue
      )

      if (status === 'completed') {
        currentStreak++
      } else if (status === 'grace') {
        continue
      } else {
        break
      }
    }

    return currentStreak
  }

  // Weekly: iterate weeks
  const currentWeekStart = getWeekStart(today, weekStartsOn)

  // Check up to 52 weeks back
  for (let weekOffset = 0; weekOffset < 52; weekOffset++) {
    const weekStart = new Date(currentWeekStart)
    weekStart.setDate(weekStart.getDate() - weekOffset * 7)

    let status: WeekStatus

    if (isCustom) {
      // CUSTOM: X times per week, any day
      status = getCustomWeekStatus(
        weekStart,
        frequencyValue,
        checkinMap,
        today,
        habit.habitType,
        habit.targetValue
      )
    } else {
      // WEEKLY: specific days must be completed
      status = getWeekStatus(
        weekStart,
        habit.activeDays || [],
        checkinMap,
        today,
        habit.habitType,
        habit.targetValue,
        skippedBreaksStreak
      )
    }

    if (status === 'completed') {
      currentStreak++
    } else if (status === 'grace') {
      // Grace: week not finished yet, but on track - don't break, don't count
      continue
    } else {
      break
    }
  }

  return currentStreak
}

/**
 * Calculate current streak for a habit (used in dashboard list)
 * @param todayStr - Optional "today" date string (YYYY-MM-DD) from client for timezone handling
 */
export function calculateCurrentStreak(
  allCheckins: Checkin[],
  habit: HabitConfig,
  skippedBreaksStreak: boolean,
  todayStr?: string
): number {
  if (allCheckins.length === 0) return 0

  const today = todayStr ? parseLocalDate(todayStr) : new Date()
  today.setHours(12, 0, 0, 0)

  // Build a map of checkins by date
  const checkinMap = new Map<string, { skipped: boolean, value: number | null }>()
  for (const c of allCheckins) {
    checkinMap.set(c.date, { skipped: c.skipped, value: c.value })
  }

  // DAILY habits: count days
  if (habit.frequencyType === 'DAILY') {
    return calculateDailyStreak(checkinMap, habit, skippedBreaksStreak, today)
  }

  // WEEKLY/CUSTOM habits: count weeks
  return calculateWeeklyStreak(checkinMap, habit, skippedBreaksStreak, today)
}

/**
 * Calculate full streak statistics for a habit (used in habit detail/stats page)
 * @param clientTodayStr - Optional "today" date string (YYYY-MM-DD) from client for timezone handling
 */
export function calculateStreakStats(
  allCheckins: Checkin[],
  habit: HabitConfig,
  skippedBreaksStreak: boolean,
  clientTodayStr?: string
): StreakResult {
  const today = clientTodayStr ? parseLocalDate(clientTodayStr) : new Date()
  today.setHours(12, 0, 0, 0)
  const todayStr = formatDateLocal(today)

  // Build a map of checkins by date
  const checkinMap = new Map<string, { skipped: boolean, value: number | null }>()
  for (const c of allCheckins) {
    checkinMap.set(c.date, { skipped: c.skipped, value: c.value })
  }

  // Find the earliest date to consider for completion rate
  let earliestDate: Date | null = null

  if (habit.createdAt) {
    earliestDate = new Date(habit.createdAt)
    earliestDate.setHours(12, 0, 0, 0)
  }

  // Find oldest checkin date (for backfilled data)
  if (allCheckins.length > 0) {
    const lastCheckin = allCheckins[allCheckins.length - 1]
    if (lastCheckin) {
      const oldestCheckinDate = new Date(lastCheckin.date)
      oldestCheckinDate.setHours(12, 0, 0, 0)

      if (!earliestDate || oldestCheckinDate < earliestDate) {
        earliestDate = oldestCheckinDate
      }
    }
  }

  // For WEEKLY/CUSTOM, calculate week-based streaks
  if (habit.frequencyType === 'WEEKLY' || habit.frequencyType === 'CUSTOM') {
    return calculateWeeklyStreakStats(
      checkinMap,
      habit,
      skippedBreaksStreak,
      today,
      earliestDate
    )
  }

  // DAILY habit stats (original logic)
  return calculateDailyStreakStats(
    checkinMap,
    habit,
    skippedBreaksStreak,
    today,
    todayStr,
    earliestDate
  )
}

/**
 * Calculate streak stats for DAILY habits
 */
function calculateDailyStreakStats(
  checkinMap: Map<string, { skipped: boolean, value: number | null }>,
  habit: HabitConfig,
  skippedBreaksStreak: boolean,
  today: Date,
  todayStr: string,
  earliestDate: Date | null
): StreakResult {
  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0
  let totalCheckins = 0
  let totalExpectedDays = 0
  let foundFirstMiss = false

  const currentDate = new Date(today)

  const maxDays = earliestDate
    ? Math.min(365, Math.ceil((today.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 365

  for (let i = 0; i < maxDays; i++) {
    const dateStr = formatDateLocal(currentDate)
    const checkin = checkinMap.get(dateStr)

    totalExpectedDays++

    // Check if this is a skip that preserves the streak
    if (isSkipPreservingStreak(checkin, skippedBreaksStreak)) {
      // Skip preserves streak but doesn't count toward it or completion rate
      // Don't increment tempStreak, don't count as completed, don't break streak
      currentDate.setDate(currentDate.getDate() - 1)
      continue
    }

    if (isActuallyCompleted(checkin, habit.habitType, habit.targetValue)) {
      totalCheckins++
      tempStreak++

      if (!foundFirstMiss) {
        currentStreak = tempStreak
      }

      if (tempStreak > longestStreak) {
        longestStreak = tempStreak
      }
    } else {
      if (dateStr !== todayStr) {
        foundFirstMiss = true
        tempStreak = 0
      }
    }

    currentDate.setDate(currentDate.getDate() - 1)
  }

  const completionRate = totalExpectedDays > 0
    ? Math.round((totalCheckins / totalExpectedDays) * 100)
    : 0

  return {
    currentStreak,
    longestStreak,
    completionRate,
    totalCheckins,
    totalExpectedDays
  }
}

/**
 * Calculate streak stats for WEEKLY/CUSTOM habits (week or month based)
 */
function calculateWeeklyStreakStats(
  checkinMap: Map<string, { skipped: boolean, value: number | null }>,
  habit: HabitConfig,
  skippedBreaksStreak: boolean,
  today: Date,
  earliestDate: Date | null
): StreakResult {
  const weekStartsOn = habit.weekStartsOn ?? 1
  const isCustom = habit.frequencyType === 'CUSTOM'
  const frequencyValue = habit.frequencyValue ?? 1
  const activeDays = habit.activeDays || []
  const todayStr = formatDateLocal(today)
  const isMonthly = isCustom && habit.frequencyPeriod === 'month'

  // For WEEKLY, we need activeDays
  if (!isCustom && activeDays.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      completionRate: 0,
      totalCheckins: 0,
      totalExpectedDays: 0
    }
  }

  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0
  let totalCheckins = 0
  let totalExpectedDays = 0
  let foundFirstMiss = false

  // Monthly CUSTOM: iterate months
  if (isMonthly) {
    const currentMonthStart = getMonthStart(today)
    const maxMonths = earliestDate
      ? Math.min(12, Math.ceil((today.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24 * 30)) + 1)
      : 12

    for (let monthOffset = 0; monthOffset < maxMonths; monthOffset++) {
      const monthStart = new Date(currentMonthStart)
      monthStart.setMonth(monthStart.getMonth() - monthOffset)

      // Get days in this month
      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)
      monthEnd.setDate(0)
      const daysInMonth = monthEnd.getDate()

      // Count completions for this month
      for (let i = 0; i < daysInMonth; i++) {
        const d = new Date(monthStart)
        d.setDate(d.getDate() + i)
        d.setHours(12, 0, 0, 0)
        const dayStr = formatDateLocal(d)

        if (dayStr > todayStr) continue
        if (earliestDate && d < earliestDate) continue

        const checkin = checkinMap.get(dayStr)
        if (isActuallyCompleted(checkin, habit.habitType, habit.targetValue)) {
          totalCheckins++
        }
      }
      totalExpectedDays += frequencyValue

      const status = getCustomMonthStatus(
        monthStart,
        frequencyValue,
        checkinMap,
        today,
        habit.habitType,
        habit.targetValue
      )

      if (status === 'completed') {
        tempStreak++
        if (!foundFirstMiss) currentStreak = tempStreak
        if (tempStreak > longestStreak) longestStreak = tempStreak
      } else if (status === 'grace') {
        // Continue
      } else {
        foundFirstMiss = true
        tempStreak = 0
      }
    }

    const completionRate = totalExpectedDays > 0
      ? Math.round((totalCheckins / totalExpectedDays) * 100)
      : 0

    return { currentStreak, longestStreak, completionRate, totalCheckins, totalExpectedDays }
  }

  // Weekly logic (original)
  const currentWeekStart = getWeekStart(today, weekStartsOn)
  const maxWeeks = earliestDate
    ? Math.min(52, Math.ceil((today.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1)
    : 52

  for (let weekOffset = 0; weekOffset < maxWeeks; weekOffset++) {
    const weekStart = new Date(currentWeekStart)
    weekStart.setDate(weekStart.getDate() - weekOffset * 7)

    // Count completions for this week
    if (isCustom) {
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart)
        d.setDate(d.getDate() + i)
        d.setHours(12, 0, 0, 0)
        const dayStr = formatDateLocal(d)

        if (dayStr > todayStr) continue
        if (earliestDate && d < earliestDate) continue

        const checkin = checkinMap.get(dayStr)
        if (isActuallyCompleted(checkin, habit.habitType, habit.targetValue)) {
          totalCheckins++
        }
      }
      totalExpectedDays += frequencyValue
    } else {
      const activeDaysInWeek = getActiveDaysInWeek(weekStart, activeDays)
      for (const day of activeDaysInWeek) {
        const dayStr = formatDateLocal(day)
        if (dayStr > todayStr) continue
        if (earliestDate && day < earliestDate) continue

        totalExpectedDays++
        const checkin = checkinMap.get(dayStr)
        if (isActuallyCompleted(checkin, habit.habitType, habit.targetValue)) {
          totalCheckins++
        }
      }
    }

    let status: WeekStatus
    if (isCustom) {
      status = getCustomWeekStatus(weekStart, frequencyValue, checkinMap, today, habit.habitType, habit.targetValue)
    } else {
      status = getWeekStatus(weekStart, activeDays, checkinMap, today, habit.habitType, habit.targetValue, skippedBreaksStreak)
    }

    if (status === 'completed') {
      tempStreak++
      if (!foundFirstMiss) currentStreak = tempStreak
      if (tempStreak > longestStreak) longestStreak = tempStreak
    } else if (status === 'grace') {
      // Continue
    } else {
      foundFirstMiss = true
      tempStreak = 0
    }
  }

  const completionRate = totalExpectedDays > 0
    ? Math.round((totalCheckins / totalExpectedDays) * 100)
    : 0

  return { currentStreak, longestStreak, completionRate, totalCheckins, totalExpectedDays }
}
