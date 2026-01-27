import { eq } from 'drizzle-orm'
import { db } from '@server/database'
import { users, passwordResetTokens } from '@server/database/schema'
import { passwordResetRequestSchema, validateBody } from '@server/utils/validation'
import { isSmtpConfigured } from '@server/utils/settings'
import { generateToken, hashToken, getTokenExpiry, TOKEN_EXPIRY } from '@server/utils/tokens'
import { sendEmail, renderPasswordResetEmail } from '@server/utils/email'

defineRouteMeta({
  openAPI: {
    tags: ['Authentication'],
    summary: 'Request a password reset',
    description: 'Sends a password reset email if the email is associated with an account.',
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
      400: { description: 'Email service not configured' }
    }
  }
})

export default defineEventHandler(async (event) => {
  // Check if SMTP is configured
  const smtpConfigured = await isSmtpConfigured()
  if (!smtpConfigured) {
    throw createError({
      statusCode: 400,
      message: 'Email service is not configured'
    })
  }

  const body = await validateBody(event, passwordResetRequestSchema)

  // Find user by email
  // IMPORTANT: Always return the same response regardless of whether user exists
  // to prevent user enumeration
  const user = await db.query.users.findFirst({
    where: eq(users.email, body.email),
    columns: { id: true, email: true }
  })

  // Only send email if user exists
  if (user && user.email) {
    // Generate reset token
    const token = generateToken()
    const tokenHash = hashToken(token)
    const expiresAt = getTokenExpiry(TOKEN_EXPIRY.PASSWORD_RESET)

    // Store token
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt
    })

    // Build reset link
    const host = getRequestHost(event, { xForwardedHost: true })
    const protocol = getRequestProtocol(event)
    const resetLink = `${protocol}://${host}/reset-password?token=${token}`

    // Send email (fire and forget logging)
    sendEmail({
      to: user.email,
      subject: 'Reset your password',
      html: renderPasswordResetEmail(resetLink)
    }).catch((error) => {
      console.error('[password-reset] Failed to send email:', error)
    })
  }

  // Always return success to prevent user enumeration
  return {
    success: true,
    message: 'If an account exists with this email, a password reset link has been sent'
  }
})
