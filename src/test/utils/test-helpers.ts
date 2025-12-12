import type { Checkin, HabitConfig } from '@server/utils/streaks'

/**
 * Create a mock HabitConfig for testing
 */
export function createHabitConfig(overrides: Partial<HabitConfig> = {}): HabitConfig {
  return {
    frequencyType: 'DAILY',
    activeDays: null,
    habitType: 'SIMPLE',
    targetValue: null,
    createdAt: new Date('2025-01-01'),
    weekStartsOn: 1, // Monday (default)
    ...overrides
  }
}

/**
 * Create a mock Checkin for testing
 */
export function createCheckin(overrides: Partial<Checkin> = {}): Checkin {
  return {
    date: '2025-12-31',
    skipped: false,
    value: null,
    ...overrides
  }
}

/**
 * Generate consecutive checkins going BACKWARDS from startDate
 * @param startDate - Most recent date (YYYY-MM-DD)
 * @param days - Number of days to generate (going into the past)
 * @param options - Additional options for checkins
 * @example generateConsecutiveCheckins('2025-12-31', 3) → ['2025-12-31', '2025-12-30', '2025-12-29']
 */
export function generateConsecutiveCheckins(
  startDate: string,
  days: number,
  options: { skipped?: boolean, value?: string } = {}
): Checkin[] {
  const checkins: Checkin[] = []
  const date = new Date(startDate)

  for (let i = 0; i < days; i++) {
    checkins.push({
      date: formatDate(date),
      skipped: options.skipped ?? false,
      value: options.value ?? null
    })
    date.setDate(date.getDate() - 1)
  }

  return checkins
}

/**
 * Generate checkins for specific dates
 */
export function generateCheckinsForDates(
  dates: string[],
  options: { skipped?: boolean, value?: string } = {}
): Checkin[] {
  return dates.map(date => ({
    date,
    skipped: options.skipped ?? false,
    value: options.value ?? null
  }))
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get a date relative to today
 * @param daysAgo - Number of days ago (positive = past, negative = future)
 */
export function getDateDaysAgo(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return formatDate(date)
}

/**
 * Mock auth context for API tests
 */
export function mockAuthContext(userId: string) {
  return {
    context: {
      userId
    }
  }
}
