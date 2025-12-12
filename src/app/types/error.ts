/**
 * Type guard for API fetch errors
 * $fetch throws FetchError with data.message for API errors
 */
export interface ApiError {
  data?: {
    message?: string
    statusCode?: number
  }
  message?: string
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const e = error as ApiError
    return e.data?.message || e.message || fallback
  }
  return fallback
}
