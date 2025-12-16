<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { getErrorMessage } from '~/types/error'
import type { HabitResponse, CategoryResponse } from '~/types/api'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const habitId = route.params.id as string

const { data: habit, error: habitError } = await useFetch<HabitResponse>(`/api/v1/habits/${habitId}`)
const { data: categories } = await useFetch<CategoryResponse[]>('/api/v1/categories')

if (habitError.value || !habit.value) {
  throw createError({
    statusCode: 404,
    message: t('errors.habitNotFound')
  })
}

const baseSchema = z.object({
  title: z.string().min(1, t('validation.required', { field: t('habits.habitTitle') })),
  description: z.string().optional(),
  habit_type: z.enum(['SIMPLE', 'TARGET']),
  frequency_type: z.enum(['DAILY', 'WEEKLY', 'CUSTOM']),
  frequency_value: z.coerce.number().optional(),
  active_days: z.array(z.number()).optional(),
  target_value: z.union([z.coerce.number().positive(), z.null(), z.literal('')]).optional(),
  default_increment: z.union([z.coerce.number().positive(), z.null(), z.literal('')]).optional(),
  unit: z.string().optional(),
  category_id: z.string().nullish(),
  icon: z.string().optional(),
  color: z.string().optional(),
  prompt_for_notes: z.boolean().optional()
})

const schema = baseSchema.superRefine((data, ctx) => {
  // WEEKLY requires at least one active day
  if (data.frequency_type === 'WEEKLY' && (!data.active_days || data.active_days.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: t('validation.selectAtLeastOneDay'),
      path: ['active_days']
    })
  }
  // CUSTOM requires frequency_value >= 1
  if (data.frequency_type === 'CUSTOM' && (!data.frequency_value || data.frequency_value < 1)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: t('validation.minValue', { min: 1 }),
      path: ['frequency_value']
    })
  }
})

type Schema = z.output<typeof schema>

const state = reactive({
  title: habit.value.title || '',
  description: habit.value.description || '',
  habit_type: (habit.value.habit_type || 'SIMPLE') as 'SIMPLE' | 'TARGET',
  frequency_type: (habit.value.frequency_type || 'DAILY') as 'DAILY' | 'WEEKLY' | 'CUSTOM',
  frequency_value: habit.value.frequency_value || 1,
  active_days: (habit.value.active_days as number[] | null) || [1, 2, 3, 4, 5],
  target_value: habit.value.target_value ?? null as number | null,
  default_increment: habit.value.default_increment ?? null as number | null,
  unit: habit.value.unit || '',
  category_id: habit.value.category_id || undefined,
  icon: habit.value.icon || 'i-lucide-target',
  color: habit.value.color || '',
  prompt_for_notes: habit.value.prompt_for_notes || false
})

const weekdays = computed(() => [
  { label: t('habits.weekdays.mon'), value: 1 },
  { label: t('habits.weekdays.tue'), value: 2 },
  { label: t('habits.weekdays.wed'), value: 3 },
  { label: t('habits.weekdays.thu'), value: 4 },
  { label: t('habits.weekdays.fri'), value: 5 },
  { label: t('habits.weekdays.sat'), value: 6 },
  { label: t('habits.weekdays.sun'), value: 0 }
])

const habitIcons = [
  'i-lucide-target',
  'i-lucide-dumbbell',
  'i-lucide-droplet',
  'i-lucide-book-open',
  'i-lucide-bed',
  'i-lucide-pill',
  'i-lucide-apple',
  'i-lucide-footprints',
  'i-lucide-brain',
  'i-lucide-heart',
  'i-lucide-sun',
  'i-lucide-moon',
  'i-lucide-coffee',
  'i-lucide-cigarette-off',
  'i-lucide-music',
  'i-lucide-pencil',
  'i-lucide-code',
  'i-lucide-flame',
  'i-lucide-leaf',
  'i-lucide-star',
  'i-lucide-zap',
  'i-lucide-trophy',
  'i-lucide-smile',
  'i-lucide-sparkles',
  'i-lucide-graduation-cap',
  'i-lucide-palette',
  'i-lucide-camera',
  'i-lucide-dollar-sign',
  'i-lucide-users',
  'i-lucide-home'
]

const presetColors = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#a855f7',
  '#d946ef', '#ec4899', '#6b7280'
]

const loading = ref(false)
const formRef = ref()

// Clear form errors when frequency type changes
watch(() => state.frequency_type, () => {
  formRef.value?.clear()
})

const habitTypeItems = computed(() => [
  { label: t('habits.habitTypeSimple'), value: 'SIMPLE', icon: 'i-lucide-check-circle' },
  { label: t('habits.habitTypeTarget'), value: 'TARGET', icon: 'i-lucide-target' }
])

const frequencyItems = computed(() => [
  { label: t('habits.frequencyDaily'), value: 'DAILY', icon: 'i-lucide-calendar-days' },
  { label: t('habits.frequencyWeekly'), value: 'WEEKLY', icon: 'i-lucide-calendar-range' },
  { label: t('habits.frequencyCustom'), value: 'CUSTOM', icon: 'i-lucide-settings-2' }
])

const categoryOptions = computed(() =>
  (categories.value || []).map(c => ({ label: c.name, value: c.id }))
)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    const body = {
      ...event.data,
      habit_type: state.habit_type,
      category_id: event.data.category_id || null,
      target_value: state.habit_type === 'TARGET' ? state.target_value : null,
      default_increment: state.habit_type === 'TARGET' ? state.default_increment : null,
      unit: state.habit_type === 'TARGET' ? (event.data.unit || null) : null,
      active_days: state.frequency_type === 'WEEKLY' ? state.active_days : null,
      frequency_value: state.frequency_type === 'CUSTOM' ? state.frequency_value : 1,
      icon: event.data.icon || null,
      color: event.data.color || null,
      prompt_for_notes: state.habit_type === 'SIMPLE' ? state.prompt_for_notes : false
    }
    await $fetch(`/api/v1/habits/${habitId}` as '/api/v1/habits/:id', {
      method: 'PUT',
      body
    })
    toast.add({
      title: t('habits.edit'),
      description: t('habits.habitUpdated'),
      color: 'success'
    })
    router.push('/')
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
  <div class="py-6 max-w-lg mx-auto">
    <div class="mb-6">
      <UButton
        to="/"
        variant="ghost"
        icon="i-lucide-arrow-left"
        :label="$t('common.cancel')"
        color="neutral"
      />
    </div>

    <UCard>
      <template #header>
        <h1 class="text-xl font-bold">
          {{ $t('habits.edit') }}
        </h1>
      </template>

      <UForm
        ref="formRef"
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          :label="$t('habits.habitTitle')"
          name="title"
          required
        >
          <UInput
            v-model="state.title"
            :placeholder="$t('habits.habitTitle')"
            class="w-full"
            autofocus
          />
        </UFormField>

        <UFormField
          :label="$t('habits.description')"
          name="description"
        >
          <UTextarea
            v-model="state.description"
            :placeholder="$t('habits.description')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('habits.habitType')"
          name="habit_type"
        >
          <URadioGroup
            v-model="state.habit_type"
            :items="habitTypeItems"
            orientation="horizontal"
            variant="card"
            :ui="{ fieldset: 'w-full flex', item: 'flex-1' }"
          />
          <!-- Target value fields - inline below habit type -->
          <div
            v-if="state.habit_type === 'TARGET'"
            class="flex gap-2 mt-3 items-end"
          >
            <div class="flex-1">
              <label class="block text-sm font-medium mb-1">{{ $t('habits.targetValue') }}</label>
              <UInput
                v-model.number="state.target_value"
                type="number"
                placeholder="2000"
              />
            </div>
            <div class="flex-1">
              <label class="block text-sm font-medium mb-1">{{ $t('habits.defaultIncrement') }}</label>
              <UInput
                v-model.number="state.default_increment"
                type="number"
                placeholder="250"
              />
            </div>
            <div class="w-24">
              <label class="block text-sm font-medium mb-1">{{ $t('habits.unit') }}</label>
              <UInput
                v-model="state.unit"
                placeholder="ml"
              />
            </div>
          </div>
        </UFormField>

        <UFormField
          :label="$t('habits.frequency')"
          name="frequency_type"
        >
          <URadioGroup
            v-model="state.frequency_type"
            :items="frequencyItems"
            orientation="horizontal"
            variant="card"
            :ui="{ fieldset: 'w-full flex', item: 'flex-1' }"
          />
        </UFormField>

        <!-- Weekly: Select active days -->
        <UFormField
          v-if="state.frequency_type === 'WEEKLY'"
          :label="$t('habits.activeDays')"
          name="active_days"
        >
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="day in weekdays"
              :key="day.value"
              :color="state.active_days.includes(day.value) ? 'primary' : 'neutral'"
              :variant="state.active_days.includes(day.value) ? 'solid' : 'outline'"
              size="sm"
              @click="state.active_days.includes(day.value)
                ? state.active_days = state.active_days.filter(d => d !== day.value)
                : state.active_days.push(day.value)"
            >
              {{ day.label }}
            </UButton>
          </div>
        </UFormField>

        <!-- Custom: Times per week -->
        <UFormField
          v-if="state.frequency_type === 'CUSTOM'"
          :label="$t('habits.timesPerWeek')"
          name="frequency_value"
        >
          <UInput
            v-model.number="state.frequency_value"
            type="number"
            min="1"
            max="7"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('habits.icon')"
          name="icon"
        >
          <div class="flex flex-wrap gap-2 justify-center">
            <button
              v-for="icon in habitIcons"
              :key="icon"
              type="button"
              class="p-2 rounded-lg border transition-all flex items-center justify-center"
              :class="state.icon === icon
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'"
              @click="state.icon = icon"
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
              @click="state.color = state.color === color ? '' : color"
            />
          </div>
        </UFormField>

        <UFormField
          v-if="categories?.length"
          :label="$t('categories.title')"
          name="category_id"
        >
          <div class="flex gap-2">
            <USelect
              v-model="state.category_id"
              :items="categoryOptions"
              :placeholder="$t('categories.noCategory')"
              class="flex-1"
            />
            <UButton
              v-if="state.category_id"
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              @click="state.category_id = undefined"
            />
          </div>
        </UFormField>

        <!-- Prompt for notes toggle (SIMPLE habits only) -->
        <UFormField
          v-if="state.habit_type === 'SIMPLE'"
          name="prompt_for_notes"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-sm">
                {{ $t('habits.promptForNotes') }}
              </p>
              <p class="text-sm text-gray-500">
                {{ $t('habits.promptForNotesDescription') }}
              </p>
            </div>
            <USwitch v-model="state.prompt_for_notes" />
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
            to="/"
            color="neutral"
            variant="outline"
          >
            {{ $t('common.cancel') }}
          </UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>
