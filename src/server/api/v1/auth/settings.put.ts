import { eq } from 'drizzle-orm'
import { db } from '@server/database'
import { users } from '@server/database/schema'
import { settingsSchema, validateBody } from '@server/utils/validation'

defineRouteMeta({
  openAPI: {
    tags: ['Authentication'],
    summary: 'Update user settings',
    description: 'Updates the settings for the currently authenticated user.',
    responses: {
      200: { description: 'Settings updated successfully' },
      401: { description: 'Not authenticated' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)

  if (!session.user?.id) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  // Validate body with whitelist - only allowed fields will pass
  const body = await validateBody(event, settingsSchema)

  // Get current user settings
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id)
  })

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'User not found'
    })
  }

  // Merge new settings with existing (only whitelisted fields from body)
  const currentSettings = (user.settings || {}) as Record<string, unknown>
  const newSettings = {
    ...currentSettings,
    ...body
  }

  // Update user settings
  await db.update(users)
    .set({ settings: newSettings })
    .where(eq(users.id, session.user.id))

  return { settings: newSettings }
})
