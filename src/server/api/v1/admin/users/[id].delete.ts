import { eq, count } from 'drizzle-orm'
import { db } from '@server/database'
import { users } from '@server/database/schema'
import { validateUuidParam } from '@server/utils/validation'
import { logAdminAction } from '@server/utils/audit'

defineRouteMeta({
  openAPI: {
    tags: ['Admin'],
    summary: 'Delete user',
    description: 'Deletes a user and all their data (habits, check-ins, etc.). Admin only.',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
    ],
    responses: {
      200: { description: 'User deleted' },
      400: { description: 'Cannot delete last admin or yourself' },
      401: { description: 'Not authenticated' },
      403: { description: 'Admin access required' },
      404: { description: 'User not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const id = validateUuidParam(getRouterParam(event, 'id'), 'user ID')
  const currentUserId = event.context.userId

  // Prevent self-deletion
  if (id === currentUserId) {
    throw createError({
      statusCode: 400,
      message: 'Cannot delete your own account'
    })
  }

  // Check if user exists
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { id: true, username: true, email: true, isAdmin: true }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  // Prevent deleting the last admin
  if (user.isAdmin) {
    const [result] = await db.select({ count: count() })
      .from(users)
      .where(eq(users.isAdmin, true))
    if ((result?.count ?? 0) <= 1) {
      throw createError({
        statusCode: 400,
        message: 'Cannot delete the last admin'
      })
    }
  }

  // Audit log (before deletion to capture user info)
  await logAdminAction(event, {
    action: 'user.delete',
    targetType: 'user',
    targetId: id,
    details: {
      username: user.username,
      email: user.email,
      wasAdmin: user.isAdmin
    }
  })

  // Delete user (CASCADE will remove all related data)
  await db.delete(users).where(eq(users.id, id))

  return { success: true }
})
