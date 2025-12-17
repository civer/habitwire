<script setup lang="ts">
import { formatDateString } from '~/utils/date'

const props = defineProps<{
  daysToShow?: number
  weekStartsOn?: 'monday' | 'sunday'
}>()

const today = formatDateString(new Date())

const daysCount = computed(() => props.daysToShow ?? 14)
const weekStart = computed(() => props.weekStartsOn ?? 'monday')

function isWeekStart(date: Date): boolean {
  const dayOfWeek = date.getDay()
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
      isWeekStart: isWeekStart(d) && i !== daysCount.value - 1
    })
  }
  return days
})
</script>

<template>
  <!-- Single root wrapper to accept class from parent -->
  <div class="contents">
    <!-- Matches HabitCard: Layout B (week view) + Actions -->
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
        <div class="relative w-6 h-6 flex items-center justify-center">
          <span
            class="text-[10px] text-gray-400 dark:text-gray-500 uppercase"
            :class="{ 'font-semibold text-primary': day.isToday }"
          >
            {{ day.dayName.slice(0, 2) }}
          </span>
        </div>
      </template>
    </div>
    <!-- Spacer for actions (menu only) - match HabitCard actions -->
    <div class="hidden md:flex items-center gap-1 ml-2">
      <div class="w-6 h-6" />
    </div>
  </div>
</template>
