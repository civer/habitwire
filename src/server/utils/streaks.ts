import { formatDateLocal } from './date'

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
 * Check if a checkin counts as completed
 */
function isCompleted(
  checkin: { skipped: boolean, value: number | null } | undefined,
  habitType: string,
  targetValue: number | null,
  skippedBreaksStreak: boolean
): boolean {
  if (!checkin) return false
  if (checkin.skipped) return !skippedBreaksStreak

  // Only check target value for TARGET habits
  if (habitType === 'TARGET' && targetValue) {
    const targetVal = safeParseNumber(targetValue)
    const checkinVal = safeParseNumber(checkin.value)
    return checkinVal >= targetVal
  }

  return true
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
 * Check if a week is completed, incomplete, or in grace period
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

  let allPastDaysCompleted = true
  let hasGrace = false

  const todayStr = formatDateLocal(today)

  for (const day of activeDaysInWeek) {
    const dayStr = formatDateLocal(day)
    const checkin = checkinMap.get(dayStr)

    if (dayStr > todayStr) {
      // Day is in the future - grace period
      hasGrace = true
    } else if (dayStr === todayStr) {
      // Today - check if completed, otherwise grace
      if (!isCompleted(checkin, habitType, targetValue, skippedBreaksStreak)) {
        hasGrace = true
      }
    } else {
      // Past day - must be completed
      if (!isCompleted(checkin, habitType, targetValue, skippedBreaksStreak)) {
        allPastDaysCompleted = false
      }
    }
  }

  if (!allPastDaysCompleted) return 'incomplete'
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

    if (isCompleted(checkin, habit.habitType, habit.targetValue, skippedBreaksStreak)) {
      currentStreak++
    } else {
      // Grace period for today only
      if (dateStr === todayStr) {
        // Today not completed yet - continue checking yesterday
      } else {
        // Past day not completed - streak is broken
        break
      }
    }

    currentDate.setDate(currentDate.getDate() - 1)
  }

  return currentStreak
}

/**
 * Calculate current streak for WEEKLY/CUSTOM habits (counts weeks)
 */
function calculateWeeklyStreak(
  checkinMap: Map<string, { skipped: boolean, value: number | null }>,
  habit: HabitConfig,
  skippedBreaksStreak: boolean,
  today: Date
): number {
  const weekStartsOn = habit.weekStartsOn ?? 1
  const activeDays = habit.activeDays || []

  if (activeDays.length === 0) return 0

  let currentStreak = 0
  const currentWeekStart = getWeekStart(today, weekStartsOn)

  // Check up to 52 weeks back
  for (let weekOffset = 0; weekOffset < 52; weekOffset++) {
    const weekStart = new Date(currentWeekStart)
    weekStart.setDate(weekStart.getDate() - weekOffset * 7)

    const status = getWeekStatus(
      weekStart,
      activeDays,
      checkinMap,
      today,
      habit.habitType,
      habit.targetValue,
      skippedBreaksStreak
    )

    if (status === 'completed') {
      currentStreak++
    } else if (status === 'grace') {
      // Current week in grace period - continue checking previous weeks
      continue
    } else {
      // Week incomplete - streak is broken
      break
    }
  }

  return currentStreak
}

/**
 * Calculate current streak for a habit (used in dashboard list)
 */
export function calculateCurrentStreak(
  allCheckins: Checkin[],
  habit: HabitConfig,
  skippedBreaksStreak: boolean
): number {
  if (allCheckins.length === 0) return 0

  const today = new Date()
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
 */
export function calculateStreakStats(
  allCheckins: Checkin[],
  habit: HabitConfig,
  skippedBreaksStreak: boolean
): StreakResult {
  const today = new Date()
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

    if (isCompleted(checkin, habit.habitType, habit.targetValue, skippedBreaksStreak)) {
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
 * Calculate streak stats for WEEKLY/CUSTOM habits (week-based)
 */
function calculateWeeklyStreakStats(
  checkinMap: Map<string, { skipped: boolean, value: number | null }>,
  habit: HabitConfig,
  skippedBreaksStreak: boolean,
  today: Date,
  earliestDate: Date | null
): StreakResult {
  const weekStartsOn = habit.weekStartsOn ?? 1
  const activeDays = habit.activeDays || []
  const todayStr = formatDateLocal(today)

  if (activeDays.length === 0) {
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

  const currentWeekStart = getWeekStart(today, weekStartsOn)

  // Calculate how many weeks to check
  const maxWeeks = earliestDate
    ? Math.min(52, Math.ceil((today.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1)
    : 52

  for (let weekOffset = 0; weekOffset < maxWeeks; weekOffset++) {
    const weekStart = new Date(currentWeekStart)
    weekStart.setDate(weekStart.getDate() - weekOffset * 7)

    // Count active days and completions for this week
    const activeDaysInWeek = getActiveDaysInWeek(weekStart, activeDays)

    for (const day of activeDaysInWeek) {
      const dayStr = formatDateLocal(day)

      // Only count days up to today and from earliestDate
      if (dayStr > todayStr) continue
      if (earliestDate && day < earliestDate) continue

      totalExpectedDays++
      const checkin = checkinMap.get(dayStr)

      if (isCompleted(checkin, habit.habitType, habit.targetValue, skippedBreaksStreak)) {
        totalCheckins++
      }
    }

    // Check week status for streak calculation
    const status = getWeekStatus(
      weekStart,
      activeDays,
      checkinMap,
      today,
      habit.habitType,
      habit.targetValue,
      skippedBreaksStreak
    )

    if (status === 'completed') {
      tempStreak++

      if (!foundFirstMiss) {
        currentStreak = tempStreak
      }

      if (tempStreak > longestStreak) {
        longestStreak = tempStreak
      }
    } else if (status === 'grace') {
      // Current week in grace - continue without breaking streak
    } else {
      // Week incomplete
      foundFirstMiss = true
      tempStreak = 0
    }
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
