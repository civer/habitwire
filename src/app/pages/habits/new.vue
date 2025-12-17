<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { getErrorMessage } from '~/types/error'
import type { CategoryResponse, UserResponse } from '~/types/api'
import { useHabitSchema, type HabitFormSchema } from '~/composables/useHabitSchema'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()

const { data: categories } = await useFetch<CategoryResponse[]>('/api/v1/categories')
const { data: userData } = await useFetch<UserResponse>('/api/v1/auth/me')
const enableNotes = computed(() => userData.value?.user?.settings?.enableNotes ?? false)

const { schema, weekdays } = useHabitSchema(t)
type Schema = HabitFormSchema

const state = reactive({
  title: '',
  description: '',
  habit_selection: 'SIMPLE' as 'SIMPLE' | 'WITH_NOTE' | 'TARGET',
  habit_type: 'SIMPLE' as 'SIMPLE' | 'TARGET',
  frequency_type: 'DAILY' as 'DAILY' | 'WEEKLY' | 'CUSTOM',
  frequency_value: 1,
  active_days: [1, 2, 3, 4, 5] as number[],
  target_value: null as number | null,
  default_increment: null as number | null,
  unit: '',
  category_id: undefined as string | undefined,
  icon: 'i-lucide-target',
  color: ''
})

// Keep habit_type in sync with habit_selection for schema validation
watch(() => state.habit_selection, (selection) => {
  state.habit_type = selection === 'TARGET' ? 'TARGET' : 'SIMPLE'
})

const { habitIcons } = useIcons()
const { presetColors } = useColors()

const loading = ref(false)
const formRef = ref()

// Clear form errors when frequency type changes
watch(() => state.frequency_type, () => {
  formRef.value?.clear()
})

const isTargetHabit = computed(() => state.habit_selection === 'TARGET')

const habitTypeItems = computed(() => {
  if (enableNotes.value) {
    return [
      { label: t('habits.habitTypeSimple'), value: 'SIMPLE', icon: 'i-lucide-check-circle' },
      { label: t('habits.habitTypeWithNote'), value: 'WITH_NOTE', icon: 'i-lucide-message-square' },
      { label: t('habits.habitTypeTarget'), value: 'TARGET', icon: 'i-lucide-target' }
    ]
  }
  return [
    { label: t('habits.habitTypeSimple'), value: 'SIMPLE', icon: 'i-lucide-check-circle' },
    { label: t('habits.habitTypeTarget'), value: 'TARGET', icon: 'i-lucide-target' }
  ]
})

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
    // Map selection to actual habit_type and prompt_for_notes
    const habitType = state.habit_selection === 'TARGET' ? 'TARGET' : 'SIMPLE'
    const promptForNotes = state.habit_selection === 'WITH_NOTE'

    const body = {
      ...event.data,
      habit_type: habitType,
      category_id: event.data.category_id || null,
      target_value: isTargetHabit.value ? state.target_value : null,
      default_increment: isTargetHabit.value ? state.default_increment : null,
      unit: isTargetHabit.value ? (event.data.unit || null) : null,
      active_days: state.frequency_type === 'WEEKLY' ? state.active_days : null,
      frequency_value: state.frequency_type === 'CUSTOM' ? state.frequency_value : 1,
      icon: event.data.icon || null,
      color: event.data.color || null,
      prompt_for_notes: promptForNotes
    }
    await $fetch('/api/v1/habits', {
      method: 'POST',
      body
    })
    toast.add({
      title: t('habits.create'),
      description: t('habits.habitCreated'),
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
          {{ $t('habits.create') }}
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
            v-model="state.habit_selection"
            :items="habitTypeItems"
            orientation="horizontal"
            variant="card"
            :ui="{ fieldset: 'w-full flex', item: 'flex-1' }"
          />
          <!-- Target value fields - inline below habit type -->
          <div
            v-if="isTargetHabit"
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
