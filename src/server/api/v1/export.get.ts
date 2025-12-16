import { eq } from 'drizzle-orm'
import { db } from '@server/database'
import { habits, categories } from '@server/database/schema'
import { z } from 'zod'

const querySchema = z.object({
  format: z.enum(['json', 'csv']).default('json')
})

defineRouteMeta({
  openAPI: {
    tags: ['Export'],
    summary: 'Export all user data',
    description: 'Export all habits, checkins, and categories in JSON or CSV format',
    parameters: [
      {
        name: 'format',
        in: 'query',
        description: 'Export format (json or csv)',
        required: false,
        schema: { type: 'string', enum: ['json', 'csv'], default: 'json' }
      }
    ],
    responses: {
      200: { description: 'Export data' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const query = getQuery(event)
  const { format } = querySchema.parse(query)

  // Fetch all data
  const userCategories = await db.query.categories.findMany({
    where: eq(categories.userId, userId)
  })

  const userHabits = await db.query.habits.findMany({
    where: eq(habits.userId, userId),
    with: {
      checkins: true
    }
  })

  if (format === 'csv') {
    // Generate CSV with all checkins
    const csvRows: string[] = []

    // Header row
    csvRows.push([
      'habit_id',
      'habit_title',
      'habit_type',
      'frequency_type',
      'category',
      'checkin_date',
      'checkin_value',
      'checkin_skipped',
      'checkin_notes'
    ].join(','))

    // Data rows
    for (const habit of userHabits) {
      const category = userCategories.find(c => c.id === habit.categoryId)
      for (const checkin of habit.checkins) {
        csvRows.push([
          habit.id,
          escapeCsvValue(habit.title),
          habit.habitType,
          habit.frequencyType,
          escapeCsvValue(category?.name || ''),
          checkin.date,
          checkin.value?.toString() || '',
          checkin.skipped ? 'true' : 'false',
          escapeCsvValue(checkin.notes || '')
        ].join(','))
      }
    }

    const csv = csvRows.join('\n')
    const filename = `habitwire-export-${new Date().toISOString().split('T')[0]}.csv`

    setResponseHeader(event, 'Content-Type', 'text/csv')
    setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
    return csv
  }

  // JSON format
  const exportData = {
    exported_at: new Date().toISOString(),
    categories: userCategories.map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      icon: c.icon
    })),
    habits: userHabits.map(h => ({
      id: h.id,
      title: h.title,
      description: h.description,
      habit_type: h.habitType,
      frequency_type: h.frequencyType,
      frequency_value: h.frequencyValue,
      active_days: h.activeDays,
      target_value: h.targetValue,
      default_increment: h.defaultIncrement,
      unit: h.unit,
      color: h.color,
      icon: h.icon,
      archived: h.archived,
      category_id: h.categoryId,
      created_at: h.createdAt,
      checkins: h.checkins.map(c => ({
        date: c.date,
        value: c.value,
        skipped: c.skipped,
        notes: c.notes
      }))
    }))
  }

  const filename = `habitwire-export-${new Date().toISOString().split('T')[0]}.json`
  setResponseHeader(event, 'Content-Type', 'application/json')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
  return exportData
})

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
