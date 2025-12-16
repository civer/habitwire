import { db } from '@server/database'
import { habits } from '@server/database/schema'
import { createHabitSchema, validateBody } from '@server/utils/validation'
import { validateCategoryOwnership } from '@server/utils/db-helpers'

defineRouteMeta({
  openAPI: {
    tags: ['Habits'],
    summary: 'Create a new habit',
    description: 'Creates a new habit for the authenticated user.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['title', 'frequency_type'],
            properties: {
              title: { type: 'string', description: 'Habit title' },
              description: { type: 'string', description: 'Habit description' },
              habit_type: { type: 'string', enum: ['SIMPLE', 'TARGET'], default: 'SIMPLE' },
              frequency_type: { type: 'string', enum: ['DAILY', 'WEEKLY', 'CUSTOM'] },
              frequency_value: { type: 'integer', default: 1 },
              active_days: { type: 'array', items: { type: 'integer' }, description: 'Days of week (0=Sun, 1=Mon, ...)' },
              target_value: { type: 'number', description: 'Target value for TARGET habits' },
              default_increment: { type: 'number', description: 'Default increment for TARGET habits' },
              unit: { type: 'string', description: 'Unit for target value (ml, min, km, etc.)' },
              category_id: { type: 'string', format: 'uuid' },
              icon: { type: 'string', description: 'Lucide icon name' }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Created habit' },
      400: { description: 'Invalid request' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const body = await validateBody(event, createHabitSchema)

  // Validate category ownership if provided
  await validateCategoryOwnership(event, body.category_id)

  const result = await db.insert(habits).values({
    userId,
    categoryId: body.category_id ?? null,
    title: body.title,
    description: body.description ?? null,
    habitType: body.habit_type,
    frequencyType: body.frequency_type,
    frequencyValue: body.frequency_value,
    activeDays: body.active_days ?? null,
    timeOfDay: body.time_of_day ?? null,
    targetValue: body.target_value ?? null,
    defaultIncrement: body.default_increment ?? null,
    unit: body.unit ?? null,
    color: body.color ?? null,
    icon: body.icon ?? null,
    sortOrder: body.sort_order,
    promptForNotes: body.prompt_for_notes ?? false
  }).returning()

  const created = result[0]
  if (!created) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create habit'
    })
  }

  setResponseStatus(event, 201)
  return {
    id: created.id,
    category_id: created.categoryId,
    title: created.title,
    description: created.description,
    habit_type: created.habitType,
    frequency_type: created.frequencyType,
    frequency_value: created.frequencyValue,
    active_days: created.activeDays,
    time_of_day: created.timeOfDay,
    target_value: created.targetValue,
    default_increment: created.defaultIncrement,
    unit: created.unit,
    color: created.color,
    icon: created.icon,
    sort_order: created.sortOrder,
    archived: created.archived,
    prompt_for_notes: created.promptForNotes,
    created_at: created.createdAt,
    updated_at: created.updatedAt
  }
})
