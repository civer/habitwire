<script setup lang="ts">
type DayStatus = 'completed' | 'partial' | 'skipped' | 'inactive' | 'none'

interface Props {
  date: string
  dayName: string
  isToday: boolean
  status: DayStatus
  progress?: number
  tooltip?: string
  isTargetHabit?: boolean
  allowBackfill?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  progress: 0,
  tooltip: '',
  isTargetHabit: false,
  allowBackfill: false,
  loading: false
})

const emit = defineEmits<{
  click: []
}>()

const isClickable = computed(() => {
  if (props.status === 'inactive') return false
  return props.isToday || props.allowBackfill
})

function handleClick() {
  if (!isClickable.value || props.loading) return
  emit('click')
}
</script>

<template>
  <div class="relative group">
    <!-- Progress ring for TARGET habits with partial progress -->
    <svg
      v-if="isTargetHabit && status === 'partial'"
      class="absolute -inset-0.5 w-7 h-7"
      viewBox="0 0 28 28"
    >
      <circle
        cx="14"
        cy="14"
        r="12"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="text-gray-200 dark:text-gray-700"
      />
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
      :disabled="loading || !isClickable"
      class="relative w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
      :class="[
        status === 'completed'
          ? 'bg-green-500 border-green-500 text-white'
          : status === 'partial'
            ? 'border-transparent bg-white dark:bg-gray-900'
            : status === 'skipped'
              ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800'
              : status === 'inactive'
                ? 'border-dashed border-gray-200 dark:border-gray-700 opacity-30'
                : 'border-gray-300 dark:border-gray-600',
        isToday && status !== 'inactive' ? 'ring-2 ring-primary/30' : '',
        isClickable ? 'cursor-pointer hover:border-green-500' : 'cursor-default'
      ]"
      @click="handleClick"
    >
      <UIcon
        v-if="loading"
        name="i-lucide-loader-2"
        class="w-3 h-3 animate-spin"
      />
      <UIcon
        v-else-if="status === 'completed'"
        name="i-lucide-check"
        class="w-3 h-3"
      />
      <UIcon
        v-else-if="status === 'skipped'"
        name="i-lucide-minus"
        class="w-3 h-3 text-gray-400"
      />
    </button>

    <!-- Tooltip -->
    <div
      v-if="tooltip"
      class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap"
    >
      {{ tooltip }}
    </div>
  </div>
</template>
