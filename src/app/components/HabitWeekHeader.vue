<script setup lang="ts">
function formatDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = formatDateString(new Date())

const last7Days = computed(() => {
  const days: { date: string, dayName: string, isToday: boolean }[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = formatDateString(d)
    days.push({
      date: dateStr,
      dayName: d.toLocaleDateString(undefined, { weekday: 'short' }),
      isToday: dateStr === today
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
      <div
        v-for="day in last7Days"
        :key="day.date"
        class="relative w-6 h-6 flex items-center justify-center"
      >
        <span
          class="text-[10px] text-gray-400 dark:text-gray-500 uppercase"
          :class="{ 'font-semibold text-primary': day.isToday }"
        >
          {{ day.dayName.slice(0, 2) }}
        </span>
      </div>
    </div>
    <!-- Spacer for actions (skip + menu) - match HabitCard actions -->
    <div class="hidden md:flex items-center gap-1 ml-2">
      <div class="w-6 h-6" />
      <div class="w-6 h-6" />
    </div>
  </div>
</template>
