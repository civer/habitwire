import { beforeAll, afterAll, vi } from 'vitest'

// Mock date functions for consistent testing
// Tests can override this by calling vi.setSystemTime()
beforeAll(() => {
  // Set a fixed date for tests: 2025-12-31 12:00:00
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2025-12-31T12:00:00'))
})

afterAll(() => {
  vi.useRealTimers()
})
