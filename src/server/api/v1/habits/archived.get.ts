import { eq, and } from 'drizzle-orm'
import { db } from '@server/database'
import { habits } from '@server/database/schema'
import { mapHabitToResponse } from '@server/utils/response-mappers'

defineRouteMeta({
  openAPI: {
    tags: ['Habits'],
    summary: 'Get archived habits',
    description: 'Returns only archived habits.',
    responses: {
      200: { description: 'List of archived habits' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const userId = event.context.userId

  const result = await db.query.habits.findMany({
    where: and(eq(habits.userId, userId), eq(habits.archived, true)),
    orderBy: habits.sortOrder
  })

  return result.map(mapHabitToResponse)
})
