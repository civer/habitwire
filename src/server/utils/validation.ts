import { z } from 'zod'

// Type helper for H3Event (auto-imported in Nuxt)
import type { H3Event } from 'h3'

// ============================================================
// Shared Field Schemas
// ============================================================

// Hex color: #RGB or #RRGGBB (case insensitive)
const colorSchema = z.string()
  .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Invalid hex color format')
  .nullable()
  .optional()

// Icon: must be i-{collection}-{name} format (lucide, simple-icons, etc.)
const iconSchema = z.string()
  .regex(/^i-[a-z]+-[a-z0-9-]+$/, 'Invalid icon format (expected: i-lucide-name)')
  .max(100)
  .nullable()
  .optional()

// Active days: array of weekday numbers (0=Sunday, 6=Saturday), no duplicates
const activeDaysSchema = z.array(z.number().int().min(0).max(6))
  .refine(
    days => new Set(days).size === days.length,
    { message: 'active_days must not contain duplicates' }
  )
  .nullable()
  .optional()

// ============================================================
// Auth Schemas
// ============================================================

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
})

export const passwordChangeSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters')
})

// Week start day enum (internal)
const weekStartsOnEnum = z.enum(['monday', 'sunday'])

// Settings whitelist - only these fields are allowed
export const settingsSchema = z.object({
  allowBackfill: z.boolean().optional(),
  groupByCategory: z.boolean().optional(),
  skippedBreaksStreak: z.boolean().optional(),
  desktopDaysToShow: z.number().int().min(7).max(31).optional(),
  weekStartsOn: weekStartsOnEnum.optional(),
  enableNotes: z.boolean().optional()
}).strict() // Reject any additional fields

// ============================================================
// Habit Schemas
// ============================================================

const habitTypeEnum = z.enum(['SIMPLE', 'TARGET'])
const frequencyTypeEnum = z.enum(['DAILY', 'WEEKLY', 'CUSTOM'])

// Base habit schema without refinement
const baseHabitSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).nullable().optional(),
  habit_type: habitTypeEnum.default('SIMPLE'),
  frequency_type: frequencyTypeEnum,
  frequency_value: z.number().int().positive().default(1),
  active_days: activeDaysSchema,
  time_of_day: z.string().nullable().optional(),
  target_value: z.number().int().nullable().optional(),
  default_increment: z.number().int().nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
  color: colorSchema,
  icon: iconSchema,
  category_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().default(0),
  prompt_for_notes: z.boolean().optional()
})

export const createHabitSchema = baseHabitSchema.refine(
  (data) => {
    // WEEKLY requires active_days to specify which days
    // CUSTOM uses frequency_value for "X times per week" without specific days
    if (data.frequency_type === 'WEEKLY') {
      return data.active_days && data.active_days.length > 0
    }
    return true
  },
  {
    message: 'active_days is required for WEEKLY frequency type',
    path: ['active_days']
  }
)

// Base update schema without refinement
const baseUpdateHabitSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  habit_type: habitTypeEnum.optional(),
  frequency_type: frequencyTypeEnum.optional(),
  frequency_value: z.number().int().positive().optional(),
  active_days: activeDaysSchema,
  time_of_day: z.string().nullable().optional(),
  target_value: z.number().int().nullable().optional(),
  default_increment: z.number().int().nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
  color: colorSchema,
  icon: iconSchema,
  category_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().optional(),
  archived: z.boolean().optional(),
  prompt_for_notes: z.boolean().optional()
})

export const updateHabitSchema = baseUpdateHabitSchema.refine(
  (data) => {
    // If changing to WEEKLY, active_days must be provided
    // CUSTOM uses frequency_value for "X times per week" without specific days
    if (data.frequency_type === 'WEEKLY') {
      return data.active_days && data.active_days.length > 0
    }
    return true
  },
  {
    message: 'active_days is required when changing to WEEKLY frequency type',
    path: ['active_days']
  }
)

// ============================================================
// Checkin Schemas
// ============================================================

// Date string in YYYY-MM-DD format
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional()

// Metadata with size limits (64KB max, 50 keys max)
const metadataSchema = z.record(z.string().max(100), z.unknown())
  .nullable()
  .optional()
  .refine(
    (data) => {
      if (!data) return true
      const keys = Object.keys(data)
      if (keys.length > 50) return false
      const serialized = JSON.stringify(data)
      return serialized.length <= 65536 // 64KB
    },
    { message: 'Metadata too large (max 64KB, max 50 keys)' }
  )

export const checkinSchema = z.object({
  date: dateString,
  value: z.number().int().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  metadata: metadataSchema
})

export const skipSchema = z.object({
  date: dateString,
  reason: z.string().max(500).nullable().optional()
})

export const uncheckSchema = z.object({
  date: dateString
})

// ============================================================
// Category Schemas
// ============================================================

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  icon: iconSchema,
  color: colorSchema,
  sort_order: z.number().int().default(0)
})

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: iconSchema,
  color: colorSchema,
  sort_order: z.number().int().optional()
})

// ============================================================
// Reorder Schemas
// ============================================================

export const reorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID is required')
})

// ============================================================
// API Key Schema
// ============================================================

export const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100)
})

// ============================================================
// Query Parameter Schemas
// ============================================================

// Date string in YYYY-MM-DD format (exported for query params)
export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')

export const checkinsQuerySchema = z.object({
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional()
})

export const habitsQuerySchema = z.object({
  category: z.string().uuid('Invalid category ID').optional()
})

// ============================================================
// Helper function to validate and parse request body
// ============================================================

export async function validateBody<T extends z.ZodTypeAny>(
  event: H3Event,
  schema: T
): Promise<z.infer<T>> {
  const body = await readBody(event)

  try {
    return schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')
      throw createError({
        statusCode: 400,
        message: `Validation error: ${message}`
      })
    }
    throw error
  }
}

// ============================================================
// Helper function to validate and parse query parameters
// ============================================================

export function validateQuery<T extends z.ZodTypeAny>(
  event: H3Event,
  schema: T
): z.infer<T> {
  const query = getQuery(event)

  try {
    return schema.parse(query)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')
      throw createError({
        statusCode: 400,
        message: `Validation error: ${message}`
      })
    }
    throw error
  }
}
