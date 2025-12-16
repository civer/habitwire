<script setup lang="ts">
import { getErrorMessage } from '~/types/error'

interface Props {
  open: boolean
  habitId: string
  habitTitle: string
  habitIcon?: string | null
  habitUnit?: string | null
  targetValue: number
  defaultIncrement?: number | null
  currentValue: number
  date: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'checked': []
}>()

const { t } = useI18n()
const toast = useToast()

const loading = ref(false)
const inputValue = ref<number | null>(null)
const notes = ref('')

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value)
})

const progress = computed(() => {
  if (!props.targetValue) return 0
  return Math.min(100, (props.currentValue / props.targetValue) * 100)
})

const formattedDate = computed(() => {
  return new Date(props.date).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  })
})

async function addValue() {
  const valueToAdd = inputValue.value || props.defaultIncrement
  if (!valueToAdd || valueToAdd <= 0) return
  const newValue = props.currentValue + valueToAdd
  await check(newValue)
}

async function complete() {
  await check(props.targetValue)
}

async function skip() {
  loading.value = true
  try {
    await $fetch(`/api/v1/habits/${props.habitId}/skip`, {
      method: 'POST',
      body: { date: props.date }
    })
    emit('checked')
    isOpen.value = false
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

async function uncheck() {
  loading.value = true
  try {
    await $fetch(`/api/v1/habits/${props.habitId}/uncheck`, {
      method: 'POST',
      body: { date: props.date }
    })
    emit('checked')
    isOpen.value = false
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

async function check(value: number) {
  loading.value = true
  try {
    await $fetch(`/api/v1/habits/${props.habitId}/check`, {
      method: 'POST',
      body: {
        date: props.date,
        value,
        notes: notes.value.trim() || null
      }
    })
    inputValue.value = null
    notes.value = ''
    emit('checked')
    isOpen.value = false
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
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <div
              v-if="habitIcon"
              class="text-gray-500"
            >
              <UIcon
                :name="habitIcon"
                class="w-5 h-5"
              />
            </div>
            <div>
              <h3 class="font-semibold">
                {{ habitTitle }}
              </h3>
              <p class="text-sm text-gray-500">
                {{ formattedDate }}
              </p>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <!-- Current progress -->
          <div class="text-center">
            <div class="text-3xl font-bold">
              {{ currentValue }} / {{ targetValue }}
            </div>
            <p class="text-sm text-gray-500">
              {{ habitUnit || $t('habits.units') }}
            </p>
            <div class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
              <div
                class="h-full rounded-full transition-all"
                :class="currentValue >= targetValue ? 'bg-green-500' : 'bg-primary'"
                :style="{ width: `${progress}%` }"
              />
            </div>
          </div>

          <!-- Value input -->
          <div class="flex items-center gap-2">
            <UInput
              v-model.number="inputValue"
              type="number"
              :placeholder="defaultIncrement ? `+${defaultIncrement}` : $t('habits.enterValue')"
              class="flex-1"
              autofocus
              @keyup.enter="addValue"
            />
            <UButton
              :loading="loading"
              :disabled="(!inputValue || inputValue <= 0) && !defaultIncrement"
              color="primary"
              icon="i-lucide-plus"
              @click="addValue"
            >
              {{ $t('common.add') }}
            </UButton>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium mb-1.5">
              {{ $t('checkin.addNote') }}
            </label>
            <UTextarea
              v-model="notes"
              :placeholder="$t('checkin.notePlaceholder')"
              :rows="2"
            />
          </div>

          <!-- Quick actions -->
          <div class="flex gap-2">
            <UButton
              :loading="loading"
              :disabled="currentValue >= targetValue"
              color="success"
              variant="soft"
              class="flex-1"
              icon="i-lucide-check"
              @click="complete"
            >
              {{ $t('habits.complete') }}
            </UButton>
            <UButton
              :loading="loading"
              color="neutral"
              variant="soft"
              class="flex-1"
              icon="i-lucide-x"
              @click="skip"
            >
              {{ $t('habits.skip') }}
            </UButton>
          </div>

          <!-- Uncheck if has value -->
          <UButton
            v-if="currentValue > 0"
            :loading="loading"
            color="neutral"
            variant="ghost"
            class="w-full"
            icon="i-lucide-rotate-ccw"
            @click="uncheck"
          >
            {{ $t('habits.reset') }}
          </UButton>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
