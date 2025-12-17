<script setup lang="ts">
import { getErrorMessage } from '~/types/error'
import type { HabitWithCheckinsResponse, HabitResponse, CategoryResponse, UserResponse } from '~/types/api'

// Dynamic import to avoid SSR issues with vuedraggable
const draggable = defineAsyncComponent(() => import('vuedraggable'))

const { t } = useI18n()
const toast = useToast()

const { data: habits, refresh: refreshHabits } = await useFetch<HabitWithCheckinsResponse[]>('/api/v1/habits')
const { data: archivedHabits, refresh: refreshArchivedHabits } = await useFetch<HabitResponse[]>('/api/v1/habits/archived')

async function refreshAllHabits() {
  await Promise.all([refreshHabits(), refreshArchivedHabits()])
}
const { data: categories } = await useFetch<CategoryResponse[]>('/api/v1/categories')
const { data: userData } = await useFetch<UserResponse>('/api/v1/auth/me')

const hasArchivedHabits = computed(() => (archivedHabits.value?.length ?? 0) > 0)

const allowBackfill = computed(() => userData.value?.user?.settings?.allowBackfill ?? false)
const groupByCategory = computed(() => userData.value?.user?.settings?.groupByCategory ?? true)
const desktopDaysToShow = computed(() => userData.value?.user?.settings?.desktopDaysToShow ?? 14)
const weekStartsOn = computed(() => userData.value?.user?.settings?.weekStartsOn ?? 'monday')
const enableNotes = computed(() => userData.value?.user?.settings?.enableNotes ?? false)

const selectedCategory = ref<string | null>(null)
const collapsedCategories = ref<Set<string | null>>(new Set())

// Reorder mode toggle
const isReorderMode = ref(false)

// Local copy of habits for drag & drop
const localHabits = ref<HabitWithCheckinsResponse[]>([])
watch(() => habits.value, (newHabits) => {
  localHabits.value = newHabits ? [...newHabits] : []
}, { immediate: true })

async function onReorderHabits() {
  const ids = localHabits.value.map(h => h.id)
  try {
    await $fetch('/api/v1/habits/reorder', {
      method: 'PUT',
      body: { ids }
    })
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(error),
      color: 'error'
    })
    await refreshHabits()
  }
}

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
  if (!localHabits.value.length) return []
  if (!selectedCategory.value) return localHabits.value
  if (selectedCategory.value === 'uncategorized') {
    return localHabits.value.filter(h => !h.category_id)
  }
  return localHabits.value.filter(h => h.category_id === selectedCategory.value)
})

// Mutable filtered list for flat mode drag & drop
const localFilteredHabits = ref<HabitWithCheckinsResponse[]>([])
watch(filteredHabits, (newFiltered) => {
  localFilteredHabits.value = [...newFiltered]
}, { immediate: true })

function onReorderFiltered() {
  // Update the main localHabits array based on the new filtered order
  const filteredIds = new Set(localFilteredHabits.value.map(h => h.id))
  const otherHabits = localHabits.value.filter(h => !filteredIds.has(h.id))
  localHabits.value = [...localFilteredHabits.value, ...otherHabits]
  onReorderHabits()
}

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

  // Sort: categorized first (by sortOrder from API), then uncategorized
  const result: { category: { id: string | null, name: string, color?: string | null, icon?: string | null } | null, habits: typeof filteredHabits.value }[] = []

  // Add categorized habits in the order they appear in categories (which is already sorted by sortOrder)
  for (const category of categories.value || []) {
    const categoryHabits = grouped.get(category.id)
    if (categoryHabits) {
      result.push({
        category: { id: category.id, name: category.name, color: category.color, icon: category.icon },
        habits: categoryHabits
      })
    }
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

// Mutable groups for grouped mode drag & drop
interface MutableGroup {
  category: { id: string | null, name: string, color?: string | null, icon?: string | null } | null
  habits: HabitWithCheckinsResponse[]
}
const localGroups = ref<MutableGroup[]>([])

watch(habitsByCategory, (newGroups) => {
  localGroups.value = newGroups.map(g => ({
    category: g.category,
    habits: [...g.habits]
  }))
}, { immediate: true })

function onReorderGroup() {
  // Rebuild the full habits list from all groups in order
  const allHabits: HabitWithCheckinsResponse[] = []
  for (const group of localGroups.value) {
    allHabits.push(...group.habits)
  }
  localHabits.value = allHabits
  onReorderHabits()
}

const categoryFilterOptions = computed(() => [
  { label: t('categories.allCategories'), value: null },
  ...(categories.value || []).map(c => ({ label: c.name, value: c.id })),
  ...(localHabits.value?.some(h => !h.category_id) ? [{ label: t('categories.noCategory'), value: 'uncategorized' }] : [])
])

const showCategoryHeaders = computed(() => {
  return groupByCategory.value && localGroups.value.length > 1
})
</script>

<template>
  <div class="py-6 space-y-6">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-bold">
        {{ $t('dashboard.title') }}
      </h1>
      <div class="flex items-center gap-2">
        <UButton
          v-if="habits?.length"
          :icon="isReorderMode ? 'i-lucide-check' : 'i-lucide-arrow-up-down'"
          :color="isReorderMode ? 'primary' : 'neutral'"
          :variant="isReorderMode ? 'solid' : 'ghost'"
          size="sm"
          @click="isReorderMode = !isReorderMode"
        />
        <USelect
          v-if="categories?.length && !isReorderMode"
          v-model="selectedCategory"
          :items="categoryFilterOptions"
          class="w-40"
          size="sm"
        />
        <UButton
          v-if="!isReorderMode"
          icon="i-lucide-plus"
          :label="$t('habits.create')"
          to="/habits/new"
          size="sm"
          class="hidden sm:inline-flex"
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
        v-for="group in localGroups"
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
        <!-- Reorder mode: draggable list -->
        <draggable
          v-if="isReorderMode && !isCategoryCollapsed(group.category?.id || null)"
          v-model="group.habits"
          item-key="id"
          handle=".drag-handle"
          ghost-class="opacity-50"
          class="space-y-3"
          @end="onReorderGroup"
        >
          <template #item="{ element: habit }">
            <HabitCard
              :habit="habit"
              :allow-backfill="allowBackfill"
              :days-to-show="desktopDaysToShow"
              :week-starts-on="weekStartsOn"
              :enable-notes="enableNotes"
              :show-drag-handle="true"
              @checked="refreshAllHabits"
            />
          </template>
        </draggable>
        <!-- Normal mode: static list -->
        <div
          v-else-if="!isCategoryCollapsed(group.category?.id || null)"
          class="space-y-3"
        >
          <HabitCard
            v-for="habit in group.habits"
            :key="habit.id"
            :habit="habit"
            :allow-backfill="allowBackfill"
            :days-to-show="desktopDaysToShow"
            :week-starts-on="weekStartsOn"
            :enable-notes="enableNotes"
            @checked="refreshAllHabits"
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
      <!-- Reorder mode: draggable list -->
      <draggable
        v-if="isReorderMode"
        v-model="localFilteredHabits"
        item-key="id"
        handle=".drag-handle"
        ghost-class="opacity-50"
        class="space-y-3"
        @end="onReorderFiltered"
      >
        <template #item="{ element: habit }">
          <HabitCard
            :habit="habit"
            :allow-backfill="allowBackfill"
            :days-to-show="desktopDaysToShow"
            :week-starts-on="weekStartsOn"
            :enable-notes="enableNotes"
            :show-drag-handle="true"
            @checked="refreshAllHabits"
          />
        </template>
      </draggable>
      <!-- Normal mode: static list -->
      <template v-else>
        <HabitCard
          v-for="habit in filteredHabits"
          :key="habit.id"
          :habit="habit"
          :allow-backfill="allowBackfill"
          :days-to-show="desktopDaysToShow"
          :week-starts-on="weekStartsOn"
          :enable-notes="enableNotes"
          @checked="refreshAllHabits"
        />
      </template>
    </div>

    <!-- Archive link -->
    <div
      v-if="hasArchivedHabits"
      class="text-center pt-4"
    >
      <NuxtLink
        to="/habits/archived"
        class="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-colors"
      >
        <UIcon
          name="i-lucide-archive"
          class="w-4 h-4"
        />
        {{ $t('habits.viewArchived') }}
      </NuxtLink>
    </div>

    <!-- Mobile FAB for creating habits -->
    <NuxtLink
      v-if="!isReorderMode"
      to="/habits/new"
      class="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-50"
    >
      <UIcon
        name="i-lucide-plus"
        class="w-6 h-6"
      />
    </NuxtLink>
  </div>
</template>
