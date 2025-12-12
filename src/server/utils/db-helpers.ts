import { eq, and } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { db } from '@server/database'
import { habits, categories } from '@server/database/schema'

/**
 * Get a habit by ID, ensuring it belongs to the authenticated user.
 * Throws 404 if not found or doesn't belong to user.
 */
export async function getHabitOrThrow(event: H3Event, habitId: string) {
  const userId = event.context.userId

  if (!habitId) {
    throw createError({
      statusCode: 400,
      message: 'Habit ID is required'
    })
  }

  const habit = await db.query.habits.findFirst({
    where: and(eq(habits.id, habitId), eq(habits.userId, userId))
  })

  if (!habit) {
    throw createError({
      statusCode: 404,
      message: 'Habit not found'
    })
  }

  return habit
}

/**
 * Get a category by ID, ensuring it belongs to the authenticated user.
 * Throws 404 if not found or doesn't belong to user.
 */
export async function getCategoryOrThrow(event: H3Event, categoryId: string) {
  const userId = event.context.userId

  if (!categoryId) {
    throw createError({
      statusCode: 400,
      message: 'Category ID is required'
    })
  }

  const category = await db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), eq(categories.userId, userId))
  })

  if (!category) {
    throw createError({
      statusCode: 404,
      message: 'Category not found'
    })
  }

  return category
}

/**
 * Validate that a category_id belongs to the authenticated user.
 * Returns the category if valid, null if category_id is null/undefined.
 * Throws 400 if category doesn't belong to user.
 */
export async function validateCategoryOwnership(
  event: H3Event,
  categoryId: string | null | undefined
) {
  if (!categoryId) {
    return null
  }

  const userId = event.context.userId

  const category = await db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), eq(categories.userId, userId))
  })

  if (!category) {
    throw createError({
      statusCode: 400,
      message: 'Invalid category'
    })
  }

  return category
}
