import { eq, and, ne } from 'drizzle-orm'
import { db } from '@server/database'
import { users } from '@server/database/schema'
import { updateProfileSchema, validateBody } from '@server/utils/validation'

defineRouteMeta({
  openAPI: {
    tags: ['Authentication'],
    summary: 'Update user profile',
    description: 'Updates the profile (email, display name) for the currently authenticated user.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email', nullable: true },
              display_name: { type: 'string', nullable: true }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Profile updated successfully' },
      401: { description: 'Not authenticated' },
      409: { description: 'Email already exists' }
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

  const body = await validateBody(event, updateProfileSchema)

  // Check if email is being changed and if it's already taken
  if (body.email) {
    const existingUser = await db.query.users.findFirst({
      where: and(
        eq(users.email, body.email),
        ne(users.id, userId)
      )
    })

    if (existingUser) {
      throw createError({
        statusCode: 409,
        message: 'Email already exists'
      })
    }
  }

  // Build update object
  const updateData: Record<string, unknown> = {}

  if (body.email !== undefined) {
    updateData.email = body.email
    // Reset email verification if email changes
    updateData.emailVerified = false
  }

  if (body.display_name !== undefined) {
    updateData.displayName = body.display_name
  }

  if (Object.keys(updateData).length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No fields to update'
    })
  }

  // Update user
  const result = await db.update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning()

  const updatedUser = result[0]
  if (!updatedUser) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  // Update session with new display name if changed (only for web sessions, not API key auth)
  if (body.display_name !== undefined) {
    const session = await getUserSession(event)
    if (session.user) {
      await setUserSession(event, {
        user: {
          ...session.user,
          displayName: updatedUser.displayName
        }
      })
    }
  }

  return {
    user: {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      email_verified: updatedUser.emailVerified,
      display_name: updatedUser.displayName
    }
  }
})
