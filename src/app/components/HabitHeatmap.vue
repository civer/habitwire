<script setup lang="ts">
import { formatDateString } from '~/utils/date'

const { t } = useI18n()

const props = defineProps<{
  checkins: { date: string, value: number | null, skipped: boolean, notes?: string | null }[]
  habitType: string
  targetValue?: number | null
  unit?: string | null
  color?: string
}>()

// Build checkin map for quick lookup
const checkinMap = computed(() => {
  const map = new Map<string, { value: number | null, skipped: boolean, notes?: string | null }>()
  for (const c of props.checkins || []) {
    map.set(c.date, { value: c.value, skipped: c.skipped, notes: c.notes })
  }
  return map
})

// Generate series data for ApexCharts heatmap (GitHub style)
const series = computed(() => {
  const today = new Date()
  today.setHours(12, 0, 0, 0)

  // Days of week (reverse order for display: Sat at top, Sun at bottom like GitHub)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const seriesData: { name: string, data: { x: string, y: number, meta?: { date: string, notes?: string | null } }[] }[] = dayNames.map(name => ({
    name,
    data: []
  }))

  // Go back ~52 weeks
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 364)

  // Find the Sunday before or on startDate
  const dayOfWeek = startDate.getDay()
  startDate.setDate(startDate.getDate() - dayOfWeek)

  // Generate weeks with month labels
  const currentDate = new Date(startDate)
  const monthNames: readonly string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
  let lastMonth = -1

  while (currentDate <= today) {
    // Use month name for first week of each month, empty string otherwise
    const currentMonth = currentDate.getMonth()
    let weekLabel = ''
    if (currentMonth !== lastMonth) {
      weekLabel = monthNames[currentMonth] ?? ''
      lastMonth = currentMonth
    }

    for (let d = 0; d < 7; d++) {
      if (currentDate > today) break

      const dateStr = formatDateString(currentDate)
      const checkin = checkinMap.value.get(dateStr)
      const value = getValue(checkin)

      // Store date in x for tooltip, but display month label
      const displayDate = currentDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      const dayData = seriesData[d]
      if (dayData) {
        dayData.data.push({
          x: weekLabel || ' ',
          y: value,
          meta: { date: displayDate, notes: checkin?.notes }
        })
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }
  }

  return seriesData
})

function getValue(checkin: { value: number | null, skipped: boolean } | undefined): number {
  if (!checkin) return 0
  if (checkin.skipped) return -1 // Special value for skipped

  if (props.habitType === 'TARGET' && props.targetValue) {
    // Checkins with value=null (from when habit was SIMPLE) are treated as 100% complete
    if (checkin.value === null) return props.targetValue
    return checkin.value
  }

  // Simple habit: 1 = completed, 0 = not done
  return 1
}

const baseColor = computed(() => props.color || '#22c55e')
const targetNum = computed(() => props.targetValue ?? 0)
const isTarget = computed(() => props.habitType === 'TARGET' && targetNum.value > 0)

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const chartOptions = computed(() => {
  const color = baseColor.value
  const emptyColor = isDark.value ? '#1f2937' : '#e5e7eb'
  const skippedColor = isDark.value ? '#4b5563' : '#9ca3af'
  const strokeColor = isDark.value ? '#111827' : '#ffffff'

  // Build color ranges based on habit type
  let ranges
  if (isTarget.value) {
    const target = targetNum.value
    ranges = [
      { from: -1, to: -1, color: skippedColor, name: 'Skipped' },
      { from: 0, to: 0, color: emptyColor, name: 'None' },
      { from: 0.01, to: target * 0.25, color: color + '30', name: '< 25%' },
      { from: target * 0.25 + 0.01, to: target * 0.5, color: color + '50', name: '25-50%' },
      { from: target * 0.5 + 0.01, to: target * 0.75, color: color + '80', name: '50-75%' },
      { from: target * 0.75 + 0.01, to: target * 0.99, color: color + 'b0', name: '75-99%' },
      { from: target, to: target * 100, color: color, name: '100%+' }
    ]
  } else {
    // Simple habit
    ranges = [
      { from: -1, to: -1, color: skippedColor, name: 'Skipped' },
      { from: 0, to: 0, color: emptyColor, name: 'None' },
      { from: 1, to: 1, color: color, name: 'Done' }
    ]
  }

  return {
    chart: {
      type: 'heatmap',
      toolbar: { show: false },
      animations: { enabled: false },
      background: 'transparent'
    },
    dataLabels: { enabled: false },
    colors: [color],
    xaxis: {
      labels: {
        show: true,
        style: {
          colors: isDark.value ? '#9ca3af' : '#6b7280',
          fontSize: '10px'
        }
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false }
    },
    yaxis: {
      labels: {
        style: {
          colors: isDark.value ? '#9ca3af' : '#6b7280',
          fontSize: '10px'
        }
      }
    },
    grid: {
      show: false,
      padding: { left: 0, right: 0, top: 0, bottom: 0 }
    },
    plotOptions: {
      heatmap: {
        radius: 2,
        enableShades: false,
        colorScale: { ranges }
      }
    },
    tooltip: {
      enabled: true,
      theme: isDark.value ? 'dark' : 'light',
      custom: ({ seriesIndex, dataPointIndex, w }: { seriesIndex: number, dataPointIndex: number, w: { config: { series: Array<{ data: Array<{ x: string, y: number, meta?: { date?: string, notes?: string | null } }> }> } } }) => {
        const seriesItem = w.config.series[seriesIndex]
        const data = seriesItem?.data[dataPointIndex]
        if (!data) return ''
        const value = data.y
        const date = data.meta?.date || ''
        const notes = data.meta?.notes || ''

        let status = ''
        if (value === -1) {
          status = t('habits.skipped')
        } else if (value === 0) {
          status = t('stats.noActivity')
        } else if (isTarget.value) {
          const percent = Math.round((value / targetNum.value) * 100)
          const unit = props.unit || ''
          status = `${value}/${targetNum.value}${unit} (${percent}%)`
        } else {
          status = t('habits.completed')
        }

        let noteHtml = ''
        if (notes) {
          noteHtml = `<div class="text-gray-400 italic mt-1 max-w-[200px] truncate">${notes}</div>`
        }

        return `<div class="px-2 py-1 text-sm">
          <div class="font-medium">${status}</div>
          <div class="text-gray-500">${date}</div>
          ${noteHtml}
        </div>`
      }
    },
    legend: { show: false },
    stroke: { width: 2, colors: [strokeColor] }
  }
})
</script>

<template>
  <ClientOnly>
    <div class="heatmap-wrapper">
      <apexchart
        type="heatmap"
        height="150"
        :options="chartOptions"
        :series="series"
      />
      <!-- Legend -->
      <div class="flex items-center justify-end gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
        <span>{{ t('stats.less') }}</span>
        <div class="w-[10px] h-[10px] rounded-[2px] bg-gray-200 dark:bg-gray-800" />
        <div
          class="w-[10px] h-[10px] rounded-[2px]"
          :style="{ backgroundColor: baseColor + '40' }"
        />
        <div
          class="w-[10px] h-[10px] rounded-[2px]"
          :style="{ backgroundColor: baseColor + '70' }"
        />
        <div
          class="w-[10px] h-[10px] rounded-[2px]"
          :style="{ backgroundColor: baseColor + 'a0' }"
        />
        <div
          class="w-[10px] h-[10px] rounded-[2px]"
          :style="{ backgroundColor: baseColor }"
        />
        <span>{{ t('stats.more') }}</span>
      </div>
    </div>
  </ClientOnly>
</template>

<style scoped>
.heatmap-wrapper :deep(.apexcharts-svg) {
  background: transparent !important;
}
</style>
