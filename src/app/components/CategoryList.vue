<script setup lang="ts">
import { getErrorMessage } from '~/types/error'
import type { CategoryResponse } from '~/types/api'

// Dynamic import to avoid SSR issues with vuedraggable
const draggable = defineAsyncComponent(() => import('vuedraggable'))

interface Category {
  id: string
  name: string
  color?: string | null
  icon?: string | null
}

const { t } = useI18n()
const toast = useToast()

const { data: categories, refresh } = await useFetch<CategoryResponse[]>('/api/v1/categories')

// Local copy for drag & drop
const localCategories = ref<CategoryResponse[]>([])
watch(() => categories.value, (newCategories) => {
  localCategories.value = newCategories ? [...newCategories] : []
}, { immediate: true })

async function onReorder() {
  const ids = localCategories.value.map(c => c.id)
  try {
    await $fetch('/api/v1/categories/reorder', {
      method: 'PUT',
      body: { ids }
    })
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(error),
      color: 'error'
    })
    await refresh()
  }
}

const editModalOpen = ref(false)
const editingCategory = ref<Category | null>(null)
const editState = reactive({
  name: '',
  color: '#3b82f6',
  icon: ''
})
const editLoading = ref(false)

const { categoryIcons } = useIcons()
const { presetColors } = useColors()

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
    await $fetch(`/api/v1/categories/${id}` as '/api/v1/categories/:id', { method: 'DELETE' })
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
    v-if="!localCategories.length"
    class="text-center py-8 text-gray-500"
  >
    {{ $t('categories.noCategory') }}
  </div>

  <draggable
    v-else
    v-model="localCategories"
    item-key="id"
    handle=".drag-handle"
    ghost-class="opacity-50"
    class="divide-y divide-gray-200 dark:divide-gray-800"
    @end="onReorder"
  >
    <template #item="{ element: category }">
      <div class="flex items-center justify-between py-3">
        <div class="flex items-center gap-3">
          <UIcon
            name="i-lucide-grip-vertical"
            class="drag-handle w-4 h-4 text-gray-400 cursor-grab active:cursor-grabbing"
          />
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
    </template>
  </draggable>

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
