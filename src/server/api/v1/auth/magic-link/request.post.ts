import { eq } from 'drizzle-orm'
import { db } from '@server/database'
import { users, magicLinkTokens } from '@server/database/schema'
import { magicLinkRequestSchema, validateBody } from '@server/utils/validation'
import { getAuthSettings, isSmtpConfigured } from '@server/utils/settings'
import { generateToken, hashToken, getTokenExpiry, TOKEN_EXPIRY } from '@server/utils/tokens'
import { sendEmail, renderMagicLinkEmail } from '@server/utils/email'

defineRouteMeta({
  openAPI: {
    tags: ['Authentication'],
    summary: 'Request a magic link',
    description: 'Sends a magic link email for passwordless login.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email'],
            properties: {
              email: { type: 'string', format: 'email' }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'If email exists and SMTP is configured, email will be sent' },
      400: { description: 'Magic link auth not enabled or SMTP not configured' }
    }
  }
})

export default defineEventHandler(async (event) => {
  // Check if magic link auth is enabled
  const authSettings = await getAuthSettings()

  if (!authSettings.methods.includes('magic-link')) {
    throw createError({
      statusCode: 400,
      message: 'Magic link authentication is not enabled'
    })
  }

  // Check if SMTP is configured
  const smtpConfigured = await isSmtpConfigured()
  if (!smtpConfigured) {
    throw createError({
      statusCode: 400,
      message: 'Email service is not configured'
    })
  }

  const body = await validateBody(event, magicLinkRequestSchema)

  // Find user by email
  // IMPORTANT: Always return the same response regardless of whether user exists
  // to prevent user enumeration
  const user = await db.query.users.findFirst({
    where: eq(users.email, body.email),
    columns: { id: true, email: true }
  })

  // Only send email if user exists
  if (user && user.email) {
    // Generate magic link token
    const token = generateToken()
    const tokenHash = hashToken(token)
    const expiresAt = getTokenExpiry(TOKEN_EXPIRY.MAGIC_LINK)

    // Store token
    await db.insert(magicLinkTokens).values({
      email: user.email,
      tokenHash,
      expiresAt
    })

    // Build magic link
    const host = getRequestHost(event, { xForwardedHost: true })
    const protocol = getRequestProtocol(event)
    const magicLink = `${protocol}://${host}/magic-link?token=${token}`

    // Send email (fire and forget logging)
    sendEmail({
      to: user.email,
      subject: 'Sign in to HabitWire',
      html: renderMagicLinkEmail(magicLink)
    }).catch((error) => {
      console.error('[magic-link] Failed to send email:', error)
    })
  }

  // Always return success to prevent user enumeration
  return {
    success: true,
    message: 'If an account exists with this email, a magic link has been sent'
  }
})
