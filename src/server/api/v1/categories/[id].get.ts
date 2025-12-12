import { getCategoryOrThrow } from '@server/utils/db-helpers'

defineRouteMeta({
  openAPI: {
    tags: ['Categories'],
    summary: 'Get a category',
    description: 'Returns a single category by ID.',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
    ],
    responses: {
      200: { description: 'Category details' },
      401: { description: 'Unauthorized' },
      404: { description: 'Category not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const category = await getCategoryOrThrow(event, id)

  return {
    id: category.id,
    name: category.name,
    icon: category.icon,
    color: category.color,
    sort_order: category.sortOrder,
    created_at: category.createdAt
  }
})
