<script setup lang="ts">
import { getErrorMessage } from '~/types/error'
import type { CategoryResponse } from '~/types/api'

interface Category {
  id: string
  name: string
  color?: string | null
  icon?: string | null
}

const { t } = useI18n()
const toast = useToast()

const { data: categories, refresh } = await useFetch<CategoryResponse[]>('/api/v1/categories')

const editModalOpen = ref(false)
const editingCategory = ref<Category | null>(null)
const editState = reactive({
  name: '',
  color: '#3b82f6',
  icon: ''
})
const editLoading = ref(false)

const categoryIcons = [
  'i-lucide-folder',
  'i-lucide-briefcase',
  'i-lucide-home',
  'i-lucide-heart',
  'i-lucide-star',
  'i-lucide-zap',
  'i-lucide-trophy',
  'i-lucide-target',
  'i-lucide-flame',
  'i-lucide-leaf',
  'i-lucide-sun',
  'i-lucide-moon',
  'i-lucide-dumbbell',
  'i-lucide-brain',
  'i-lucide-book',
  'i-lucide-book-open',
  'i-lucide-graduation-cap',
  'i-lucide-music',
  'i-lucide-palette',
  'i-lucide-camera',
  'i-lucide-code',
  'i-lucide-dollar-sign',
  'i-lucide-users',
  'i-lucide-smile',
  'i-lucide-sparkles',
  'i-lucide-coffee',
  'i-lucide-droplet',
  'i-lucide-pill',
  'i-lucide-apple',
  'i-lucide-footprints'
]

const presetColors = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#a855f7',
  '#d946ef', '#ec4899', '#6b7280'
]

function openEdit(category: Category) {
  editingCategory.value = category
  editState.name = category.name
  editState.color = category.color || '#3b82f6'
  editState.icon = category.icon || ''
  editModalOpen.value = true
}

async function saveEdit() {
  if (!editingCategory.value) return
  editLoading.value = true
  try {
    await $fetch(`/api/v1/categories/${editingCategory.value.id}`, {
      method: 'PUT',
      body: {
        name: editState.name,
        color: editState.color,
        icon: editState.icon || null
      }
    })
    await refresh()
    editModalOpen.value = false
    toast.add({
      title: t('categories.edit'),
      description: t('categories.categoryUpdated'),
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(error),
      color: 'error'
    })
  } finally {
    editLoading.value = false
  }
}

async function deleteCategory(id: string) {
  try {
    await $fetch(`/api/v1/categories/${id}`, { method: 'DELETE' })
    await refresh()
    toast.add({
      title: t('categories.delete'),
      description: t('categories.categoryDeleted'),
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
</script>

<template>
  <div
    v-if="!categories?.length"
    class="text-center py-8 text-gray-500"
  >
    {{ $t('categories.noCategory') }}
  </div>

  <div
    v-else
    class="divide-y divide-gray-200 dark:divide-gray-800"
  >
    <div
      v-for="category in categories"
      :key="category.id"
      class="flex items-center justify-between py-3"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-8 h-8 rounded-lg flex items-center justify-center"
          :style="{ backgroundColor: category.color ? category.color + '20' : '#6b728020' }"
        >
          <UIcon
            :name="category.icon || 'i-lucide-folder'"
            class="w-4 h-4"
            :style="{ color: category.color || '#6b7280' }"
          />
        </div>
        <span>{{ category.name }}</span>
      </div>

      <div class="flex items-center gap-1">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-pencil"
          size="sm"
          @click="openEdit(category)"
        />
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-trash-2"
          size="sm"
          @click="deleteCategory(category.id)"
        />
      </div>
    </div>
  </div>

  <!-- Edit Modal -->
  <UModal v-model:open="editModalOpen">
    <template #content>
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">
            {{ $t('categories.edit') }}
          </h3>
        </template>

        <div class="space-y-4">
          <UFormField
            :label="$t('categories.name')"
            required
          >
            <UInput
              v-model="editState.name"
              :placeholder="$t('categories.name')"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="$t('habits.icon')">
            <div class="flex flex-wrap gap-2 justify-center">
              <button
                v-for="icon in categoryIcons"
                :key="icon"
                type="button"
                class="p-2 rounded-lg border transition-all flex items-center justify-center"
                :class="editState.icon === icon
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'"
                @click="editState.icon = editState.icon === icon ? '' : icon"
              >
                <UIcon
                  :name="icon"
                  class="w-5 h-5"
                />
              </button>
            </div>
          </UFormField>

          <UFormField :label="$t('categories.color')">
            <div class="flex flex-wrap gap-2 justify-center">
              <button
                v-for="color in presetColors"
                :key="color"
                type="button"
                class="w-7 h-7 rounded-full border-2 transition-all"
                :class="editState.color === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'"
                :style="{ backgroundColor: color }"
                @click="editState.color = color"
              />
            </div>
          </UFormField>

          <div class="flex gap-2 pt-4">
            <UButton
              :loading="editLoading"
              class="flex-1"
              @click="saveEdit"
            >
              {{ $t('common.save') }}
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              @click="editModalOpen = false"
            >
              {{ $t('common.cancel') }}
            </UButton>
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
