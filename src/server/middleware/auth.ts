import { eq } from 'drizzle-orm'
import { db } from '@server/database'
import { apiKeys } from '@server/database/schema'
import { hashApiKey } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Only protect /api/v1/* routes (except public endpoints)
  if (!path.startsWith('/api/v1/') || path.startsWith('/api/v1/auth/') || path === '/api/v1/health') {
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
