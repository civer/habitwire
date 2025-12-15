<script setup lang="ts">
import { getErrorMessage } from '~/types/error'
import type { HabitResponse, CategoryResponse } from '~/types/api'

const { t } = useI18n()
const toast = useToast()

const { data: habits, refresh: refreshHabits } = await useFetch<HabitResponse[]>('/api/v1/habits/archived')
const { data: categories } = await useFetch<CategoryResponse[]>('/api/v1/categories')

const restoring = ref<string | null>(null)

function getCategoryName(categoryId: string | null): string {
  if (!categoryId) return ''
  const category = categories.value?.find(c => c.id === categoryId)
  return category?.name || ''
}

function getCategoryColor(categoryId: string | null): string | null {
  if (!categoryId) return null
  const category = categories.value?.find(c => c.id === categoryId)
  return category?.color || null
}

async function restoreHabit(habit: HabitResponse) {
  restoring.value = habit.id
  try {
    await $fetch(`/api/v1/habits/${habit.id}` as '/api/v1/habits/:id', {
      method: 'PUT',
      body: { archived: false }
    })
    toast.add({
      title: t('habits.restore'),
      description: t('habits.habitRestored'),
      color: 'success'
    })
    await refreshHabits()
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(error, t('errors.restoreHabit')),
      color: 'error'
    })
  } finally {
    restoring.value = null
  }
}
</script>

<template>
  <div class="py-6 space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton
          to="/"
          variant="ghost"
          icon="i-lucide-arrow-left"
          color="neutral"
        />
        <h1 class="text-2xl font-bold">
          {{ $t('habits.archived') }}
        </h1>
      </div>
    </div>

    <!-- Empty state -->
    <UCard
      v-if="!habits?.length"
      class="text-center py-12"
    >
      <UIcon
        name="i-lucide-archive"
        class="w-12 h-12 mx-auto text-gray-400 mb-4"
      />
      <h3 class="text-lg font-medium mb-2">
        {{ $t('habits.noArchivedHabits') }}
      </h3>
      <p class="text-gray-500 dark:text-gray-400 mb-4">
        {{ $t('habits.noHabits') }}
      </p>
      <UButton
        icon="i-lucide-arrow-left"
        :label="$t('dashboard.title')"
        to="/"
      />
    </UCard>

    <!-- Archived habits list -->
    <div
      v-else
      class="space-y-3"
    >
      <UCard
        v-for="habit in habits"
        :key="habit.id"
      >
        <div class="flex items-center gap-4">
          <!-- Icon -->
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            :style="{
              backgroundColor: habit.color ? habit.color + '20' : '#6b728020',
              color: habit.color || '#6b7280'
            }"
          >
            <UIcon
              :name="habit.icon || 'i-lucide-target'"
              class="w-5 h-5"
            />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="font-medium truncate">
              {{ habit.title }}
            </div>
            <div
              v-if="habit.description || habit.category_id"
              class="text-sm text-gray-500 dark:text-gray-400 truncate"
            >
              <span
                v-if="habit.category_id"
                :style="getCategoryColor(habit.category_id) ? { color: getCategoryColor(habit.category_id)! } : undefined"
              >
                {{ getCategoryName(habit.category_id) }}
              </span>
              <span v-if="habit.category_id && habit.description"> · </span>
              <span v-if="habit.description">{{ habit.description }}</span>
            </div>
          </div>

          <!-- Restore button -->
          <UButton
            icon="i-lucide-archive-restore"
            :label="$t('habits.restore')"
            color="primary"
            variant="soft"
            :loading="restoring === habit.id"
            @click="restoreHabit(habit)"
          />
        </div>
      </UCard>
    </div>
  </div>
</template>
