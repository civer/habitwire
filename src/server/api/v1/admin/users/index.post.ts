import { eq } from 'drizzle-orm'
import { db } from '@server/database'
import { users } from '@server/database/schema'
import { createUserSchema, validateBody } from '@server/utils/validation'
import { logAdminAction } from '@server/utils/audit'

defineRouteMeta({
  openAPI: {
    tags: ['Admin'],
    summary: 'Create a new user',
    description: 'Creates a new user. Admin only.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['username'],
            properties: {
              username: { type: 'string' },
              email: { type: 'string', format: 'email' },
              password: { type: 'string' },
              display_name: { type: 'string' },
              is_admin: { type: 'boolean' }
            }
          }
        }
      }
    },
    responses: {
      201: { description: 'User created' },
      400: { description: 'Validation error or username/email already exists' },
      401: { description: 'Not authenticated' },
      403: { description: 'Admin access required' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, createUserSchema)

  // Check if username already exists
  const existingUsername = await db.query.users.findFirst({
    where: eq(users.username, body.username)
  })

  if (existingUsername) {
    throw createError({
      statusCode: 400,
      message: 'Username already exists'
    })
  }

  // Check if email already exists (if provided)
  if (body.email) {
    const existingEmail = await db.query.users.findFirst({
      where: eq(users.email, body.email)
    })

    if (existingEmail) {
      throw createError({
        statusCode: 400,
        message: 'Email already exists'
      })
    }
  }

  // Hash password if provided
  let passwordHash: string | null = null
  if (body.password) {
    passwordHash = await hashPassword(body.password)
  }

  const result = await db.insert(users).values({
    username: body.username,
    email: body.email || null,
    passwordHash,
    displayName: body.display_name || body.username,
    isAdmin: body.is_admin || false,
    emailVerified: false
  }).returning()

  const newUser = result[0]
  if (!newUser) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create user'
    })
  }

  // Audit log
  await logAdminAction(event, {
    action: 'user.create',
    targetType: 'user',
    targetId: newUser.id,
    details: {
      username: newUser.username,
      email: newUser.email,
      isAdmin: newUser.isAdmin
    }
  })

  setResponseStatus(event, 201)

  return {
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      email_verified: newUser.emailVerified,
      is_admin: newUser.isAdmin,
      display_name: newUser.displayName,
      created_at: newUser.createdAt
    }
  }
})
