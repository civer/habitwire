import { vi } from 'vitest'
import type { H3Event } from 'h3'
import { hashApiKey, generateApiKey } from '../../server/utils/auth'

// Types for test data
export interface TestUser {
  id: string
  username: string
  passwordHash: string
  displayName: string | null
  settings: Record<string, unknown>
}

export interface TestHabit {
  id: string
  userId: string
  title: string
  frequencyType: string
  habitType: string
  activeDays: number[] | null
  targetValue: string | null
}

/**
 * Create a mock H3Event for testing API handlers
 */
export function createMockEvent(options: {
  method?: string
  path?: string
  body?: unknown
  query?: Record<string, string>
  params?: Record<string, string>
  headers?: Record<string, string>
  userId?: string
}): H3Event {
  const {
    method = 'GET',
    path = '/',
    body = null,
    query = {},
    params = {},
    headers = {},
    userId
  } = options

  // Build URL with query string
  const url = new URL(path, 'http://localhost:3000')
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value)
  }

  const event = {
    node: {
      req: {
        method,
        url: url.pathname + url.search,
        headers: {
          'content-type': 'application/json',
          ...headers
        }
      },
      res: {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn()
      }
    },
    context: {
      params,
      ...(userId && { userId })
    },
    _body: body,
    _path: path
  } as unknown as H3Event

  return event
}

/**
 * Create a test user with hashed password
 */
export async function createTestUserData(overrides: Partial<TestUser> = {}): Promise<{
  userData: Omit<TestUser, 'id'>
  plainPassword: string
}> {
  const plainPassword = 'testpassword123'

  // Import hashPassword dynamically (it's auto-imported in Nuxt)
  const { hashPassword } = await import('nuxt-auth-utils/runtime/server/lib/utils')
  const passwordHash = await hashPassword(plainPassword)

  return {
    userData: {
      username: 'testuser',
      passwordHash,
      displayName: 'Test User',
      settings: {},
      ...overrides
    },
    plainPassword
  }
}

/**
 * Create test API key data
 */
export function createTestApiKeyData(userId: string) {
  const apiKey = generateApiKey()
  const keyHash = hashApiKey(apiKey)

  return {
    apiKeyData: {
      userId,
      name: 'Test API Key',
      keyHash
    },
    plainApiKey: apiKey
  }
}

/**
 * Create test habit data
 */
export function createTestHabitData(userId: string, overrides: Partial<TestHabit> = {}) {
  return {
    userId,
    title: 'Test Habit',
    frequencyType: 'DAILY',
    habitType: 'SIMPLE',
    activeDays: null,
    targetValue: null,
    ...overrides
  }
}

/**
 * Create test checkin data
 */
export function createTestCheckinData(habitId: string, overrides: Record<string, unknown> = {}) {
  return {
    habitId,
    date: '2025-12-31',
    value: null,
    skipped: false,
    skipReason: null,
    notes: null,
    metadata: null,
    ...overrides
  }
}

/**
 * Mock getUserSession for session-based auth tests
 */
export function mockUserSession(userId: string, username = 'testuser') {
  return vi.fn().mockResolvedValue({
    user: {
      id: userId,
      username,
      displayName: 'Test User'
    }
  })
}

/**
 * Mock empty session (unauthenticated)
 */
export function mockEmptySession() {
  return vi.fn().mockResolvedValue({})
}
