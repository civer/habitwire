<script setup lang="ts">
import { getErrorMessage } from '~/types/error'

interface Props {
  open: boolean
  habitId: string
  habitTitle: string
  habitIcon?: string | null
  habitColor?: string | null
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
const notes = ref('')

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value)
})

const formattedDate = computed(() => {
  return new Date(props.date).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  })
})

// Reset notes when modal opens
watch(isOpen, (open) => {
  if (open) {
    notes.value = ''
  }
})

async function checkWithNote() {
  loading.value = true
  try {
    await $fetch(`/api/v1/habits/${props.habitId}/check`, {
      method: 'POST',
      body: {
        date: props.date,
        notes: notes.value.trim() || null
      }
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

async function checkWithoutNote() {
  loading.value = true
  try {
    await $fetch(`/api/v1/habits/${props.habitId}/check`, {
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
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <div
              v-if="habitIcon"
              class="w-10 h-10 rounded-lg flex items-center justify-center"
              :style="{
                backgroundColor: habitColor ? habitColor + '20' : '#6b728020',
                color: habitColor || '#6b7280'
              }"
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
          <!-- Notes textarea -->
          <div>
            <label class="block text-sm font-medium mb-1.5">
              {{ $t('checkin.addNote') }}
            </label>
            <UTextarea
              v-model="notes"
              :placeholder="$t('checkin.notePlaceholder')"
              :rows="3"
              class="w-full"
              autofocus
            />
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-2">
            <UButton
              :loading="loading"
              :disabled="!notes.trim()"
              color="primary"
              class="w-full"
              icon="i-lucide-check"
              @click="checkWithNote"
            >
              {{ $t('checkin.checkWithNote') }}
            </UButton>
            <UButton
              :loading="loading"
              color="neutral"
              variant="soft"
              class="w-full"
              @click="checkWithoutNote"
            >
              {{ $t('checkin.checkWithoutNote') }}
            </UButton>
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
