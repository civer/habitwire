<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { getErrorMessage } from '~/types/error'

const emit = defineEmits<{
  created: []
}>()

const { t } = useI18n()
const toast = useToast()

const open = ref(false)
const loading = ref(false)

const schema = z.object({
  name: z.string().min(1, t('validation.required', { field: t('categories.name') })),
  color: z.string().optional(),
  icon: z.string().optional()
})

type Schema = z.output<typeof schema>

const state = reactive({
  name: '',
  color: '#3b82f6',
  icon: ''
})

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
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#6b7280' // gray
]

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await $fetch('/api/v1/categories', {
      method: 'POST',
      body: {
        name: event.data.name,
        color: event.data.color || null,
        icon: event.data.icon || null
      }
    })
    toast.add({
      title: t('categories.create'),
      description: t('categories.categoryCreated'),
      color: 'success'
    })
    open.value = false
    state.name = ''
    state.icon = ''
    state.color = '#3b82f6'
    emit('created')
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(error),
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <UButton
      icon="i-lucide-plus"
      :label="$t('categories.create')"
      @click="open = true"
    />

    <template #content>
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">
            {{ $t('categories.create') }}
          </h3>
        </template>

        <UForm
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
          <UFormField
            :label="$t('categories.name')"
            name="name"
            required
          >
            <UInput
              v-model="state.name"
              :placeholder="$t('categories.name')"
              class="w-full"
              autofocus
            />
          </UFormField>

          <UFormField
            :label="$t('habits.icon')"
            name="icon"
          >
            <div class="flex flex-wrap gap-2 justify-center">
              <button
                v-for="icon in categoryIcons"
                :key="icon"
                type="button"
                class="p-2 rounded-lg border transition-all flex items-center justify-center"
                :class="state.icon === icon
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'"
                @click="state.icon = state.icon === icon ? '' : icon"
              >
                <UIcon
                  :name="icon"
                  class="w-5 h-5"
                />
              </button>
            </div>
          </UFormField>

          <UFormField
            :label="$t('categories.color')"
            name="color"
          >
            <div class="flex flex-wrap gap-2 justify-center">
              <button
                v-for="color in presetColors"
                :key="color"
                type="button"
                class="w-7 h-7 rounded-full border-2 transition-all"
                :class="state.color === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'"
                :style="{ backgroundColor: color }"
                @click="state.color = color"
              />
            </div>
          </UFormField>

          <div class="flex gap-2 pt-4">
            <UButton
              type="submit"
              :loading="loading"
              class="flex-1"
            >
              {{ $t('common.save') }}
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              @click="open = false"
            >
              {{ $t('common.cancel') }}
            </UButton>
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>
</template>
