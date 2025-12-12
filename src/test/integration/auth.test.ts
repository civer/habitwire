import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import './setup'
import { db, schema } from './setup'
import { hashApiKey, generateApiKey } from '@server/utils/auth'

describe('Auth Integration', () => {
  describe('User Management', () => {
    it('creates a user in the database', async () => {
      const [user] = await db.insert(schema.users).values({
        username: 'testuser',
        passwordHash: 'hashed_password_here'
      }).returning()

      expect(user).toBeDefined()
      expect(user.id).toBeDefined()
      expect(user.username).toBe('testuser')
      expect(user.createdAt).toBeDefined()
    })

    it('enforces unique username constraint', async () => {
      await db.insert(schema.users).values({
        username: 'uniqueuser',
        passwordHash: 'hash1'
      })

      await expect(
        db.insert(schema.users).values({
          username: 'uniqueuser',
          passwordHash: 'hash2'
        })
      ).rejects.toThrow()
    })

    it('stores user settings as JSONB', async () => {
      const [user] = await db.insert(schema.users).values({
        username: 'settingsuser',
        passwordHash: 'hash',
        settings: {
          allowBackfill: true,
          skippedBreaksStreak: false,
          weekStartsOn: 0
        }
      }).returning()

      const found = await db.query.users.findFirst({
        where: eq(schema.users.id, user.id)
      })

      expect(found?.settings).toEqual({
        allowBackfill: true,
        skippedBreaksStreak: false,
        weekStartsOn: 0
      })
    })
  })

  describe('API Key Authentication', () => {
    it('creates and verifies API key by hash', async () => {
      // Create user
      const [user] = await db.insert(schema.users).values({
        username: 'apiuser',
        passwordHash: 'hash'
      }).returning()

      // Generate and store API key
      const plainKey = generateApiKey()
      const keyHash = hashApiKey(plainKey)

      const [apiKey] = await db.insert(schema.apiKeys).values({
        userId: user.id,
        name: 'Test Key',
        keyHash
      }).returning()

      expect(apiKey.id).toBeDefined()
      expect(apiKey.keyHash).toBe(keyHash)

      // Verify key lookup works
      const found = await db.query.apiKeys.findFirst({
        where: eq(schema.apiKeys.keyHash, hashApiKey(plainKey))
      })

      expect(found).toBeDefined()
      expect(found?.userId).toBe(user.id)
    })

    it('wrong API key hash returns no result', async () => {
      const [user] = await db.insert(schema.users).values({
        username: 'apiuser2',
        passwordHash: 'hash'
      }).returning()

      const plainKey = generateApiKey()
      await db.insert(schema.apiKeys).values({
        userId: user.id,
        name: 'Test Key',
        keyHash: hashApiKey(plainKey)
      })

      // Try with wrong key
      const wrongKey = generateApiKey()
      const found = await db.query.apiKeys.findFirst({
        where: eq(schema.apiKeys.keyHash, hashApiKey(wrongKey))
      })

      expect(found).toBeUndefined()
    })

    it('updates lastUsed timestamp', async () => {
      const [user] = await db.insert(schema.users).values({
        username: 'apiuser3',
        passwordHash: 'hash'
      }).returning()

      const [apiKey] = await db.insert(schema.apiKeys).values({
        userId: user.id,
        name: 'Test Key',
        keyHash: hashApiKey(generateApiKey())
      }).returning()

      expect(apiKey.lastUsed).toBeNull()

      // Simulate API key usage
      const now = new Date()
      await db.update(schema.apiKeys)
        .set({ lastUsed: now })
        .where(eq(schema.apiKeys.id, apiKey.id))

      const updated = await db.query.apiKeys.findFirst({
        where: eq(schema.apiKeys.id, apiKey.id)
      })

      expect(updated?.lastUsed).toBeDefined()
    })

    it('cascade deletes API keys when user is deleted', async () => {
      const [user] = await db.insert(schema.users).values({
        username: 'deleteuser',
        passwordHash: 'hash'
      }).returning()

      const [apiKey] = await db.insert(schema.apiKeys).values({
        userId: user.id,
        name: 'Will Be Deleted',
        keyHash: hashApiKey(generateApiKey())
      }).returning()

      // Delete user
      await db.delete(schema.users).where(eq(schema.users.id, user.id))

      // API key should be gone
      const found = await db.query.apiKeys.findFirst({
        where: eq(schema.apiKeys.id, apiKey.id)
      })

      expect(found).toBeUndefined()
    })
  })
})
