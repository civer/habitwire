<script setup lang="ts">
import type { HabitResponse, HabitStatsResponse, CheckinResponse } from '~/types/api'

const { t } = useI18n()
const route = useRoute()
const toast = useToast()

const habitId = route.params.id as string

const { data: habit, error: habitError } = await useFetch<HabitResponse>(`/api/v1/habits/${habitId}`)
const { data: stats, refresh: refreshStats } = await useFetch<HabitStatsResponse>(`/api/v1/habits/${habitId}/stats`)
const { data: checkins, refresh: refreshCheckins } = await useFetch<CheckinResponse[]>(`/api/v1/habits/${habitId}/checkins`, {
  query: { limit: 30 }
})

if (habitError.value || !habit.value) {
  throw createError({
    statusCode: 404,
    message: 'Habit not found'
  })
}

const isTargetHabit = computed(() => habit.value?.habit_type === 'TARGET')
const targetValue = computed(() => habit.value?.target_value ?? null)

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}

function getCheckinStatus(checkin: CheckinResponse): 'completed' | 'partial' | 'skipped' {
  if (checkin.skipped) return 'skipped'
  if (isTargetHabit.value && targetValue.value && checkin.value) {
    if (checkin.value >= targetValue.value) return 'completed'
    return 'partial'
  }
  return 'completed'
}
</script>

<template>
  <div class="py-6 max-w-2xl mx-auto">
    <div class="mb-6 flex items-center justify-between">
      <UButton
        to="/"
        variant="ghost"
        icon="i-lucide-arrow-left"
        :label="$t('common.cancel')"
        color="neutral"
      />
      <UButton
        :to="`/habits/${habitId}/edit`"
        variant="ghost"
        icon="i-lucide-pencil"
        :label="$t('habits.edit')"
        color="neutral"
      />
    </div>

    <!-- Header with habit info -->
    <UCard class="mb-6">
      <div class="flex items-start gap-4">
        <div
          v-if="habit?.icon"
          class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          :style="{
            backgroundColor: habit.color ? habit.color + '20' : '#6b728020',
            color: habit.color || '#6b7280'
          }"
        >
          <UIcon
            :name="habit.icon"
            class="w-6 h-6"
          />
        </div>
        <div class="flex-1 min-w-0">
          <h1 class="text-xl font-bold truncate">
            {{ habit?.title }}
          </h1>
          <p
            v-if="habit?.description"
            class="text-gray-500 dark:text-gray-400 mt-1"
          >
            {{ habit.description }}
          </p>
          <div class="flex flex-wrap gap-2 mt-2">
            <UBadge
              color="neutral"
              variant="subtle"
            >
              {{ habit?.frequency_type === 'DAILY' ? $t('habits.frequencyDaily')
                : habit?.frequency_type === 'WEEKLY' ? $t('habits.frequencyWeekly')
                  : $t('habits.frequencyCustom') }}
            </UBadge>
            <UBadge
              v-if="isTargetHabit"
              color="neutral"
              variant="subtle"
            >
              {{ $t('habits.habitTypeTarget') }}: {{ targetValue }} {{ habit?.unit }}
            </UBadge>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 gap-4 mb-6">
      <UCard>
        <div class="text-center">
          <div class="flex items-center justify-center gap-2 text-3xl font-bold text-orange-500">
            <UIcon
              name="i-lucide-flame"
              class="w-8 h-8"
            />
            {{ stats?.current_streak || 0 }}
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ $t('stats.currentStreak') }}
          </p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <div class="flex items-center justify-center gap-2 text-3xl font-bold text-purple-500">
            <UIcon
              name="i-lucide-trophy"
              class="w-8 h-8"
            />
            {{ stats?.longest_streak || 0 }}
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ $t('stats.longestStreak') }}
          </p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <div class="text-3xl font-bold text-green-500">
            {{ stats?.completion_rate || 0 }}%
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ $t('stats.completionRate') }}
          </p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <div class="text-3xl font-bold text-blue-500">
            {{ stats?.total_checkins || 0 }}
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ $t('stats.totalCheckins') }}
          </p>
        </div>
      </UCard>
    </div>

    <!-- Activity Heatmap -->
    <UCard class="mb-6">
      <template #header>
        <h2 class="text-lg font-semibold">
          {{ $t('stats.activity') }}
        </h2>
      </template>

      <HabitHeatmap
        v-if="stats?.checkins"
        :checkins="stats.checkins"
        :habit-type="habit?.habit_type || 'SIMPLE'"
        :target-value="habit?.target_value"
        :unit="habit?.unit"
        :color="habit?.color || '#22c55e'"
      />
    </UCard>

    <!-- Recent Checkins -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">
          {{ $t('stats.recentCheckins') }}
        </h2>
      </template>

      <div
        v-if="!checkins?.length"
        class="text-center py-8 text-gray-500"
      >
        {{ $t('habits.noHabits') }}
      </div>

      <div
        v-else
        class="divide-y divide-gray-200 dark:divide-gray-800"
      >
        <div
          v-for="checkin in checkins"
          :key="checkin.id"
          class="flex items-center justify-between py-3"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center"
              :class="{
                'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400': getCheckinStatus(checkin) === 'completed',
                'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400': getCheckinStatus(checkin) === 'partial',
                'bg-gray-100 dark:bg-gray-800 text-gray-400': getCheckinStatus(checkin) === 'skipped'
              }"
            >
              <UIcon
                :name="getCheckinStatus(checkin) === 'skipped' ? 'i-lucide-minus' : 'i-lucide-check'"
                class="w-4 h-4"
              />
            </div>
            <div>
              <p class="font-medium">
                {{ formatDate(checkin.date) }}
              </p>
              <p
                v-if="checkin.notes"
                class="text-sm text-gray-500"
              >
                {{ checkin.notes }}
              </p>
            </div>
          </div>
          <div class="text-right">
            <span
              v-if="checkin.skipped"
              class="text-sm text-gray-500"
            >
              {{ $t('habits.skipped') }}
            </span>
            <span
              v-else-if="isTargetHabit && checkin.value"
              class="text-sm font-medium"
              :class="getCheckinStatus(checkin) === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'"
            >
              {{ checkin.value }} / {{ targetValue }} {{ habit?.unit }}
            </span>
            <span
              v-else
              class="text-sm text-green-600 dark:text-green-400"
            >
              {{ $t('habits.completed') }}
            </span>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
