import { eq, and, isNull, gt } from 'drizzle-orm'
import { db } from '@server/database'
import { users, passwordResetTokens } from '@server/database/schema'
import { passwordResetVerifySchema, validateBody } from '@server/utils/validation'
import { hashToken } from '@server/utils/tokens'

defineRouteMeta({
  openAPI: {
    tags: ['Authentication'],
    summary: 'Reset password with token',
    description: 'Resets the password using a valid reset token.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['token', 'password'],
            properties: {
              token: { type: 'string' },
              password: { type: 'string' }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Password reset successful' },
      400: { description: 'Invalid or expired token' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, passwordResetVerifySchema)

  const tokenHash = hashToken(body.token)
  const now = new Date()

  // Atomically find and mark token as used (prevents race conditions)
  // Only updates if token exists, is not used, and not expired
  const [usedToken] = await db.update(passwordResetTokens)
    .set({ usedAt: now })
    .where(and(
      eq(passwordResetTokens.tokenHash, tokenHash),
      isNull(passwordResetTokens.usedAt),
      gt(passwordResetTokens.expiresAt, now)
    ))
    .returning()

  if (!usedToken) {
    throw createError({
      statusCode: 400,
      message: 'Invalid or expired token'
    })
  }

  // Find user
  const user = await db.query.users.findFirst({
    where: eq(users.id, usedToken.userId)
  })

  if (!user) {
    throw createError({
      statusCode: 400,
      message: 'Invalid token'
    })
  }

  // Hash new password
  const passwordHash = await hashPassword(body.password)

  // Update user password
  await db.update(users)
    .set({ passwordHash, updatedAt: now })
    .where(eq(users.id, user.id))

  return {
    success: true,
    message: 'Password has been reset successfully'
  }
})
