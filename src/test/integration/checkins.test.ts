import { describe, it, expect } from 'vitest'
import { eq, and } from 'drizzle-orm'
import { db, schema } from './setup'

describe('Checkins Integration', () => {
  // Counter for unique usernames (Date.now() is frozen by fake timers)
  let userCounter = 0

  // Helper to create test user with habit
  async function createUserWithHabit(habitOverrides = {}) {
    const [user] = await db.insert(schema.users).values({
      username: `checkin_user_${++userCounter}`,
      passwordHash: 'hash'
    }).returning()

    const [habit] = await db.insert(schema.habits).values({
      userId: user.id,
      title: 'Test Habit',
      frequencyType: 'DAILY',
      habitType: 'SIMPLE',
      ...habitOverrides
    }).returning()

    return { user, habit }
  }

  describe('Basic Operations', () => {
    it('creates a checkin', async () => {
      const { habit } = await createUserWithHabit()

      const [checkin] = await db.insert(schema.checkins).values({
        habitId: habit.id,
        date: '2025-12-31'
      }).returning()

      expect(checkin.id).toBeDefined()
      expect(checkin.habitId).toBe(habit.id)
      expect(checkin.date).toBe('2025-12-31')
      expect(checkin.skipped).toBe(false)
    })

    it('creates a checkin with value for TARGET habit', async () => {
      const { habit } = await createUserWithHabit({
        habitType: 'TARGET',
        targetValue: 2000,
        unit: 'ml'
      })

      const [checkin] = await db.insert(schema.checkins).values({
        habitId: habit.id,
        date: '2025-12-31',
        value: 1500
      }).returning()

      expect(checkin.value).toBe(1500)
    })

    it('creates a skipped checkin with reason', async () => {
      const { habit } = await createUserWithHabit()

      const [checkin] = await db.insert(schema.checkins).values({
        habitId: habit.id,
        date: '2025-12-31',
        skipped: true,
        skipReason: 'Sick day'
      }).returning()

      expect(checkin.skipped).toBe(true)
      expect(checkin.skipReason).toBe('Sick day')
    })

    it('stores metadata as JSONB', async () => {
      const { habit } = await createUserWithHabit()

      const metadata = { mood: 'happy', energy: 8 }

      const [checkin] = await db.insert(schema.checkins).values({
        habitId: habit.id,
        date: '2025-12-31',
        metadata
      }).returning()

      expect(checkin.metadata).toEqual(metadata)
    })
  })

  describe('Upsert Logic (Same Day Update)', () => {
    it('updates existing checkin on same date', async () => {
      const { habit } = await createUserWithHabit()

      // First checkin
      await db.insert(schema.checkins).values({
        habitId: habit.id,
        date: '2025-12-31',
        notes: 'First note'
      }).returning()

      // Find existing and update (simulating API upsert logic)
      const existing = await db.query.checkins.findFirst({
        where: and(
          eq(schema.checkins.habitId, habit.id),
          eq(schema.checkins.date, '2025-12-31')
        )
      })

      expect(existing).toBeDefined()

      await db.update(schema.checkins)
        .set({ notes: 'Updated note', value: 100 })
        .where(eq(schema.checkins.id, existing!.id))

      // Verify only one checkin exists
      const allCheckins = await db.query.checkins.findMany({
        where: eq(schema.checkins.habitId, habit.id)
      })

      expect(allCheckins).toHaveLength(1)
      expect(allCheckins[0].notes).toBe('Updated note')
      expect(allCheckins[0].value).toBe(100)
    })

    it('skip converts to check on same date', async () => {
      const { habit } = await createUserWithHabit()

      // First: skip
      await db.insert(schema.checkins).values({
        habitId: habit.id,
        date: '2025-12-31',
        skipped: true,
        skipReason: 'Was busy'
      })

      // Then: convert to check
      const existing = await db.query.checkins.findFirst({
        where: and(
          eq(schema.checkins.habitId, habit.id),
          eq(schema.checkins.date, '2025-12-31')
        )
      })

      await db.update(schema.checkins)
        .set({ skipped: false, skipReason: null, value: 50 })
        .where(eq(schema.checkins.id, existing!.id))

      const updated = await db.query.checkins.findFirst({
        where: eq(schema.checkins.id, existing!.id)
      })

      expect(updated?.skipped).toBe(false)
      expect(updated?.skipReason).toBeNull()
      expect(updated?.value).toBe(50)
    })

    it('uncheck deletes the checkin', async () => {
      const { habit } = await createUserWithHabit()

      const [checkin] = await db.insert(schema.checkins).values({
        habitId: habit.id,
        date: '2025-12-31'
      }).returning()

      await db.delete(schema.checkins).where(eq(schema.checkins.id, checkin.id))

      const found = await db.query.checkins.findFirst({
        where: eq(schema.checkins.id, checkin.id)
      })

      expect(found).toBeUndefined()
    })
  })

  describe('Date Handling', () => {
    it('allows multiple checkins for different dates', async () => {
      const { habit } = await createUserWithHabit()

      await db.insert(schema.checkins).values([
        { habitId: habit.id, date: '2025-12-29' },
        { habitId: habit.id, date: '2025-12-30' },
        { habitId: habit.id, date: '2025-12-31' }
      ])

      const checkins = await db.query.checkins.findMany({
        where: eq(schema.checkins.habitId, habit.id)
      })

      expect(checkins).toHaveLength(3)
    })

    it('index makes date lookup efficient', async () => {
      const { habit } = await createUserWithHabit()

      await db.insert(schema.checkins).values({
        habitId: habit.id,
        date: '2025-12-31'
      })

      // This query uses the idx_checkins_habit_date index
      const found = await db.query.checkins.findFirst({
        where: and(
          eq(schema.checkins.habitId, habit.id),
          eq(schema.checkins.date, '2025-12-31')
        )
      })

      expect(found).toBeDefined()
    })
  })

  describe('Cascade Deletes', () => {
    it('deleting habit cascades to checkins', async () => {
      const { habit } = await createUserWithHabit()

      const [checkin] = await db.insert(schema.checkins).values({
        habitId: habit.id,
        date: '2025-12-31'
      }).returning()

      await db.delete(schema.habits).where(eq(schema.habits.id, habit.id))

      const found = await db.query.checkins.findFirst({
        where: eq(schema.checkins.id, checkin.id)
      })

      expect(found).toBeUndefined()
    })
  })

  describe('Isolation', () => {
    it('checkins are isolated per habit', async () => {
      const { habit: habit1 } = await createUserWithHabit()
      const { habit: habit2 } = await createUserWithHabit()

      await db.insert(schema.checkins).values([
        { habitId: habit1.id, date: '2025-12-31' },
        { habitId: habit2.id, date: '2025-12-31' }
      ])

      const habit1Checkins = await db.query.checkins.findMany({
        where: eq(schema.checkins.habitId, habit1.id)
      })

      expect(habit1Checkins).toHaveLength(1)
    })
  })
})
