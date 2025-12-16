<script setup lang="ts">
import { getErrorMessage } from '~/types/error'

interface RecentCheckin {
  id: string
  date: string
  value?: number | null
  skipped: boolean | null
  notes?: string | null
}

interface Habit {
  id: string
  title: string
  description?: string | null
  habit_type?: string
  frequency_type: string
  frequency_value?: number | null
  active_days?: number[] | null
  target_value?: number | null
  default_increment?: number | null
  unit?: string | null
  color?: string | null
  icon?: string | null
  category_id?: string | null
  current_streak?: number
  prompt_for_notes?: boolean | null
  category?: {
    id: string
    name: string
    color?: string | null
    icon?: string | null
  } | null
  recent_checkins?: RecentCheckin[]
}

const props = defineProps<{
  habit: Habit
  allowBackfill?: boolean
  daysToShow?: number
  weekStartsOn?: 'monday' | 'sunday'
  enableNotes?: boolean
}>()

const emit = defineEmits<{
  checked: []
}>()

const { t } = useI18n()
const toast = useToast()

function formatDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = formatDateString(new Date())
const loading = ref(false)
const loadingDay = ref<string | null>(null)

// Modal state for TARGET habits
const showTargetModal = ref(false)
const modalDate = ref<string>(today)

// Modal state for SIMPLE habits with notes
const showNoteModal = ref(false)
const noteModalDate = ref<string>(today)

const isTargetHabit = computed(() => props.habit.habit_type === 'TARGET')
const targetValue = computed(() => props.habit.target_value ?? null)
const defaultIncrement = computed(() => props.habit.default_increment ?? null)

// Frequency helpers
const isWeekly = computed(() => props.habit.frequency_type === 'WEEKLY')
const isCustom = computed(() => props.habit.frequency_type === 'CUSTOM')
const activeDays = computed(() => props.habit.active_days || [])
const frequencyValue = computed(() => props.habit.frequency_value || 1)

// Check if a specific date is an active day for WEEKLY habits
function isActiveDay(date: string): boolean {
  if (!isWeekly.value) return true
  const d = new Date(date)
  const dayOfWeek = d.getDay() // 0 = Sunday, 1 = Monday, etc.
  return activeDays.value.includes(dayOfWeek)
}

// Generate days to display (default 14 on desktop)
const daysCount = computed(() => props.daysToShow ?? 14)
const weekStart = computed(() => props.weekStartsOn ?? 'monday')

// Check if a day is the start of a new week (for visual separator)
function isWeekStart(date: Date): boolean {
  const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday
  return weekStart.value === 'monday' ? dayOfWeek === 1 : dayOfWeek === 0
}

const displayDays = computed(() => {
  const days: { date: string, dayName: string, isToday: boolean, isWeekStart: boolean }[] = []
  const now = new Date()
  for (let i = daysCount.value - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = formatDateString(d)
    days.push({
      date: dateStr,
      dayName: d.toLocaleDateString(undefined, { weekday: 'short' }),
      isToday: dateStr === today,
      isWeekStart: isWeekStart(d) && i !== daysCount.value - 1 // Don't show separator on first day
    })
  }
  return days
})

// Map checkins by date
const checkinsByDate = computed(() => {
  const map = new Map<string, RecentCheckin>()
  for (const c of props.habit.recent_checkins || []) {
    map.set(c.date, c)
  }
  return map
})

const todayCheckin = computed(() => checkinsByDate.value.get(today))
const currentValue = computed(() => todayCheckin.value?.value ?? 0)
const isCompleted = computed(() => {
  if (!todayCheckin.value || todayCheckin.value.skipped) return false
  if (isTargetHabit.value && targetValue.value) {
    return currentValue.value >= targetValue.value
  }
  return true
})
const isSkipped = computed(() => todayCheckin.value?.skipped)
const isTodayActiveDay = computed(() => isActiveDay(today))
const progress = computed(() => {
  if (!isTargetHabit.value || !targetValue.value) return 0
  return Math.min(100, (currentValue.value / targetValue.value) * 100)
})

function getDayStatus(date: string): 'completed' | 'partial' | 'skipped' | 'inactive' | 'none' {
  const checkin = checkinsByDate.value.get(date)

  // For WEEKLY habits, check if this day is active
  if (isWeekly.value && !isActiveDay(date)) {
    // If there's a checkin on an inactive day, still show it
    if (checkin && !checkin.skipped) return 'completed'
    return 'inactive'
  }

  if (!checkin) return 'none'
  if (checkin.skipped) return 'skipped'
  if (isTargetHabit.value && targetValue.value && checkin.value) {
    if (checkin.value >= targetValue.value) return 'completed'
    if (checkin.value > 0) return 'partial'
    return 'none'
  }
  return 'completed'
}

function getDayProgress(date: string): number {
  if (!isTargetHabit.value || !targetValue.value) return 0
  const checkin = checkinsByDate.value.get(date)
  if (!checkin?.value) return 0
  return Math.min(100, (checkin.value / targetValue.value) * 100)
}

// For CUSTOM: count completed days in current calendar week
const weeklyCompletedCount = computed(() => {
  if (!isCustom.value) return 0

  // Get current week start (Monday or Sunday based on setting)
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, ...

  // Calculate days since week start
  let daysSinceWeekStart: number
  if (weekStart.value === 'monday') {
    daysSinceWeekStart = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  } else {
    daysSinceWeekStart = dayOfWeek
  }

  // Get start of current week
  const currentWeekStart = new Date(now)
  currentWeekStart.setDate(now.getDate() - daysSinceWeekStart)
  const weekStartStr = formatDateString(currentWeekStart)

  // Count completed days in current week
  let count = 0
  for (const day of displayDays.value) {
    if (day.date >= weekStartStr && day.date <= today) {
      const status = getDayStatus(day.date)
      if (status === 'completed') count++
    }
  }
  return count
})

function getDayTooltip(day: { date: string, dayName: string, isToday: boolean }): string {
  const status = getDayStatus(day.date)
  const checkin = checkinsByDate.value.get(day.date)
  const note = checkin?.notes

  let statusText = ''
  if (status === 'skipped') {
    statusText = t('habits.skipped')
  } else if (status === 'completed') {
    if (isTargetHabit.value && targetValue.value) {
      const val = checkin?.value ?? 0
      statusText = `${val}/${targetValue.value} ✓`
    } else {
      statusText = t('habits.completed')
    }
  } else if (status === 'partial') {
    const val = checkin?.value ?? 0
    statusText = `${val}/${targetValue.value}`
  }

  // Append note if present
  if (note && statusText) {
    return `${statusText} - ${note}`
  }
  if (note) {
    return note
  }
  return statusText
}

async function check(value?: number, date?: string) {
  const targetDate = date || today
  if (date) {
    loadingDay.value = date
  } else {
    loading.value = true
  }
  try {
    await $fetch(`/api/v1/habits/${props.habit.id}/check`, {
      method: 'POST',
      body: { date: targetDate, value: value ?? null }
    })
    emit('checked')
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(error),
      color: 'error'
    })
  } finally {
    loading.value = false
    loadingDay.value = null
  }
}

async function skip(date?: string) {
  const targetDate = date || today
  loading.value = true
  try {
    await $fetch(`/api/v1/habits/${props.habit.id}/skip`, {
      method: 'POST',
      body: { date: targetDate }
    })
    emit('checked')
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(error),
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

async function uncheck(date?: string) {
  const targetDate = date || today
  if (date) {
    loadingDay.value = date
  } else {
    loading.value = true
  }
  try {
    await $fetch(`/api/v1/habits/${props.habit.id}/uncheck`, {
      method: 'POST',
      body: { date: targetDate }
    })
    emit('checked')
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(error),
      color: 'error'
    })
  } finally {
    loading.value = false
    loadingDay.value = null
  }
}

async function archive() {
  loading.value = true
  try {
    await $fetch(`/api/v1/habits/${props.habit.id}` as '/api/v1/habits/:id', {
      method: 'PUT',
      body: { archived: true }
    })
    emit('checked')
    toast.add({
      title: t('habits.habitArchived'),
      color: 'success',
      actions: [{
        label: t('common.undo'),
        onClick: unarchive
      }]
    })
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(error),
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

async function unarchive() {
  try {
    await $fetch(`/api/v1/habits/${props.habit.id}` as '/api/v1/habits/:id', {
      method: 'PUT',
      body: { archived: false }
    })
    // Use refreshNuxtData since component may be unmounted after archive
    await refreshNuxtData()
    toast.add({
      title: t('habits.habitRestored'),
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(error),
      color: 'error'
    })
  }
}

function openTargetModal(date: string) {
  modalDate.value = date
  showTargetModal.value = true
}

function openNoteModal(date: string) {
  noteModalDate.value = date
  showNoteModal.value = true
}

function getModalCurrentValue(): number {
  const checkin = checkinsByDate.value.get(modalDate.value)
  return checkin?.value ?? 0
}

function toggleCheck() {
  if (isTargetHabit.value && targetValue.value) {
    // TARGET habits always open modal (for adding, completing, or resetting)
    openTargetModal(today)
  } else if (isCompleted.value) {
    uncheck()
  } else if (props.enableNotes && props.habit.prompt_for_notes) {
    // SIMPLE habit with prompt_for_notes opens modal (only if global notes enabled)
    openNoteModal(today)
  } else {
    check()
  }
}

function toggleDayCheck(day: { date: string, isToday: boolean }) {
  if (!day.isToday && !props.allowBackfill) return

  const status = getDayStatus(day.date)

  // For TARGET habits, always open modal (for adding, completing, or resetting)
  if (isTargetHabit.value && targetValue.value) {
    openTargetModal(day.date)
    return
  }

  // Non-TARGET habits
  if (status === 'completed') {
    uncheck(day.date)
  } else if (props.enableNotes && props.habit.prompt_for_notes) {
    // SIMPLE habit with prompt_for_notes opens modal (only if global notes enabled)
    openNoteModal(day.date)
  } else {
    check(undefined, day.date)
  }
}
</script>

<template>
  <UCard
    :class="[
      'transition-all overflow-hidden relative',
      isCompleted ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-950/20' : '',
      isSkipped ? 'border-gray-300 dark:border-gray-600 opacity-60' : '',
      !isTodayActiveDay ? 'hidden md:block' : ''
    ]"
  >
    <!-- Category color indicator -->
    <div
      v-if="habit.category?.color"
      class="absolute left-0 top-0 bottom-0 w-1"
      :style="{ backgroundColor: habit.category.color }"
    />

    <div class="flex items-center gap-3">
      <!-- Layout A: Main habit info -->
      <div class="flex items-center gap-3 flex-1 min-w-0 md:flex-initial md:min-w-[200px]">
        <!-- Check button with progress ring (mobile only - desktop uses week view) -->
        <div class="md:hidden flex-shrink-0 relative">
          <!-- Progress ring for TARGET habits -->
          <svg
            v-if="isTargetHabit && targetValue && !isSkipped"
            class="absolute -inset-0.5 w-7 h-7"
            viewBox="0 0 28 28"
          >
            <!-- Background circle -->
            <circle
              cx="14"
              cy="14"
              r="12"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="text-gray-200 dark:text-gray-700"
            />
            <!-- Progress circle -->
            <circle
              cx="14"
              cy="14"
              r="12"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              class="text-green-500"
              :stroke-dasharray="`${(progress / 100) * 75.4} 75.4`"
              transform="rotate(-90 14 14)"
            />
          </svg>
          <button
            :disabled="loading || !!isSkipped"
            class="relative w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
            :class="[
              isCompleted
                ? 'bg-green-500 border-green-500 text-white cursor-pointer'
                : isSkipped
                  ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 cursor-default'
                  : isTargetHabit && currentValue > 0
                    ? 'border-transparent bg-white dark:bg-gray-900 cursor-pointer'
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 cursor-pointer'
            ]"
            @click="toggleCheck"
          >
            <UIcon
              v-if="isCompleted"
              name="i-lucide-check"
              class="w-3.5 h-3.5"
            />
            <UIcon
              v-else-if="loading"
              name="i-lucide-loader-2"
              class="w-3.5 h-3.5 animate-spin"
            />
            <UIcon
              v-else-if="isSkipped"
              name="i-lucide-minus"
              class="w-3 h-3 text-gray-400"
            />
          </button>
        </div>

        <!-- Habit icon -->
        <div
          v-if="habit.icon"
          class="flex-shrink-0 w-5 h-5 flex items-center justify-center"
          :class="habit.color ? '' : 'text-gray-500 dark:text-gray-400'"
          :style="habit.color ? { color: habit.color } : {}"
        >
          <UIcon
            :name="habit.icon"
            class="w-5 h-5"
          />
        </div>

        <!-- Habit info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <NuxtLink
              :to="`/habits/${habit.id}`"
              class="hover:underline min-w-0"
            >
              <h3
                class="font-medium truncate"
                :class="{ 'line-through': isSkipped }"
              >
                {{ habit.title }}
              </h3>
            </NuxtLink>
            <!-- Target progress value with unit -->
            <span
              v-if="isTargetHabit && targetValue && !isSkipped"
              class="flex-shrink-0 text-xs font-medium whitespace-nowrap"
              :class="isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'"
            >
              {{ currentValue }}/{{ targetValue }} {{ habit.unit || '' }}
            </span>
            <!-- Custom frequency progress (X/week) -->
            <span
              v-if="isCustom"
              class="flex-shrink-0 text-xs font-medium whitespace-nowrap"
              :class="weeklyCompletedCount >= frequencyValue ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'"
            >
              {{ weeklyCompletedCount }}/{{ frequencyValue }}×
            </span>
            <!-- Streak badge -->
            <span
              v-if="habit.current_streak && habit.current_streak > 0"
              class="flex-shrink-0 inline-flex items-center gap-0.5 text-xs font-medium text-orange-500 dark:text-orange-400"
              :title="$t('dashboard.streak')"
            >
              <UIcon
                name="i-lucide-flame"
                class="w-3.5 h-3.5"
              />
              {{ habit.current_streak }}
            </span>
          </div>

          <p
            v-if="isSkipped"
            class="text-sm text-gray-500"
          >
            {{ $t('habits.skipped') }}
          </p>
        </div>

        <!-- Actions (mobile only) -->
        <div class="flex md:hidden items-center gap-1">
          <UDropdownMenu
            :items="[[
              { label: $t('habits.edit'), icon: 'i-lucide-pencil', to: `/habits/${habit.id}/edit` },
              { label: isCompleted ? $t('habits.uncheck') : $t('habits.check'), icon: isCompleted ? 'i-lucide-rotate-ccw' : 'i-lucide-check', onSelect: toggleCheck },
              ...(!isCompleted && !isSkipped && !isTargetHabit ? [{ label: $t('habits.skip'), icon: 'i-lucide-forward', onSelect: () => skip() }] : []),
              { label: $t('habits.archive'), icon: 'i-lucide-archive', onSelect: archive }
            ]]"
          >
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-more-vertical"
              size="xs"
            />
          </UDropdownMenu>
        </div>
      </div>

      <!-- Layout B: Week view (desktop only) -->
      <div class="hidden md:flex items-center justify-end gap-1.5 flex-1">
        <template
          v-for="day in displayDays"
          :key="day.date"
        >
          <!-- Week separator (spacing only) -->
          <div
            v-if="day.isWeekStart"
            class="w-2"
          />
          <HabitDayButton
            :date="day.date"
            :day-name="day.dayName"
            :is-today="day.isToday"
            :status="getDayStatus(day.date)"
            :progress="getDayProgress(day.date)"
            :tooltip="getDayTooltip(day)"
            :is-target-habit="isTargetHabit"
            :allow-backfill="allowBackfill"
            :loading="loadingDay === day.date"
            @click="toggleDayCheck(day)"
          />
        </template>
      </div>

      <!-- Actions (desktop - after week view) -->
      <div class="hidden md:flex items-center gap-1 ml-2">
        <UDropdownMenu
          :items="[[
            { label: $t('habits.edit'), icon: 'i-lucide-pencil', to: `/habits/${habit.id}/edit` },
            { label: isCompleted ? $t('habits.uncheck') : $t('habits.check'), icon: isCompleted ? 'i-lucide-rotate-ccw' : 'i-lucide-check', onSelect: toggleCheck },
            ...(!isCompleted && !isSkipped && !isTargetHabit ? [{ label: $t('habits.skip'), icon: 'i-lucide-forward', onSelect: () => skip() }] : []),
            { label: $t('habits.archive'), icon: 'i-lucide-archive', onSelect: archive }
          ]]"
        >
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-more-vertical"
            size="xs"
          />
        </UDropdownMenu>
      </div>
    </div>

    <!-- TARGET habit modal -->
    <HabitTargetModal
      v-if="isTargetHabit && targetValue"
      v-model:open="showTargetModal"
      :habit-id="habit.id"
      :habit-title="habit.title"
      :habit-icon="habit.icon"
      :habit-unit="habit.unit"
      :target-value="targetValue"
      :default-increment="defaultIncrement"
      :current-value="getModalCurrentValue()"
      :date="modalDate"
      :enable-notes="enableNotes"
      @checked="emit('checked')"
    />

    <!-- SIMPLE habit note modal (for prompt_for_notes or long-press) -->
    <HabitNoteModal
      v-if="!isTargetHabit"
      v-model:open="showNoteModal"
      :habit-id="habit.id"
      :habit-title="habit.title"
      :habit-icon="habit.icon"
      :habit-color="habit.color"
      :date="noteModalDate"
      @checked="emit('checked')"
    />
  </UCard>
</template>
