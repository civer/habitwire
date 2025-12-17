<script setup lang="ts">
const props = defineProps<{
  daysToShow?: number
  weekStartsOn?: 'monday' | 'sunday'
}>()

const { displayDays } = useDisplayDays({
  daysToShow: toRef(props, 'daysToShow'),
  weekStartsOn: toRef(props, 'weekStartsOn')
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
