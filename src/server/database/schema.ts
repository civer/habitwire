import { pgTable, uuid, text, timestamp, boolean, doublePrecision, date, integer, jsonb, unique, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  settings: jsonb('settings').$type<{
    allowBackfill?: boolean
    groupByCategory?: boolean
    skippedBreaksStreak?: boolean
    desktopDaysToShow?: number
    weekStartsOn?: 'monday' | 'sunday'
  }>().default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow()
}, table => [
  unique('categories_user_name_unique').on(table.userId, table.name),
  index('idx_categories_user').on(table.userId)
])

export const habits = pgTable('habits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  habitType: text('habit_type').default('SIMPLE').notNull(), // SIMPLE, TARGET
  frequencyType: text('frequency_type').notNull(), // DAILY, WEEKLY, CUSTOM
  frequencyValue: integer('frequency_value').default(1),
  activeDays: jsonb('active_days').$type<number[] | null>(), // [1,2,3,4,5] = Mo-Fr
  timeOfDay: text('time_of_day'), // morning, afternoon, evening
  targetValue: doublePrecision('target_value'), // doublePrecision maps to number, API validates int for now
  defaultIncrement: doublePrecision('default_increment'),
  unit: text('unit'), // ml, min, km
  color: text('color'),
  icon: text('icon'),
  sortOrder: integer('sort_order').default(0),
  archived: boolean('archived').default(false),
  promptForNotes: boolean('prompt_for_notes').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, table => [
  index('idx_habits_user_archived').on(table.userId, table.archived)
])

export const checkins = pgTable('checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  habitId: uuid('habit_id').references(() => habits.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  value: doublePrecision('value'), // doublePrecision maps to number
  skipped: boolean('skipped').default(false),
  skipReason: text('skip_reason'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow()
}, table => [
  index('idx_checkins_habit_date').on(table.habitId, table.date)
])

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull(), // SHA-256
  lastUsed: timestamp('last_used'),
  createdAt: timestamp('created_at').defaultNow()
})

export const config = pgTable('config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at').defaultNow()
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  habits: many(habits),
  categories: many(categories),
  apiKeys: many(apiKeys)
}))

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id]
  }),
  habits: many(habits)
}))

export const habitsRelations = relations(habits, ({ one, many }) => ({
  user: one(users, {
    fields: [habits.userId],
    references: [users.id]
  }),
  category: one(categories, {
    fields: [habits.categoryId],
    references: [categories.id]
  }),
  checkins: many(checkins)
}))

export const checkinsRelations = relations(checkins, ({ one }) => ({
  habit: one(habits, {
    fields: [checkins.habitId],
    references: [habits.id]
  })
}))

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id]
  })
}))
