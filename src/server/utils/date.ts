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
 * Get today's date as YYYY-MM-DD string in local timezone
 */
export function getTodayLocal(): string {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return formatDateLocal(today)
}
