import { eq, or } from 'drizzle-orm'
import { db } from '@server/database'
import { users } from '@server/database/schema'
import { loginSchema, validateBody } from '@server/utils/validation'

defineRouteMeta({
  openAPI: {
    tags: ['Authentication'],
    summary: 'Login',
    description: 'Authenticates a user and creates a session. Username field accepts either username or email.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['username', 'password'],
            properties: {
              username: { type: 'string', description: 'Username or email' },
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

// Dummy hash for timing-safe comparison when user doesn't exist
// This prevents timing attacks that could reveal whether a username exists
const DUMMY_HASH = '$scrypt$n=16384,r=8,p=1$dummysaltvalue1234$dummyhashvalue1234567890abcdef'

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, loginSchema)

  // Allow login with either username or email
  const user = await db.query.users.findFirst({
    where: or(
      eq(users.username, body.username),
      eq(users.email, body.username)
    )
  })

  // Always perform password verification to prevent timing attacks
  // Use dummy hash if user doesn't exist or has no password
  const hashToVerify = user?.passwordHash || DUMMY_HASH
  const valid = await verifyPassword(hashToVerify, body.password)

  // Check all conditions after verification to maintain constant time
  if (!user || !user.passwordHash || !valid) {
    // Log failed authentication attempt for security monitoring
    const clientIp = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
    console.warn(`[auth] Failed login attempt for "${body.username}" from IP ${clientIp}`)

    throw createError({
      statusCode: 401,
      message: 'Invalid credentials'
    })
  }

  await setUserSession(event, {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      isAdmin: user.isAdmin
    }
  }, {
    maxAge: 60 * 60 * 24 * 30 // 30 days - persistent cookie for PWA
  })

  return {
    user: {
      id: user.id,
      username: user.username,
      display_name: user.displayName,
      email: user.email,
      email_verified: user.emailVerified,
      is_admin: user.isAdmin
    }
  }
})
