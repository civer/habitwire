import { describe, it, expect } from 'vitest'
import { hashApiKey, generateApiKey } from '@server/utils/auth'

describe('auth-utils.ts', () => {
  describe('generateApiKey', () => {
    it('generates a base64url encoded string', () => {
      const key = generateApiKey()
      // base64url uses only [A-Za-z0-9_-]
      expect(key).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('generates 43 character keys (32 bytes in base64url)', () => {
      const key = generateApiKey()
      // 32 bytes → 43 chars in base64url (without padding)
      expect(key.length).toBe(43)
    })

    it('generates unique keys', () => {
      const keys = new Set<string>()
      for (let i = 0; i < 100; i++) {
        keys.add(generateApiKey())
      }
      expect(keys.size).toBe(100)
    })
  })

  describe('hashApiKey', () => {
    it('returns a SHA-256 hex string (64 chars)', () => {
      const hash = hashApiKey('test-key')
      expect(hash.length).toBe(64)
      expect(hash).toMatch(/^[a-f0-9]+$/)
    })

    it('produces consistent hashes for same input', () => {
      const key = 'my-api-key'
      const hash1 = hashApiKey(key)
      const hash2 = hashApiKey(key)
      expect(hash1).toBe(hash2)
    })

    it('produces different hashes for different inputs', () => {
      const hash1 = hashApiKey('key-1')
      const hash2 = hashApiKey('key-2')
      expect(hash1).not.toBe(hash2)
    })

    it('handles empty string', () => {
      const hash = hashApiKey('')
      expect(hash.length).toBe(64)
      // SHA-256 of empty string is a known value
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    })

    it('handles special characters', () => {
      const hash = hashApiKey('key-with-émojis-🔑-and-Ümläuts')
      expect(hash.length).toBe(64)
      expect(hash).toMatch(/^[a-f0-9]+$/)
    })

    it('integration: hash generated key', () => {
      const key = generateApiKey()
      const hash = hashApiKey(key)

      expect(hash.length).toBe(64)
      // Re-hashing should produce same result
      expect(hashApiKey(key)).toBe(hash)
    })
  })
})
