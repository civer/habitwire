import { eq } from 'drizzle-orm'
import { db } from '@server/database'
import { users, passwordResetTokens } from '@server/database/schema'
import { generateToken, hashToken, getTokenExpiry, TOKEN_EXPIRY } from '@server/utils/tokens'
import { sendEmail, renderPasswordResetEmail } from '@server/utils/email'
import { isSmtpConfigured } from '@server/utils/settings'
import { validateUuidParam } from '@server/utils/validation'
import { logAdminAction } from '@server/utils/audit'

defineRouteMeta({
  openAPI: {
    tags: ['Admin'],
    summary: 'Trigger password reset for user',
    description: 'Sends a password reset email to the user. Admin only.',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
    ],
    responses: {
      200: { description: 'Password reset email sent (if SMTP configured)' },
      400: { description: 'User has no email' },
      401: { description: 'Not authenticated' },
      403: { description: 'Admin access required' },
      404: { description: 'User not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const id = validateUuidParam(getRouterParam(event, 'id'), 'user ID')

  // Check if user exists
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { id: true, email: true, username: true }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  if (!user.email) {
    throw createError({
      statusCode: 400,
      message: 'User has no email address'
    })
  }

  // Check if SMTP is configured
  const smtpConfigured = await isSmtpConfigured()
  if (!smtpConfigured) {
    throw createError({
      statusCode: 400,
      message: 'SMTP is not configured'
    })
  }

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

  // Send email
  const sent = await sendEmail({
    to: user.email,
    subject: 'Reset your password',
    html: renderPasswordResetEmail(resetLink)
  })

  if (!sent) {
    throw createError({
      statusCode: 500,
      message: 'Failed to send email'
    })
  }

  // Audit log
  await logAdminAction(event, {
    action: 'user.password_reset',
    targetType: 'user',
    targetId: user.id,
    details: {
      username: user.username,
      email: user.email
    }
  })

  return {
    success: true,
    message: 'Password reset email sent'
  }
})
