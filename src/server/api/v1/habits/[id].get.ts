import { getHabitOrThrow } from '@server/utils/db-helpers'

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
  const id = getRouterParam(event, 'id')!
  const habit = await getHabitOrThrow(event, id)

  return {
    id: habit.id,
    category_id: habit.categoryId,
    title: habit.title,
    description: habit.description,
    habit_type: habit.habitType,
    frequency_type: habit.frequencyType,
    frequency_value: habit.frequencyValue,
    active_days: habit.activeDays,
    time_of_day: habit.timeOfDay,
    target_value: habit.targetValue,
    default_increment: habit.defaultIncrement,
    unit: habit.unit,
    color: habit.color,
    icon: habit.icon,
    sort_order: habit.sortOrder,
    archived: habit.archived,
    created_at: habit.createdAt,
    updated_at: habit.updatedAt
  }
})
