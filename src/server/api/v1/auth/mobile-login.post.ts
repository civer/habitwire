import { eq, or } from 'drizzle-orm'
import { db } from '@server/database'
import { users, apiKeys } from '@server/database/schema'
import { generateApiKey, hashApiKey } from '@server/utils/auth'
import { loginSchema, validateBody } from '@server/utils/validation'

defineRouteMeta({
  openAPI: {
    tags: ['Authentication'],
    summary: 'Mobile Login',
    description: 'Authenticates a user and returns an API key for mobile app use. Creates a new "Mobile App" API key automatically.',
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
      200: { description: 'Login successful, returns user info and API key' },
      400: { description: 'Missing credentials' },
      401: { description: 'Invalid credentials' }
    }
  }
})

// Dummy hash for timing-safe comparison when user doesn't exist
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
  const hashToVerify = user?.passwordHash || DUMMY_HASH
  const valid = await verifyPassword(hashToVerify, body.password)

  // Check all conditions after verification to maintain constant time
  if (!user || !user.passwordHash || !valid) {
    const clientIp = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
    console.warn(`[auth] Failed mobile login attempt for "${body.username}" from IP ${clientIp}`)

    throw createError({
      statusCode: 401,
      message: 'Invalid credentials'
    })
  }

  // Generate new API key for mobile app
  const rawKey = `hw_${generateApiKey()}`
  const keyHash = hashApiKey(rawKey)

  const result = await db.insert(apiKeys).values({
    userId: user.id,
    name: 'Mobile App',
    keyHash
  }).returning()

  const createdKey = result[0]
  if (!createdKey) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create API key'
    })
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      display_name: user.displayName,
      email: user.email,
      email_verified: user.emailVerified,
      is_admin: user.isAdmin
    },
    api_key: rawKey
  }
})
