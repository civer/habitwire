import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto'
import { getSmtpSettings } from './settings'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

// Cache transporter to reuse connections
let transporterCache: Transporter | null = null
let transporterConfigHash: string | null = null

/**
 * Get or create nodemailer transporter
 */
async function getTransporter(): Promise<Transporter | null> {
  const smtp = await getSmtpSettings()

  if (!smtp.host || !smtp.from) {
    return null
  }

  // Create a hash of the config to detect changes
  const configHash = JSON.stringify({
    host: smtp.host,
    port: smtp.port,
    user: smtp.user,
    secure: smtp.secure
  })

  // Reuse existing transporter if config hasn't changed
  if (transporterCache && transporterConfigHash === configHash) {
    return transporterCache
  }

  // Decrypt password if set
  const password = smtp.password ? decryptSmtpPassword(smtp.password) : undefined

  transporterCache = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user
      ? {
          user: smtp.user,
          pass: password
        }
      : undefined
  })

  transporterConfigHash = configHash
  return transporterCache
}

/**
 * Send an email
 * Returns true if sent successfully, false otherwise
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    const transporter = await getTransporter()
    if (!transporter) {
      console.warn('[email] SMTP not configured, cannot send email')
      return false
    }

    const smtp = await getSmtpSettings()

    await transporter.sendMail({
      from: smtp.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html)
    })

    return true
  } catch (error) {
    console.error('[email] Failed to send email:', error)
    return false
  }
}

/**
 * Test SMTP connection
 */
export async function testSmtpConnection(): Promise<{ success: boolean, error?: string }> {
  try {
    const transporter = await getTransporter()
    if (!transporter) {
      return { success: false, error: 'SMTP not configured' }
    }

    await transporter.verify()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Send a test email
 */
export async function sendTestEmail(to: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'HabitWire - Test Email',
    html: renderTestEmail()
  })
}

// ============================================================================
// Email Templates
// ============================================================================

/**
 * Render magic link email
 */
export function renderMagicLinkEmail(link: string, appName: string = 'HabitWire'): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to ${appName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #22c55e; margin: 0;">${appName}</h1>
  </div>

  <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="margin-top: 0;">Sign in to your account</h2>
    <p>Click the button below to sign in to your ${appName} account. This link will expire in 15 minutes.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${link}" style="display: inline-block; background: #22c55e; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 500;">
        Sign in to ${appName}
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      If the button doesn't work, copy and paste this link into your browser:
      <br>
      <a href="${link}" style="color: #22c55e; word-break: break-all;">${link}</a>
    </p>
  </div>

  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    If you didn't request this email, you can safely ignore it.
  </p>
</body>
</html>
  `.trim()
}

/**
 * Render password reset email
 */
export function renderPasswordResetEmail(link: string, appName: string = 'HabitWire'): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #22c55e; margin: 0;">${appName}</h1>
  </div>

  <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="margin-top: 0;">Reset your password</h2>
    <p>We received a request to reset your password. Click the button below to choose a new password. This link will expire in 1 hour.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${link}" style="display: inline-block; background: #22c55e; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 500;">
        Reset password
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      If the button doesn't work, copy and paste this link into your browser:
      <br>
      <a href="${link}" style="color: #22c55e; word-break: break-all;">${link}</a>
    </p>
  </div>

  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    If you didn't request a password reset, you can safely ignore this email.
    Your password will remain unchanged.
  </p>
</body>
</html>
  `.trim()
}

/**
 * Render welcome/registration email
 */
export function renderWelcomeEmail(username: string, appName: string = 'HabitWire'): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${appName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #22c55e; margin: 0;">${appName}</h1>
  </div>

  <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="margin-top: 0;">Welcome, ${username}!</h2>
    <p>Your account has been created successfully. You can now start tracking your habits and building better routines.</p>

    <h3>Getting started:</h3>
    <ul>
      <li>Create your first habit</li>
      <li>Set up categories to organize your habits</li>
      <li>Track your progress daily</li>
    </ul>
  </div>

  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    Happy habit tracking!
  </p>
</body>
</html>
  `.trim()
}

/**
 * Render test email
 */
function renderTestEmail(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #22c55e; margin: 0;">HabitWire</h1>
  </div>

  <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="margin-top: 0;">Test Email</h2>
    <p>If you're reading this, your SMTP configuration is working correctly!</p>
    <p style="color: #6b7280; font-size: 14px;">
      Sent at: ${new Date().toISOString()}
    </p>
  </div>
</body>
</html>
  `.trim()
}

// ============================================================================
// SMTP Password Encryption
// ============================================================================

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KDF_SALT = 'habitwire-smtp-encryption-v1' // Static salt for deterministic key derivation
const KDF_ITERATIONS = 100000

// Cache derived key to avoid repeated PBKDF2 computation
let cachedKey: Buffer | null = null

/**
 * Get encryption key from environment
 * Uses PBKDF2 to derive a secure key from NUXT_SESSION_PASSWORD
 */
function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey

  const password = process.env.NUXT_SESSION_PASSWORD
  if (!password || password.length < 32) {
    throw new Error('NUXT_SESSION_PASSWORD must be at least 32 characters for SMTP password encryption')
  }

  // Derive key using PBKDF2 (OWASP recommended)
  cachedKey = pbkdf2Sync(password, KDF_SALT, KDF_ITERATIONS, 32, 'sha256')
  return cachedKey
}

/**
 * Encrypt SMTP password
 * Returns base64 encoded string: iv + authTag + ciphertext
 */
export function encryptSmtpPassword(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf-8'),
    cipher.final()
  ])

  const authTag = cipher.getAuthTag()

  // Combine: iv (12) + authTag (16) + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted])
  return combined.toString('base64')
}

/**
 * Decrypt SMTP password
 */
export function decryptSmtpPassword(encrypted: string): string {
  const key = getEncryptionKey()
  const combined = Buffer.from(encrypted, 'base64')

  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ])

  return decrypted.toString('utf-8')
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Simple HTML to plain text conversion
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Invalidate transporter cache (e.g., after settings change)
 */
export function invalidateTransporterCache(): void {
  transporterCache = null
  transporterConfigHash = null
}
