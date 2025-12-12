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
  const session = await getUserSession(event)

  if (!session.user?.id) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const body = await validateBody(event, passwordChangeSchema)

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id)
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
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
    .where(eq(users.id, session.user.id))

  return { success: true }
})
