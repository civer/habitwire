import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  passwordChangeSchema,
  settingsSchema,
  createHabitSchema,
  updateHabitSchema,
  checkinSchema,
  skipSchema,
  createCategorySchema,
  updateCategorySchema,
  createApiKeySchema,
  dateStringSchema,
  checkinsQuerySchema,
  habitsQuerySchema
} from '@server/utils/validation'

describe('validation.ts', () => {
  // ============================================================
  // Auth Schemas
  // ============================================================

  describe('loginSchema', () => {
    it('accepts valid credentials', () => {
      const result = loginSchema.safeParse({
        username: 'testuser',
        password: 'testpass'
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty username', () => {
      const result = loginSchema.safeParse({
        username: '',
        password: 'testpass'
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({
        username: 'testuser',
        password: ''
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing fields', () => {
      const result = loginSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('passwordChangeSchema', () => {
    it('accepts valid password change', () => {
      const result = passwordChangeSchema.safeParse({
        current_password: 'oldpass',
        new_password: 'newpassword123'
      })
      expect(result.success).toBe(true)
    })

    it('rejects new password shorter than 8 chars', () => {
      const result = passwordChangeSchema.safeParse({
        current_password: 'oldpass',
        new_password: 'short'
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('8 characters')
      }
    })
  })

  describe('settingsSchema', () => {
    it('accepts valid settings', () => {
      const result = settingsSchema.safeParse({
        allowBackfill: true,
        groupByCategory: false,
        skippedBreaksStreak: true
      })
      expect(result.success).toBe(true)
    })

    it('accepts partial settings', () => {
      const result = settingsSchema.safeParse({
        allowBackfill: true
      })
      expect(result.success).toBe(true)
    })

    it('rejects unknown fields (strict mode)', () => {
      const result = settingsSchema.safeParse({
        allowBackfill: true,
        unknownField: 'hacker'
      })
      expect(result.success).toBe(false)
    })
  })

  // ============================================================
  // Habit Schemas
  // ============================================================

  describe('createHabitSchema', () => {
    it('accepts valid DAILY habit', () => {
      const result = createHabitSchema.safeParse({
        title: 'Drink water',
        frequency_type: 'DAILY'
      })
      expect(result.success).toBe(true)
    })

    it('accepts valid WEEKLY habit with active_days', () => {
      const result = createHabitSchema.safeParse({
        title: 'Go to gym',
        frequency_type: 'WEEKLY',
        active_days: [1, 3, 5] // Mon, Wed, Fri
      })
      expect(result.success).toBe(true)
    })

    it('rejects WEEKLY habit without active_days', () => {
      const result = createHabitSchema.safeParse({
        title: 'Go to gym',
        frequency_type: 'WEEKLY'
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('active_days is required')
      }
    })

    it('rejects CUSTOM habit without active_days', () => {
      const result = createHabitSchema.safeParse({
        title: 'Custom habit',
        frequency_type: 'CUSTOM'
      })
      expect(result.success).toBe(false)
    })

    it('rejects WEEKLY habit with empty active_days', () => {
      const result = createHabitSchema.safeParse({
        title: 'Go to gym',
        frequency_type: 'WEEKLY',
        active_days: []
      })
      expect(result.success).toBe(false)
    })

    it('accepts TARGET habit with target_value', () => {
      const result = createHabitSchema.safeParse({
        title: 'Drink 2L water',
        frequency_type: 'DAILY',
        habit_type: 'TARGET',
        target_value: 2000,
        unit: 'ml'
      })
      expect(result.success).toBe(true)
    })

    it('rejects title longer than 200 chars', () => {
      const result = createHabitSchema.safeParse({
        title: 'x'.repeat(201),
        frequency_type: 'DAILY'
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty title', () => {
      const result = createHabitSchema.safeParse({
        title: '',
        frequency_type: 'DAILY'
      })
      expect(result.success).toBe(false)
    })

    // Color validation
    it('accepts valid hex color #RGB', () => {
      const result = createHabitSchema.safeParse({
        title: 'Test',
        frequency_type: 'DAILY',
        color: '#F00'
      })
      expect(result.success).toBe(true)
    })

    it('accepts valid hex color #RRGGBB', () => {
      const result = createHabitSchema.safeParse({
        title: 'Test',
        frequency_type: 'DAILY',
        color: '#FF5733'
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid hex color', () => {
      const result = createHabitSchema.safeParse({
        title: 'Test',
        frequency_type: 'DAILY',
        color: 'red'
      })
      expect(result.success).toBe(false)
    })

    it('rejects hex color with wrong length', () => {
      const result = createHabitSchema.safeParse({
        title: 'Test',
        frequency_type: 'DAILY',
        color: '#FF57'
      })
      expect(result.success).toBe(false)
    })

    // Icon validation
    it('accepts valid icon format', () => {
      const result = createHabitSchema.safeParse({
        title: 'Test',
        frequency_type: 'DAILY',
        icon: 'i-lucide-check'
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid icon format', () => {
      const result = createHabitSchema.safeParse({
        title: 'Test',
        frequency_type: 'DAILY',
        icon: 'check'
      })
      expect(result.success).toBe(false)
    })

    // Active days validation
    it('rejects active_days with duplicates', () => {
      const result = createHabitSchema.safeParse({
        title: 'Test',
        frequency_type: 'WEEKLY',
        active_days: [1, 1, 3]
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('duplicates')
      }
    })

    it('rejects active_days with invalid day number', () => {
      const result = createHabitSchema.safeParse({
        title: 'Test',
        frequency_type: 'WEEKLY',
        active_days: [1, 7] // 7 is invalid (0-6 only)
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid category_id', () => {
      const result = createHabitSchema.safeParse({
        title: 'Test',
        frequency_type: 'DAILY',
        category_id: 'not-a-uuid'
      })
      expect(result.success).toBe(false)
    })

    it('accepts valid category_id', () => {
      const result = createHabitSchema.safeParse({
        title: 'Test',
        frequency_type: 'DAILY',
        category_id: '123e4567-e89b-12d3-a456-426614174000'
      })
      expect(result.success).toBe(true)
    })
  })

  describe('updateHabitSchema', () => {
    it('accepts partial update', () => {
      const result = updateHabitSchema.safeParse({
        title: 'Updated title'
      })
      expect(result.success).toBe(true)
    })

    it('rejects changing to WEEKLY without active_days', () => {
      const result = updateHabitSchema.safeParse({
        frequency_type: 'WEEKLY'
      })
      expect(result.success).toBe(false)
    })

    it('accepts changing to WEEKLY with active_days', () => {
      const result = updateHabitSchema.safeParse({
        frequency_type: 'WEEKLY',
        active_days: [1, 2, 3]
      })
      expect(result.success).toBe(true)
    })

    it('accepts archived field', () => {
      const result = updateHabitSchema.safeParse({
        archived: true
      })
      expect(result.success).toBe(true)
    })
  })

  // ============================================================
  // Checkin Schemas
  // ============================================================

  describe('checkinSchema', () => {
    it('accepts empty object (all optional)', () => {
      const result = checkinSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('accepts valid checkin with all fields', () => {
      const result = checkinSchema.safeParse({
        date: '2025-12-31',
        value: 100,
        notes: 'Great day!',
        metadata: { mood: 'happy' }
      })
      expect(result.success).toBe(true)
    })

    it('accepts numeric value', () => {
      const result = checkinSchema.safeParse({
        value: 100
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid date format', () => {
      const result = checkinSchema.safeParse({
        date: '31-12-2025'
      })
      expect(result.success).toBe(false)
    })

    it('rejects notes longer than 1000 chars', () => {
      const result = checkinSchema.safeParse({
        notes: 'x'.repeat(1001)
      })
      expect(result.success).toBe(false)
    })

    it('rejects metadata with more than 50 keys', () => {
      const metadata: Record<string, string> = {}
      for (let i = 0; i < 51; i++) {
        metadata[`key${i}`] = 'value'
      }
      const result = checkinSchema.safeParse({ metadata })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Metadata too large')
      }
    })

    it('rejects metadata larger than 64KB', () => {
      const metadata = {
        largeValue: 'x'.repeat(70000) // > 64KB
      }
      const result = checkinSchema.safeParse({ metadata })
      expect(result.success).toBe(false)
    })

    it('accepts metadata at size limit', () => {
      const metadata: Record<string, string> = {}
      for (let i = 0; i < 50; i++) {
        metadata[`key${i}`] = 'small'
      }
      const result = checkinSchema.safeParse({ metadata })
      expect(result.success).toBe(true)
    })
  })

  describe('skipSchema', () => {
    it('accepts empty object', () => {
      const result = skipSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('accepts valid skip with reason', () => {
      const result = skipSchema.safeParse({
        date: '2025-12-31',
        reason: 'Sick day'
      })
      expect(result.success).toBe(true)
    })

    it('rejects reason longer than 500 chars', () => {
      const result = skipSchema.safeParse({
        reason: 'x'.repeat(501)
      })
      expect(result.success).toBe(false)
    })
  })

  // ============================================================
  // Category Schemas
  // ============================================================

  describe('createCategorySchema', () => {
    it('accepts valid category', () => {
      const result = createCategorySchema.safeParse({
        name: 'Health',
        icon: 'i-lucide-heart',
        color: '#FF0000'
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty name', () => {
      const result = createCategorySchema.safeParse({
        name: ''
      })
      expect(result.success).toBe(false)
    })

    it('rejects name longer than 100 chars', () => {
      const result = createCategorySchema.safeParse({
        name: 'x'.repeat(101)
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateCategorySchema', () => {
    it('accepts partial update', () => {
      const result = updateCategorySchema.safeParse({
        color: '#00FF00'
      })
      expect(result.success).toBe(true)
    })
  })

  // ============================================================
  // API Key Schema
  // ============================================================

  describe('createApiKeySchema', () => {
    it('accepts valid name', () => {
      const result = createApiKeySchema.safeParse({
        name: 'My API Key'
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty name', () => {
      const result = createApiKeySchema.safeParse({
        name: ''
      })
      expect(result.success).toBe(false)
    })

    it('rejects name longer than 100 chars', () => {
      const result = createApiKeySchema.safeParse({
        name: 'x'.repeat(101)
      })
      expect(result.success).toBe(false)
    })
  })

  // ============================================================
  // Query Schemas
  // ============================================================

  describe('dateStringSchema', () => {
    it('accepts valid YYYY-MM-DD format', () => {
      const result = dateStringSchema.safeParse('2025-12-31')
      expect(result.success).toBe(true)
    })

    it('rejects DD-MM-YYYY format', () => {
      const result = dateStringSchema.safeParse('31-12-2025')
      expect(result.success).toBe(false)
    })

    it('rejects MM/DD/YYYY format', () => {
      const result = dateStringSchema.safeParse('12/31/2025')
      expect(result.success).toBe(false)
    })

    it('rejects invalid date string', () => {
      const result = dateStringSchema.safeParse('not-a-date')
      expect(result.success).toBe(false)
    })
  })

  describe('checkinsQuerySchema', () => {
    it('accepts valid date range', () => {
      const result = checkinsQuerySchema.safeParse({
        from: '2025-01-01',
        to: '2025-12-31'
      })
      expect(result.success).toBe(true)
    })

    it('accepts partial query (from only)', () => {
      const result = checkinsQuerySchema.safeParse({
        from: '2025-01-01'
      })
      expect(result.success).toBe(true)
    })

    it('accepts empty query', () => {
      const result = checkinsQuerySchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('habitsQuerySchema', () => {
    it('accepts valid UUID category filter', () => {
      const result = habitsQuerySchema.safeParse({
        category: '123e4567-e89b-12d3-a456-426614174000'
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid UUID', () => {
      const result = habitsQuerySchema.safeParse({
        category: 'not-a-uuid'
      })
      expect(result.success).toBe(false)
    })
  })
})
