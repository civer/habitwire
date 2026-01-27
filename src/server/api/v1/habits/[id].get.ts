import { getHabitOrThrow } from '@server/utils/db-helpers'
import { mapHabitToResponse } from '@server/utils/response-mappers'
import { validateUuidParam } from '@server/utils/validation'

defineRouteMeta({
  openAPI: {
    tags: ['Habits'],
    summary: 'Get a habit by ID',
    description: 'Returns a single habit by its ID.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        description: 'Habit ID',
        required: true,
        schema: { type: 'string', format: 'uuid' }
      }
    ],
    responses: {
      200: { description: 'Habit details' },
      401: { description: 'Unauthorized' },
      404: { description: 'Habit not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const id = validateUuidParam(getRouterParam(event, 'id'), 'habit ID')
  const habit = await getHabitOrThrow(event, id)

  return mapHabitToResponse(habit)
})
