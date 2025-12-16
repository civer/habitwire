/**
 * API Response Types for useFetch
 */

export interface HabitResponse {
  id: string
  title: string
  description: string | null
  habit_type: string
  frequency_type: string
  frequency_value: number | null
  active_days: number[] | null
  time_of_day: string | null
  target_value: number | null
  default_increment: number | null
  unit: string | null
  icon: string | null
  color: string | null
  category_id: string | null
  archived: boolean | null
  prompt_for_notes: boolean | null
  created_at: string | null
  updated_at: string | null
}

export interface RecentCheckin {
  id: string
  date: string
  value: number | null
  skipped: boolean | null
  notes: string | null
}

export interface HabitWithCheckinsResponse extends HabitResponse {
  current_streak: number
  category: {
    id: string
    name: string
    color: string | null
    icon: string | null
  } | null
  recent_checkins: RecentCheckin[]
}

export interface ApiKeyResponse {
  id: string
  name: string
  last_used: string | null
  created_at: string | null
}

export interface UserResponse {
  user: {
    id: string
    username: string
    settings: {
      allowBackfill?: boolean
      groupByCategory?: boolean
      skippedBreaksStreak?: boolean
      desktopDaysToShow?: number
      weekStartsOn?: 'monday' | 'sunday'
      enableNotes?: boolean
    } | null
  }
}

export interface CategoryResponse {
  id: string
  name: string
  icon: string | null
  color: string | null
  sort_order: number | null
  created_at: string | null
}

export interface CheckinResponse {
  id: string
  habit_id: string
  date: string
  value: number | null
  skipped: boolean | null
  skip_reason: string | null
  notes: string | null
  metadata: unknown
  created_at: string | null
}

export interface HabitStatsResponse {
  current_streak: number
  longest_streak: number
  total_checkins: number
  completion_rate: number
  checkins: {
    date: string
    value: number | null
    skipped: boolean
    notes?: string | null
  }[]
}
