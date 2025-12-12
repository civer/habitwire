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
  const session = await getUserSession(event)

  if (!session.user) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated'
    })
  }

  // Fetch fresh user data including settings
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id)
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
      settings: user.settings || {}
    }
  }
})
