import type { HabitWithCheckinsResponse, RecentCheckin } from '~/types/api'
import { formatDateString } from '~/utils/date'
import { useDisplayDays, type DisplayDay } from './useDisplayDays'

export interface UseHabitCardOptions {
  habit: Ref<HabitWithCheckinsResponse> | HabitWithCheckinsResponse
  daysToShow?: Ref<number | undefined> | number
  weekStartsOn?: Ref<'monday' | 'sunday' | undefined> | 'monday' | 'sunday'
}

export function useHabitCard(options: UseHabitCardOptions) {
  const { t } = useI18n()

  const habit = computed(() => toValue(options.habit))

  // Display days (shared logic)
  const { today, displayDays, weekStart } = useDisplayDays({
    daysToShow: options.daysToShow,
    weekStartsOn: options.weekStartsOn
  })

  // Target habit helpers
  const isTargetHabit = computed(() => habit.value.habit_type === 'TARGET')
  const targetValue = computed(() => habit.value.target_value ?? null)
  const defaultIncrement = computed(() => habit.value.default_increment ?? null)

  // Frequency helpers
  const isWeekly = computed(() => habit.value.frequency_type === 'WEEKLY')
  const isCustom = computed(() => habit.value.frequency_type === 'CUSTOM')
  const activeDays = computed(() => habit.value.active_days || [])
  const frequencyValue = computed(() => habit.value.frequency_value || 1)

  function isActiveDay(date: string): boolean {
    if (!isWeekly.value) return true
    const d = new Date(date)
    const dayOfWeek = d.getDay()
    return activeDays.value.includes(dayOfWeek)
  }

  // Checkins map
  const checkinsByDate = computed(() => {
    const map = new Map<string, RecentCheckin>()
    for (const c of habit.value.recent_checkins || []) {
      map.set(c.date, c)
    }
    return map
  })

  // Today's status
  const todayCheckin = computed(() => checkinsByDate.value.get(today))
  const currentValue = computed(() => todayCheckin.value?.value ?? 0)
  const isCompleted = computed(() => {
    if (!todayCheckin.value || todayCheckin.value.skipped) return false
    if (isTargetHabit.value && targetValue.value) {
      return currentValue.value >= targetValue.value
    }
    return true
  })
  const isSkipped = computed(() => todayCheckin.value?.skipped)
  const isTodayActiveDay = computed(() => isActiveDay(today))
  const progress = computed(() => {
    if (!isTargetHabit.value || !targetValue.value) return 0
    return Math.min(100, (currentValue.value / targetValue.value) * 100)
  })

  // Status functions
  function getDayStatus(date: string): 'completed' | 'partial' | 'skipped' | 'inactive' | 'none' {
    const checkin = checkinsByDate.value.get(date)

    if (isWeekly.value && !isActiveDay(date)) {
      if (checkin && !checkin.skipped) return 'completed'
      return 'inactive'
    }

    if (!checkin) return 'none'
    if (checkin.skipped) return 'skipped'
    if (isTargetHabit.value && targetValue.value && checkin.value) {
      if (checkin.value >= targetValue.value) return 'completed'
      if (checkin.value > 0) return 'partial'
      return 'none'
    }
    return 'completed'
  }

  function getDayProgress(date: string): number {
    if (!isTargetHabit.value || !targetValue.value) return 0
    const checkin = checkinsByDate.value.get(date)
    if (!checkin?.value) return 0
    return Math.min(100, (checkin.value / targetValue.value) * 100)
  }

  function getDayTooltip(day: DisplayDay): string {
    const status = getDayStatus(day.date)
    const checkin = checkinsByDate.value.get(day.date)
    const note = checkin?.notes

    let statusText = ''
    if (status === 'skipped') {
      statusText = t('habits.skipped')
    } else if (status === 'completed') {
      if (isTargetHabit.value && targetValue.value) {
        const val = checkin?.value ?? 0
        statusText = `${val}/${targetValue.value} ✓`
      } else {
        statusText = t('habits.completed')
      }
    } else if (status === 'partial') {
      const val = checkin?.value ?? 0
      statusText = `${val}/${targetValue.value}`
    }

    if (note && statusText) {
      return `${statusText} - ${note}`
    }
    if (note) {
      return note
    }
    return statusText
  }

  // Weekly completed count for CUSTOM frequency
  const weeklyCompletedCount = computed(() => {
    if (!isCustom.value) return 0

    const now = new Date()
    const dayOfWeek = now.getDay()

    let daysSinceWeekStart: number
    if (weekStart.value === 'monday') {
      daysSinceWeekStart = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    } else {
      daysSinceWeekStart = dayOfWeek
    }

    const currentWeekStart = new Date(now)
    currentWeekStart.setDate(now.getDate() - daysSinceWeekStart)
    const weekStartStr = formatDateString(currentWeekStart)

    let count = 0
    for (const day of displayDays.value) {
      if (day.date >= weekStartStr && day.date <= today) {
        const status = getDayStatus(day.date)
        if (status === 'completed') count++
      }
    }
    return count
  })

  // Helper to get current value for a specific date (for modals)
  function getCheckinValue(date: string): number {
    const checkin = checkinsByDate.value.get(date)
    return checkin?.value ?? 0
  }

  return {
    // Display days
    today,
    displayDays,
    weekStart,

    // Target helpers
    isTargetHabit,
    targetValue,
    defaultIncrement,

    // Frequency helpers
    isWeekly,
    isCustom,
    activeDays,
    frequencyValue,
    isActiveDay,

    // Checkins
    checkinsByDate,

    // Today's status
    todayCheckin,
    currentValue,
    isCompleted,
    isSkipped,
    isTodayActiveDay,
    progress,

    // Status functions
    getDayStatus,
    getDayProgress,
    getDayTooltip,

    // Custom frequency
    weeklyCompletedCount,

    // Helpers
    getCheckinValue
  }
}
