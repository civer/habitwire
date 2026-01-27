import { eq, and, ne, count } from 'drizzle-orm'
import { db } from '@server/database'
import { users } from '@server/database/schema'
import { updateUserSchema, validateBody, validateUuidParam } from '@server/utils/validation'
import { logAdminAction } from '@server/utils/audit'

defineRouteMeta({
  openAPI: {
    tags: ['Admin'],
    summary: 'Update user',
    description: 'Updates a user by ID. Admin only.',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              username: { type: 'string' },
              email: { type: 'string', format: 'email' },
              display_name: { type: 'string' },
              is_admin: { type: 'boolean' },
              email_verified: { type: 'boolean' }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'User updated' },
      400: { description: 'Validation error or username/email already exists' },
      401: { description: 'Not authenticated' },
      403: { description: 'Admin access required' },
      404: { description: 'User not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const id = validateUuidParam(getRouterParam(event, 'id'), 'user ID')

  const body = await validateBody(event, updateUserSchema)

  // Check if user exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, id)
  })

  if (!existingUser) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  // Check if trying to remove admin from the last admin
  if (body.is_admin === false && existingUser.isAdmin) {
    const [result] = await db.select({ count: count() })
      .from(users)
      .where(eq(users.isAdmin, true))
    if ((result?.count ?? 0) <= 1) {
      throw createError({
        statusCode: 400,
        message: 'Cannot remove admin status from the last admin'
      })
    }
  }

  // Check if username is taken by another user
  if (body.username && body.username !== existingUser.username) {
    const usernameExists = await db.query.users.findFirst({
      where: and(
        eq(users.username, body.username),
        ne(users.id, id)
      )
    })

    if (usernameExists) {
      throw createError({
        statusCode: 400,
        message: 'Username already exists'
      })
    }
  }

  // Check if email is taken by another user
  if (body.email && body.email !== existingUser.email) {
    const emailExists = await db.query.users.findFirst({
      where: and(
        eq(users.email, body.email),
        ne(users.id, id)
      )
    })

    if (emailExists) {
      throw createError({
        statusCode: 400,
        message: 'Email already exists'
      })
    }
  }

  // Build update object
  const updateData: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date()
  }

  if (body.username !== undefined) updateData.username = body.username
  if (body.email !== undefined) updateData.email = body.email
  if (body.display_name !== undefined) updateData.displayName = body.display_name
  if (body.is_admin !== undefined) updateData.isAdmin = body.is_admin
  if (body.email_verified !== undefined) updateData.emailVerified = body.email_verified

  const result = await db.update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning()

  const updatedUser = result[0]
  if (!updatedUser) {
    throw createError({
      statusCode: 500,
      message: 'Failed to update user'
    })
  }

  // Build changes object for audit log (only include what actually changed)
  const changes: Record<string, { from: unknown, to: unknown }> = {}
  if (body.username !== undefined && body.username !== existingUser.username) {
    changes.username = { from: existingUser.username, to: body.username }
  }
  if (body.email !== undefined && body.email !== existingUser.email) {
    changes.email = { from: existingUser.email, to: body.email }
  }
  if (body.display_name !== undefined && body.display_name !== existingUser.displayName) {
    changes.displayName = { from: existingUser.displayName, to: body.display_name }
  }
  if (body.is_admin !== undefined && body.is_admin !== existingUser.isAdmin) {
    changes.isAdmin = { from: existingUser.isAdmin, to: body.is_admin }
  }
  if (body.email_verified !== undefined && body.email_verified !== existingUser.emailVerified) {
    changes.emailVerified = { from: existingUser.emailVerified, to: body.email_verified }
  }

  // Audit log
  await logAdminAction(event, {
    action: 'user.update',
    targetType: 'user',
    targetId: id,
    details: {
      username: updatedUser.username,
      changes
    }
  })

  return {
    user: {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      email_verified: updatedUser.emailVerified,
      is_admin: updatedUser.isAdmin,
      display_name: updatedUser.displayName,
      created_at: updatedUser.createdAt,
      updated_at: updatedUser.updatedAt
    }
  }
})
