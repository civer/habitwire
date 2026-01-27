import { eq, and, isNull, gt } from 'drizzle-orm'
import { db } from '@server/database'
import { users, magicLinkTokens } from '@server/database/schema'
import { magicLinkVerifySchema, validateBody } from '@server/utils/validation'
import { hashToken } from '@server/utils/tokens'

defineRouteMeta({
  openAPI: {
    tags: ['Authentication'],
    summary: 'Verify a magic link token',
    description: 'Verifies a magic link token and creates a session.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['token'],
            properties: {
              token: { type: 'string' }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Login successful' },
      400: { description: 'Invalid or expired token' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, magicLinkVerifySchema)

  const tokenHash = hashToken(body.token)
  const now = new Date()

  // Atomically find and mark token as used (prevents race conditions)
  // Only updates if token exists, is not used, and not expired
  const [usedToken] = await db.update(magicLinkTokens)
    .set({ usedAt: now })
    .where(and(
      eq(magicLinkTokens.tokenHash, tokenHash),
      isNull(magicLinkTokens.usedAt),
      gt(magicLinkTokens.expiresAt, now)
    ))
    .returning()

  if (!usedToken) {
    throw createError({
      statusCode: 400,
      message: 'Invalid or expired token'
    })
  }

  // Find user by email
  const user = await db.query.users.findFirst({
    where: eq(users.email, usedToken.email)
  })

  if (!user) {
    // This shouldn't happen, but just in case
    throw createError({
      statusCode: 400,
      message: 'Invalid token'
    })
  }

  // Mark email as verified (they proved they own it by clicking the link)
  if (!user.emailVerified) {
    await db.update(users)
      .set({ emailVerified: true, updatedAt: now })
      .where(eq(users.id, user.id))
  }

  // Create session
  await setUserSession(event, {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName
    }
  }, {
    maxAge: 60 * 60 * 24 * 30 // 30 days
  })

  return {
    user: {
      id: user.id,
      username: user.username,
      display_name: user.displayName,
      email: user.email,
      email_verified: true,
      is_admin: user.isAdmin
    }
  }
})
