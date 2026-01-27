import { eq } from 'drizzle-orm'
import { db } from '@server/database'
import { users } from '@server/database/schema'
import { validateUuidParam } from '@server/utils/validation'

defineRouteMeta({
  openAPI: {
    tags: ['Admin'],
    summary: 'Get user by ID',
    description: 'Returns a single user by ID. Admin only.',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
    ],
    responses: {
      200: { description: 'User details' },
      401: { description: 'Not authenticated' },
      403: { description: 'Admin access required' },
      404: { description: 'User not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const id = validateUuidParam(getRouterParam(event, 'id'), 'user ID')

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: {
      id: true,
      username: true,
      email: true,
      emailVerified: true,
      isAdmin: true,
      displayName: true,
      createdAt: true,
      updatedAt: true
    }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      email_verified: user.emailVerified,
      is_admin: user.isAdmin,
      display_name: user.displayName,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    }
  }
})
