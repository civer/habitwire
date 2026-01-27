import { eq } from 'drizzle-orm'
import { db } from '@server/database'
import { systemSettings } from '@server/database/schema'

// In-memory cache for settings
const settingsCache = new Map<string, { value: unknown, expires: number }>()
const CACHE_TTL = 60_000 // 60 seconds

// Settings key constants
export const SETTINGS_KEYS = {
  AUTH_ALLOW_REGISTRATION: 'auth.allowRegistration',
  AUTH_REQUIRE_EMAIL_VERIFICATION: 'auth.requireEmailVerification',
  AUTH_METHODS: 'auth.methods',
  EMAIL_SMTP_HOST: 'email.smtp.host',
  EMAIL_SMTP_PORT: 'email.smtp.port',
  EMAIL_SMTP_USER: 'email.smtp.user',
  EMAIL_SMTP_PASSWORD: 'email.smtp.password',
  EMAIL_SMTP_FROM: 'email.smtp.from',
  EMAIL_SMTP_SECURE: 'email.smtp.secure'
} as const

// Default values for settings
export const SETTINGS_DEFAULTS: Record<string, unknown> = {
  [SETTINGS_KEYS.AUTH_ALLOW_REGISTRATION]: false,
  [SETTINGS_KEYS.AUTH_REQUIRE_EMAIL_VERIFICATION]: false,
  [SETTINGS_KEYS.AUTH_METHODS]: ['password'],
  [SETTINGS_KEYS.EMAIL_SMTP_PORT]: 587,
  [SETTINGS_KEYS.EMAIL_SMTP_SECURE]: false
}

export type AuthMethod = 'password' | 'magic-link'

export interface AuthSettings {
  allowRegistration: boolean
  requireEmailVerification: boolean
  methods: AuthMethod[]
}

export interface SmtpSettings {
  host?: string
  port: number
  user?: string
  password?: string
  from?: string
  secure: boolean
}

/**
 * Get a system setting by key
 * Uses in-memory cache with 60 second TTL
 */
export async function getSystemSetting<T>(key: string): Promise<T | null> {
  // Check cache first
  const cached = settingsCache.get(key)
  if (cached && cached.expires > Date.now()) {
    return cached.value as T
  }

  // Fetch from database
  const setting = await db.query.systemSettings.findFirst({
    where: eq(systemSettings.key, key)
  })

  const value = setting ? setting.value as T : (SETTINGS_DEFAULTS[key] as T ?? null)

  // Update cache
  settingsCache.set(key, { value, expires: Date.now() + CACHE_TTL })

  return value
}

/**
 * Set a system setting
 * Also invalidates the cache for this key
 */
export async function setSystemSetting(key: string, value: unknown): Promise<void> {
  await db.insert(systemSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: { value, updatedAt: new Date() }
    })

  // Update cache immediately
  settingsCache.set(key, { value, expires: Date.now() + CACHE_TTL })
}

/**
 * Delete a system setting
 * Used when clearing a setting back to its default
 */
export async function deleteSystemSetting(key: string): Promise<void> {
  await db.delete(systemSettings).where(eq(systemSettings.key, key))

  // Remove from cache
  settingsCache.delete(key)
}

/**
 * Get all system settings
 * Returns an object with all settings and their values
 */
export async function getAllSystemSettings(): Promise<Record<string, unknown>> {
  const settings = await db.query.systemSettings.findMany()
  const result: Record<string, unknown> = { ...SETTINGS_DEFAULTS }

  for (const setting of settings) {
    result[setting.key] = setting.value
    // Also update cache
    settingsCache.set(setting.key, { value: setting.value, expires: Date.now() + CACHE_TTL })
  }

  return result
}

/**
 * Get auth-related settings
 */
export async function getAuthSettings(): Promise<AuthSettings> {
  const [allowRegistration, requireEmailVerification, methods] = await Promise.all([
    getSystemSetting<boolean>(SETTINGS_KEYS.AUTH_ALLOW_REGISTRATION),
    getSystemSetting<boolean>(SETTINGS_KEYS.AUTH_REQUIRE_EMAIL_VERIFICATION),
    getSystemSetting<AuthMethod[]>(SETTINGS_KEYS.AUTH_METHODS)
  ])

  return {
    allowRegistration: allowRegistration ?? false,
    requireEmailVerification: requireEmailVerification ?? false,
    methods: methods ?? ['password']
  }
}

/**
 * Get SMTP settings
 */
export async function getSmtpSettings(): Promise<SmtpSettings> {
  const [host, port, user, password, from, secure] = await Promise.all([
    getSystemSetting<string>(SETTINGS_KEYS.EMAIL_SMTP_HOST),
    getSystemSetting<number>(SETTINGS_KEYS.EMAIL_SMTP_PORT),
    getSystemSetting<string>(SETTINGS_KEYS.EMAIL_SMTP_USER),
    getSystemSetting<string>(SETTINGS_KEYS.EMAIL_SMTP_PASSWORD),
    getSystemSetting<string>(SETTINGS_KEYS.EMAIL_SMTP_FROM),
    getSystemSetting<boolean>(SETTINGS_KEYS.EMAIL_SMTP_SECURE)
  ])

  return {
    host: host ?? undefined,
    port: port ?? 587,
    user: user ?? undefined,
    password: password ?? undefined,
    from: from ?? undefined,
    secure: secure ?? false
  }
}

/**
 * Check if SMTP is configured
 */
export async function isSmtpConfigured(): Promise<boolean> {
  const smtp = await getSmtpSettings()
  return !!(smtp.host && smtp.from)
}

/**
 * Invalidate a specific cache entry
 */
export function invalidateSettingsCache(key?: string): void {
  if (key) {
    settingsCache.delete(key)
  } else {
    settingsCache.clear()
  }
}
