<script setup lang="ts">
import type { HabitWithCheckinsResponse } from '~/types/api'
import { getErrorMessage } from '~/types/error'

const props = defineProps<{
  habit: HabitWithCheckinsResponse
  allowBackfill?: boolean
  daysToShow?: number
  weekStartsOn?: 'monday' | 'sunday'
  enableNotes?: boolean
  showDragHandle?: boolean
}>()

const emit = defineEmits<{
  checked: []
}>()

const { t } = useI18n()
const toast = useToast()

// Use the habit card composable for all computed state and helpers
const {
  today,
  displayDays,
  isTargetHabit,
  targetValue,
  defaultIncrement,
  isCustom,
  currentValue,
  isCompleted,
  isSkipped,
  isTodayActiveDay,
  progress,
  frequencyValue,
  weeklyCompletedCount,
  getDayStatus,
  getDayProgress,
  getDayTooltip,
  getCheckinValue
} = useHabitCard({
  habit: toRef(props, 'habit'),
  daysToShow: toRef(props, 'daysToShow'),
  weekStartsOn: toRef(props, 'weekStartsOn')
})

// Loading state
const loading = ref(false)
const loadingDay = ref<string | null>(null)

// Modal state for TARGET habits
const showTargetModal = ref(false)
const modalDate = ref<string>(today)

// Modal state for SIMPLE habits with notes
const showNoteModal = ref(false)
const noteModalDate = ref<string>(today)

// Actions
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

// Modal helpers
function openTargetModal(date: string) {
  modalDate.value = date
  showTargetModal.value = true
}

function openNoteModal(date: string) {
  noteModalDate.value = date
  showNoteModal.value = true
}

// Toggle handlers
function toggleCheck() {
  if (isTargetHabit.value && targetValue.value) {
    openTargetModal(today)
  } else if (isCompleted.value) {
    uncheck()
  } else if (props.enableNotes && props.habit.prompt_for_notes) {
    openNoteModal(today)
  } else {
    check()
  }
}

function toggleDayCheck(day: { date: string, isToday: boolean }) {
  if (!day.isToday && !props.allowBackfill) return

  const status = getDayStatus(day.date)

  if (isTargetHabit.value && targetValue.value) {
    openTargetModal(day.date)
    return
  }

  if (status === 'completed') {
    uncheck(day.date)
  } else if (props.enableNotes && props.habit.prompt_for_notes) {
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
      <!-- Drag handle -->
      <UIcon
        v-if="showDragHandle"
        name="i-lucide-grip-vertical"
        class="drag-handle w-4 h-4 text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0"
      />

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
      :current-value="getCheckinValue(modalDate)"
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
