import { describe, it, expect } from 'vitest'
import { eq, and } from 'drizzle-orm'
import { db, schema } from './setup'

describe('Habits Integration', () => {
  // Helper to create a test user
  async function createTestUser(username = 'testuser') {
    const [user] = await db.insert(schema.users).values({
      username,
      passwordHash: 'hash'
    }).returning()
    return user
  }

  describe('CRUD Operations', () => {
    it('creates a DAILY habit', async () => {
      const user = await createTestUser()

      const [habit] = await db.insert(schema.habits).values({
        userId: user.id,
        title: 'Drink water',
        frequencyType: 'DAILY',
        habitType: 'SIMPLE'
      }).returning()

      expect(habit.id).toBeDefined()
      expect(habit.title).toBe('Drink water')
      expect(habit.frequencyType).toBe('DAILY')
      expect(habit.archived).toBe(false)
    })

    it('creates a WEEKLY habit with active days', async () => {
      const user = await createTestUser()

      const [habit] = await db.insert(schema.habits).values({
        userId: user.id,
        title: 'Go to gym',
        frequencyType: 'WEEKLY',
        habitType: 'SIMPLE',
        activeDays: [1, 3, 5] // Mon, Wed, Fri
      }).returning()

      expect(habit.activeDays).toEqual([1, 3, 5])
    })

    it('creates a TARGET habit with value and unit', async () => {
      const user = await createTestUser()

      const [habit] = await db.insert(schema.habits).values({
        userId: user.id,
        title: 'Drink 2L water',
        frequencyType: 'DAILY',
        habitType: 'TARGET',
        targetValue: 2000,
        unit: 'ml',
        defaultIncrement: 250
      }).returning()

      expect(habit.habitType).toBe('TARGET')
      expect(habit.targetValue).toBe(2000)
      expect(habit.unit).toBe('ml')
    })

    it('soft deletes by setting archived=true', async () => {
      const user = await createTestUser()

      const [habit] = await db.insert(schema.habits).values({
        userId: user.id,
        title: 'To Archive',
        frequencyType: 'DAILY',
        habitType: 'SIMPLE'
      }).returning()

      await db.update(schema.habits)
        .set({ archived: true })
        .where(eq(schema.habits.id, habit.id))

      const archived = await db.query.habits.findFirst({
        where: eq(schema.habits.id, habit.id)
      })

      expect(archived?.archived).toBe(true)
    })
  })

  describe('Ownership & Isolation', () => {
    it('users can only see their own habits', async () => {
      const user1 = await createTestUser('user1')
      const user2 = await createTestUser('user2')

      await db.insert(schema.habits).values({
        userId: user1.id,
        title: 'User1 Habit',
        frequencyType: 'DAILY',
        habitType: 'SIMPLE'
      })

      await db.insert(schema.habits).values({
        userId: user2.id,
        title: 'User2 Habit',
        frequencyType: 'DAILY',
        habitType: 'SIMPLE'
      })

      // Query habits for user1 only
      const user1Habits = await db.query.habits.findMany({
        where: eq(schema.habits.userId, user1.id)
      })

      expect(user1Habits).toHaveLength(1)
      expect(user1Habits[0].title).toBe('User1 Habit')
    })

    it('ownership check query returns null for wrong user', async () => {
      const owner = await createTestUser('owner')
      const attacker = await createTestUser('attacker')

      const [habit] = await db.insert(schema.habits).values({
        userId: owner.id,
        title: 'Private Habit',
        frequencyType: 'DAILY',
        habitType: 'SIMPLE'
      }).returning()

      // Attacker tries to access habit
      const found = await db.query.habits.findFirst({
        where: and(
          eq(schema.habits.id, habit.id),
          eq(schema.habits.userId, attacker.id)
        )
      })

      expect(found).toBeUndefined()
    })
  })

  describe('Categories', () => {
    it('creates habit with category', async () => {
      const user = await createTestUser()

      const [category] = await db.insert(schema.categories).values({
        userId: user.id,
        name: 'Health'
      }).returning()

      const [habit] = await db.insert(schema.habits).values({
        userId: user.id,
        title: 'Exercise',
        frequencyType: 'DAILY',
        habitType: 'SIMPLE',
        categoryId: category.id
      }).returning()

      expect(habit.categoryId).toBe(category.id)
    })

    it('category deletion sets habit categoryId to null', async () => {
      const user = await createTestUser()

      const [category] = await db.insert(schema.categories).values({
        userId: user.id,
        name: 'To Delete'
      }).returning()

      const [habit] = await db.insert(schema.habits).values({
        userId: user.id,
        title: 'Orphan Habit',
        frequencyType: 'DAILY',
        habitType: 'SIMPLE',
        categoryId: category.id
      }).returning()

      // Delete category
      await db.delete(schema.categories).where(eq(schema.categories.id, category.id))

      const updated = await db.query.habits.findFirst({
        where: eq(schema.habits.id, habit.id)
      })

      expect(updated?.categoryId).toBeNull()
    })

    it('enforces unique category name per user', async () => {
      const user = await createTestUser()

      await db.insert(schema.categories).values({
        userId: user.id,
        name: 'Health'
      })

      await expect(
        db.insert(schema.categories).values({
          userId: user.id,
          name: 'Health'
        })
      ).rejects.toThrow()
    })

    it('different users can have same category name', async () => {
      const user1 = await createTestUser('catuser1')
      const user2 = await createTestUser('catuser2')

      await db.insert(schema.categories).values({
        userId: user1.id,
        name: 'Health'
      })

      // Should NOT throw
      const [cat2] = await db.insert(schema.categories).values({
        userId: user2.id,
        name: 'Health'
      }).returning()

      expect(cat2.name).toBe('Health')
    })
  })

  describe('Cascade Deletes', () => {
    it('deleting user cascades to habits', async () => {
      const user = await createTestUser()

      const [habit] = await db.insert(schema.habits).values({
        userId: user.id,
        title: 'Will Be Deleted',
        frequencyType: 'DAILY',
        habitType: 'SIMPLE'
      }).returning()

      await db.delete(schema.users).where(eq(schema.users.id, user.id))

      const found = await db.query.habits.findFirst({
        where: eq(schema.habits.id, habit.id)
      })

      expect(found).toBeUndefined()
    })
  })

  describe('Notes Feature', () => {
    it('creates SIMPLE habit with prompt_for_notes enabled', async () => {
      const user = await createTestUser()

      const [habit] = await db.insert(schema.habits).values({
        userId: user.id,
        title: 'Journal',
        frequencyType: 'DAILY',
        habitType: 'SIMPLE',
        promptForNotes: true
      }).returning()

      expect(habit.promptForNotes).toBe(true)
    })

    it('creates habit with prompt_for_notes disabled by default', async () => {
      const user = await createTestUser()

      const [habit] = await db.insert(schema.habits).values({
        userId: user.id,
        title: 'Exercise',
        frequencyType: 'DAILY',
        habitType: 'SIMPLE'
      }).returning()

      expect(habit.promptForNotes).toBe(false)
    })

    it('updates prompt_for_notes on existing habit', async () => {
      const user = await createTestUser()

      const [habit] = await db.insert(schema.habits).values({
        userId: user.id,
        title: 'Reading',
        frequencyType: 'DAILY',
        habitType: 'SIMPLE',
        promptForNotes: false
      }).returning()

      await db.update(schema.habits)
        .set({ promptForNotes: true })
        .where(eq(schema.habits.id, habit.id))

      const updated = await db.query.habits.findFirst({
        where: eq(schema.habits.id, habit.id)
      })

      expect(updated?.promptForNotes).toBe(true)
    })
  })
})
