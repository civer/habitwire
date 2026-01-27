import { eq } from 'drizzle-orm'
import { db } from '@server/database'
import { apiKeys } from '@server/database/schema'
import { hashApiKey } from '@server/utils/auth'

// Public auth routes that don't require authentication (whitelist approach)
const PUBLIC_AUTH_ROUTES = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/logout',
  '/api/v1/auth/magic-link/request',
  '/api/v1/auth/magic-link/verify',
  '/api/v1/auth/password-reset/request',
  '/api/v1/auth/password-reset/verify',
  '/api/v1/auth/settings' // GET only - public auth settings (methods, registration enabled, etc.)
]

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  const method = getMethod(event)

  // Only protect /api/v1/* routes
  if (!path.startsWith('/api/v1/') || path === '/api/v1/health') {
    return
  }

  // Check if route is in public whitelist
  // Note: /api/v1/auth/settings is only public for GET, PUT requires auth
  const isPublicRoute = PUBLIC_AUTH_ROUTES.includes(path) && !(path === '/api/v1/auth/settings' && method === 'PUT')
  if (isPublicRoute) {
    return
  }

  // Check for session (Web UI)
  const session = await getUserSession(event)
  if (session.user) {
    event.context.userId = session.user.id
    return
  }

  // Check for API Key (external clients)
  // Format: Authorization: ApiKey <key>
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('ApiKey ')) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - Session or API Key required'
    })
  }

  const apiKey = authHeader.slice(7) // Remove "ApiKey " prefix
  if (!apiKey) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - Invalid Authorization header'
    })
  }

  const keyHash = hashApiKey(apiKey)
  const validKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.keyHash, keyHash)
  })

  if (!validKey) {
    throw createError({
      statusCode: 401,
      message: 'Invalid API Key'
    })
  }

  // Update last_used
  await db.update(apiKeys)
    .set({ lastUsed: new Date() })
    .where(eq(apiKeys.id, validKey.id))

  // Set user in event context
  event.context.userId = validKey.userId
})
