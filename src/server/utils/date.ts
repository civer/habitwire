/**
 * Format a Date object as YYYY-MM-DD in local timezone
 * This ensures consistent date handling across the application
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parses a YYYY-MM-DD string as local date (not UTC).
 * This prevents timezone issues where "2025-12-17" would be
 * parsed as UTC midnight, which can be a different day in local time.
 */
export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number)
  const year = parts[0] ?? 0
  const month = parts[1] ?? 1
  const day = parts[2] ?? 1
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

/**
 * Get today's date as YYYY-MM-DD string in local timezone
 */
export function getTodayLocal(): string {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return formatDateLocal(today)
}
