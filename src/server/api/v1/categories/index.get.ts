import { eq, asc } from 'drizzle-orm'
import { db } from '@server/database'
import { categories } from '@server/database/schema'

defineRouteMeta({
  openAPI: {
    tags: ['Categories'],
    summary: 'Get all categories',
    description: 'Returns all categories for the authenticated user.',
    responses: {
      200: { description: 'List of categories' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const userId = event.context.userId

  const result = await db.query.categories.findMany({
    where: eq(categories.userId, userId),
    orderBy: asc(categories.name)
  })

  return result.map(c => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    sort_order: c.sortOrder,
    created_at: c.createdAt
  }))
})
