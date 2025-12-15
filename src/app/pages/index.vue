<script setup lang="ts">
import type { HabitWithCheckinsResponse, CategoryResponse, UserResponse } from '~/types/api'

const { t } = useI18n()

const { data: habits, refresh: refreshHabits } = await useFetch<HabitWithCheckinsResponse[]>('/api/v1/habits')
const { data: categories } = await useFetch<CategoryResponse[]>('/api/v1/categories')
const { data: userData } = await useFetch<UserResponse>('/api/v1/auth/me')

const allowBackfill = computed(() => userData.value?.user?.settings?.allowBackfill ?? false)
const groupByCategory = computed(() => userData.value?.user?.settings?.groupByCategory ?? true)
const desktopDaysToShow = computed(() => userData.value?.user?.settings?.desktopDaysToShow ?? 14)
const weekStartsOn = computed(() => userData.value?.user?.settings?.weekStartsOn ?? 'monday')

const selectedCategory = ref<string | null>(null)
const collapsedCategories = ref<Set<string | null>>(new Set())

function toggleCategory(categoryId: string | null) {
  if (collapsedCategories.value.has(categoryId)) {
    collapsedCategories.value.delete(categoryId)
  } else {
    collapsedCategories.value.add(categoryId)
  }
}

function isCategoryCollapsed(categoryId: string | null): boolean {
  return collapsedCategories.value.has(categoryId)
}

const filteredHabits = computed(() => {
  if (!habits.value) return []
  if (!selectedCategory.value) return habits.value
  if (selectedCategory.value === 'uncategorized') {
    return habits.value.filter(h => !h.category_id)
  }
  return habits.value.filter(h => h.category_id === selectedCategory.value)
})

const habitsByCategory = computed(() => {
  if (!filteredHabits.value) return []

  const grouped = new Map<string | null, typeof filteredHabits.value>()

  for (const habit of filteredHabits.value) {
    const categoryId = habit.category_id || null
    if (!grouped.has(categoryId)) {
      grouped.set(categoryId, [])
    }
    grouped.get(categoryId)!.push(habit)
  }

  // Sort: categorized first (alphabetically), then uncategorized
  const result: { category: { id: string | null, name: string, color?: string | null, icon?: string | null } | null, habits: typeof filteredHabits.value }[] = []

  // Add categorized habits
  const categorizedEntries = [...grouped.entries()]
    .filter(([id]) => id !== null)
    .sort((a, b) => {
      const catA = categories.value?.find(c => c.id === a[0])?.name || ''
      const catB = categories.value?.find(c => c.id === b[0])?.name || ''
      return catA.localeCompare(catB)
    })

  for (const [categoryId, categoryHabits] of categorizedEntries) {
    const category = categories.value?.find(c => c.id === categoryId)
    result.push({
      category: category ? { id: category.id, name: category.name, color: category.color, icon: category.icon } : null,
      habits: categoryHabits
    })
  }

  // Add uncategorized habits at the end
  if (grouped.has(null)) {
    result.push({
      category: null,
      habits: grouped.get(null)!
    })
  }

  return result
})

const categoryFilterOptions = computed(() => [
  { label: t('categories.allCategories'), value: null },
  ...(categories.value || []).map(c => ({ label: c.name, value: c.id })),
  ...(habits.value?.some(h => !h.category_id) ? [{ label: t('categories.noCategory'), value: 'uncategorized' }] : [])
])

const showCategoryHeaders = computed(() => {
  return groupByCategory.value && habitsByCategory.value.length > 1
})
</script>

<template>
  <div class="py-6 space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <h1 class="text-2xl font-bold">
        {{ $t('dashboard.title') }}
      </h1>
      <div class="flex items-center gap-2">
        <USelect
          v-if="categories?.length"
          v-model="selectedCategory"
          :items="categoryFilterOptions"
          class="flex-1 sm:flex-none sm:w-40"
          size="sm"
        />
        <UButton
          icon="i-lucide-plus"
          :label="$t('habits.create')"
          to="/habits/new"
        />
      </div>
    </div>

    <!-- Empty state -->
    <UCard
      v-if="!habits?.length"
      class="text-center py-12"
    >
      <UIcon
        name="i-lucide-target"
        class="w-12 h-12 mx-auto text-gray-400 mb-4"
      />
      <h3 class="text-lg font-medium mb-2">
        {{ $t('habits.noHabits') }}
      </h3>
      <p class="text-gray-500 dark:text-gray-400 mb-4">
        {{ $t('habits.createFirst') }}
      </p>
      <UButton
        icon="i-lucide-plus"
        :label="$t('habits.create')"
        to="/habits/new"
      />
    </UCard>

    <!-- No results for filter -->
    <UCard
      v-else-if="!filteredHabits.length"
      class="text-center py-8"
    >
      <UIcon
        name="i-lucide-filter-x"
        class="w-10 h-10 mx-auto text-gray-400 mb-3"
      />
      <p class="text-gray-500 dark:text-gray-400">
        {{ $t('habits.noHabitsInCategory') }}
      </p>
    </UCard>

    <!-- Habits grouped by category (multiple categories) -->
    <div
      v-else-if="showCategoryHeaders"
      class="space-y-6"
    >
      <div
        v-for="group in habitsByCategory"
        :key="group.category?.id || 'uncategorized'"
      >
        <!-- Category header row - uses same padding as UCard for alignment -->
        <div class="flex items-center gap-3 mb-2 px-4 sm:px-6">
          <!-- Category info - clickable to collapse -->
          <button
            class="-ml-5 flex items-center gap-3 flex-1 min-w-0 md:flex-initial md:min-w-[200px] hover:opacity-80 transition-opacity cursor-pointer text-left"
            @click="toggleCategory(group.category?.id || null)"
          >
            <UIcon
              :name="isCategoryCollapsed(group.category?.id || null) ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
              class="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform"
            />
            <div
              class="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
              :style="{
                backgroundColor: group.category?.color ? group.category.color + '20' : '#6b728020',
                color: group.category?.color || '#6b7280'
              }"
            >
              <UIcon
                :name="group.category?.icon || (group.category ? 'i-lucide-folder' : 'i-lucide-inbox')"
                class="w-3.5 h-3.5"
              />
            </div>
            <span
              class="text-sm font-medium"
              :style="group.category?.color ? { color: group.category.color } : undefined"
            >
              {{ group.category?.name || $t('categories.noCategory') }}
            </span>
            <span class="text-xs text-gray-400">({{ group.habits.length }})</span>
          </button>
          <!-- Week header - matches HabitCard Layout B -->
          <HabitWeekHeader
            v-if="!isCategoryCollapsed(group.category?.id || null)"
            class="flex-1"
            :days-to-show="desktopDaysToShow"
            :week-starts-on="weekStartsOn"
          />
        </div>
        <div
          v-if="!isCategoryCollapsed(group.category?.id || null)"
          class="space-y-3"
        >
          <HabitCard
            v-for="habit in group.habits"
            :key="habit.id"
            :habit="habit"
            :allow-backfill="allowBackfill"
            :days-to-show="desktopDaysToShow"
            :week-starts-on="weekStartsOn"
            @checked="refreshHabits"
          />
        </div>
      </div>
    </div>

    <!-- Habits without grouping (single category or grouping disabled) -->
    <div
      v-else
      class="space-y-3"
    >
      <!-- Week header -->
      <div class="flex items-center gap-3 px-4 sm:px-6">
        <div class="flex-1 md:flex-initial md:min-w-[200px]" />
        <HabitWeekHeader
          class="flex-1"
          :days-to-show="desktopDaysToShow"
          :week-starts-on="weekStartsOn"
        />
      </div>
      <HabitCard
        v-for="habit in filteredHabits"
        :key="habit.id"
        :habit="habit"
        :allow-backfill="allowBackfill"
        :days-to-show="desktopDaysToShow"
        :week-starts-on="weekStartsOn"
        @checked="refreshHabits"
      />
    </div>
  </div>
</template>
