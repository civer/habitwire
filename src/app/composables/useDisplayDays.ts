import { formatDateString } from '~/utils/date'

export interface DisplayDay {
  date: string
  dayName: string
  isToday: boolean
  isWeekStart: boolean
}

export interface UseDisplayDaysOptions {
  daysToShow?: Ref<number | undefined> | number
  weekStartsOn?: Ref<'monday' | 'sunday' | undefined> | 'monday' | 'sunday'
}

export function useDisplayDays(options: UseDisplayDaysOptions = {}) {
  const today = formatDateString(new Date())

  const daysCount = computed(() => {
    const value = toValue(options.daysToShow)
    return value ?? 14
  })

  const weekStart = computed(() => {
    const value = toValue(options.weekStartsOn)
    return value ?? 'monday'
  })

  function isWeekStart(date: Date): boolean {
    const dayOfWeek = date.getDay()
    return weekStart.value === 'monday' ? dayOfWeek === 1 : dayOfWeek === 0
  }

  const displayDays = computed<DisplayDay[]>(() => {
    const days: DisplayDay[] = []
    const now = new Date()
    for (let i = daysCount.value - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = formatDateString(d)
      days.push({
        date: dateStr,
        dayName: d.toLocaleDateString(undefined, { weekday: 'short' }),
        isToday: dateStr === today,
        isWeekStart: isWeekStart(d) && i !== daysCount.value - 1
      })
    }
    return days
  })

  return {
    today,
    daysCount,
    weekStart,
    displayDays,
    isWeekStart
  }
}
