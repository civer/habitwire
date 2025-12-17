import { z } from 'zod'

/**
 * Shared Zod schema for habit creation and editing forms.
 * Requires i18n `t` function for localized validation messages.
 */
export function useHabitSchema(t: (key: string, params?: Record<string, unknown>) => string) {
  const baseSchema = z.object({
    title: z.string().min(1, t('validation.required', { field: t('habits.habitTitle') })),
    description: z.string().optional(),
    habit_type: z.enum(['SIMPLE', 'TARGET']),
    frequency_type: z.enum(['DAILY', 'WEEKLY', 'CUSTOM']),
    frequency_value: z.coerce.number().optional(),
    active_days: z.array(z.number()).optional(),
    target_value: z.union([z.coerce.number().positive(), z.null(), z.literal('')]).optional(),
    default_increment: z.union([z.coerce.number().positive(), z.null(), z.literal('')]).optional(),
    unit: z.string().optional(),
    category_id: z.string().nullish(),
    icon: z.string().optional(),
    color: z.string().optional(),
    prompt_for_notes: z.boolean().optional()
  })

  const schema = baseSchema.superRefine((data, ctx) => {
    // WEEKLY requires at least one active day
    if (data.frequency_type === 'WEEKLY' && (!data.active_days || data.active_days.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('validation.selectAtLeastOneDay'),
        path: ['active_days']
      })
    }
    // CUSTOM requires frequency_value >= 1
    if (data.frequency_type === 'CUSTOM' && (!data.frequency_value || data.frequency_value < 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('validation.minValue', { min: 1 }),
        path: ['frequency_value']
      })
    }
  })

  type HabitSchema = z.output<typeof schema>

  return {
    schema,
    type: {} as HabitSchema
  }
}

export type HabitFormSchema = ReturnType<typeof useHabitSchema>['type']
