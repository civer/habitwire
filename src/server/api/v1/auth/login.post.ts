import { eq } from 'drizzle-orm'
import { db } from '@server/database'
import { users } from '@server/database/schema'
import { loginSchema, validateBody } from '@server/utils/validation'

defineRouteMeta({
  openAPI: {
    tags: ['Authentication'],
    summary: 'Login',
    description: 'Authenticates a user and creates a session.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['username', 'password'],
            properties: {
              username: { type: 'string' },
              password: { type: 'string', format: 'password' }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Login successful' },
      400: { description: 'Missing credentials' },
      401: { description: 'Invalid credentials' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, loginSchema)

  const user = await db.query.users.findFirst({
    where: eq(users.username, body.username)
  })

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Invalid credentials'
    })
  }

  const valid = await verifyPassword(user.passwordHash, body.password)

  if (!valid) {
    throw createError({
      statusCode: 401,
      message: 'Invalid credentials'
    })
  }

  await setUserSession(event, {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName
    }
  })

  return {
    user: {
      id: user.id,
      username: user.username,
      display_name: user.displayName
    }
  }
})
