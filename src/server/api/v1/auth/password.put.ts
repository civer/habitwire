import { eq } from 'drizzle-orm'
import { db } from '@server/database'
import { users } from '@server/database/schema'
import { passwordChangeSchema, validateBody } from '@server/utils/validation'

defineRouteMeta({
  openAPI: {
    tags: ['Authentication'],
    summary: 'Change password',
    description: 'Changes the password for the authenticated user.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['current_password', 'new_password'],
            properties: {
              current_password: { type: 'string', format: 'password' },
              new_password: { type: 'string', format: 'password' }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Password changed successfully' },
      400: { description: 'Invalid request' },
      401: { description: 'Current password incorrect or not authenticated' }
    }
  }
})

export default defineEventHandler(async (event) => {
  // Use userId from middleware context (works for both session and API key auth)
  const userId = event.context.userId

  if (!userId) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const body = await validateBody(event, passwordChangeSchema)

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  // Check if user has a password set
  if (!user.passwordHash) {
    throw createError({
      statusCode: 400,
      message: 'User does not have a password set'
    })
  }

  const isValid = await verifyPassword(user.passwordHash, body.current_password)

  if (!isValid) {
    throw createError({
      statusCode: 401,
      message: 'Current password is incorrect'
    })
  }

  const newHash = await hashPassword(body.new_password)

  await db.update(users)
    .set({
      passwordHash: newHash,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId))

  // Refresh session after password change (only for web sessions, not API key auth)
  const session = await getUserSession(event)
  if (session.user) {
    await clearUserSession(event)
    await setUserSession(event, {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        isAdmin: user.isAdmin
      }
    }, {
      maxAge: 60 * 60 * 24 * 30 // 30 days
    })
  }

  return { success: true }
})
