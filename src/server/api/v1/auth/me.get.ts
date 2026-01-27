import { eq } from 'drizzle-orm'
import { db } from '@server/database'
import { users } from '@server/database/schema'

defineRouteMeta({
  openAPI: {
    tags: ['Authentication'],
    summary: 'Get current user',
    description: 'Returns the currently authenticated user including settings.',
    responses: {
      200: { description: 'Current user info' },
      401: { description: 'Not authenticated' }
    }
  }
})

export default defineEventHandler(async (event) => {
  // Support both session auth (web) and API key auth (mobile/external)
  let userId: string | undefined

  // Check for API key auth first (set by auth middleware)
  if (event.context.userId) {
    userId = event.context.userId
  } else {
    // Fall back to session auth
    const session = await getUserSession(event)
    userId = session.user?.id
  }

  if (!userId) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated'
    })
  }

  // Fetch fresh user data including settings
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  })

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'User not found'
    })
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      display_name: user.displayName,
      email: user.email,
      email_verified: user.emailVerified,
      is_admin: user.isAdmin,
      settings: user.settings || {}
    }
  }
})
