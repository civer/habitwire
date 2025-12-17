import type { habits } from '@server/database/schema'

type Habit = typeof habits.$inferSelect

/**
 * Maps a habit database record to API response format (camelCase → snake_case).
 * Used across all habit endpoints for consistent response formatting.
 */
export function mapHabitToResponse(habit: Habit) {
  return {
    id: habit.id,
    category_id: habit.categoryId,
    title: habit.title,
    description: habit.description,
    habit_type: habit.habitType,
    frequency_type: habit.frequencyType,
    frequency_value: habit.frequencyValue,
    frequency_period: habit.frequencyPeriod,
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
    updated_at: habit.updatedAt,
    prompt_for_notes: habit.promptForNotes
  }
}

export type HabitResponse = ReturnType<typeof mapHabitToResponse>
