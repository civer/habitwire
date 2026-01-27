import { eq } from 'drizzle-orm'
import { db } from '@server/database'
import { users } from '@server/database/schema'

/**
 * Admin middleware - protects /api/v1/admin/* routes
 * Only allows access if the authenticated user is an admin
 */
export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Only protect /api/v1/admin/* routes
  if (!path.startsWith('/api/v1/admin/')) {
    return
  }

  // User must be authenticated (set by auth middleware)
  const userId = event.context.userId
  if (!userId) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  // Check if user is admin
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { isAdmin: true }
  })

  if (!user?.isAdmin) {
    throw createError({
      statusCode: 403,
      message: 'Admin access required'
    })
  }

  // Set admin flag in context for convenience
  event.context.isAdmin = true
})
