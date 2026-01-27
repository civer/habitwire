import { eq } from 'drizzle-orm'
import { db } from '@server/database'
import { users } from '@server/database/schema'
import { registerSchema, validateBody } from '@server/utils/validation'
import { getAuthSettings } from '@server/utils/settings'
import { sendEmail, renderWelcomeEmail } from '@server/utils/email'

defineRouteMeta({
  openAPI: {
    tags: ['Authentication'],
    summary: 'Register a new account',
    description: 'Creates a new user account if registration is enabled.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['username', 'password'],
            properties: {
              username: { type: 'string' },
              email: { type: 'string', format: 'email' },
              password: { type: 'string' }
            }
          }
        }
      }
    },
    responses: {
      201: { description: 'Account created' },
      400: { description: 'Validation error or registration disabled' },
      409: { description: 'Username or email already exists' }
    }
  }
})

export default defineEventHandler(async (event) => {
  // Check if registration is allowed
  const authSettings = await getAuthSettings()

  if (!authSettings.allowRegistration) {
    throw createError({
      statusCode: 400,
      message: 'Registration is currently disabled'
    })
  }

  const body = await validateBody(event, registerSchema)

  // Check if username or email already exists
  // Use unified error message to prevent user enumeration
  const existingUsername = await db.query.users.findFirst({
    where: eq(users.username, body.username)
  })

  if (existingUsername) {
    throw createError({
      statusCode: 409,
      message: 'Username or email already in use'
    })
  }

  // Check if email already exists (if provided)
  if (body.email) {
    const existingEmail = await db.query.users.findFirst({
      where: eq(users.email, body.email)
    })

    if (existingEmail) {
      throw createError({
        statusCode: 409,
        message: 'Username or email already in use'
      })
    }
  }

  // Hash password
  const passwordHash = await hashPassword(body.password)

  // Create user
  const result = await db.insert(users).values({
    username: body.username,
    email: body.email || null,
    passwordHash,
    displayName: body.username,
    isAdmin: false,
    emailVerified: false
  }).returning()

  const newUser = result[0]
  if (!newUser) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create user'
    })
  }

  // Send welcome email if email provided
  if (body.email) {
    // Fire and forget - don't block registration if email fails
    sendEmail({
      to: body.email,
      subject: 'Welcome to HabitWire',
      html: renderWelcomeEmail(body.username)
    }).catch((error) => {
      console.error('[register] Failed to send welcome email:', error)
    })
  }

  // Auto-login after registration
  await setUserSession(event, {
    user: {
      id: newUser.id,
      username: newUser.username,
      displayName: newUser.displayName
    }
  }, {
    maxAge: 60 * 60 * 24 * 30 // 30 days
  })

  setResponseStatus(event, 201)

  return {
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      display_name: newUser.displayName
    }
  }
})
